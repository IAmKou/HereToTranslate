import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'openai';
import fs from 'fs';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/community/vectorstores/pinecone';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);
  private openai: OpenAI;
  private pinecone: Pinecone;

  constructor() {
    const { OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX, PINECONE_INDEX_HOST } = process.env;

    // Check if environment variables are set
    if (OPENAI_API_KEY && PINECONE_API_KEY && PINECONE_INDEX && PINECONE_INDEX_HOST) {
      this.openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
      });

      this.pinecone = new Pinecone({
        apiKey: PINECONE_API_KEY,
      });

      this.logger.log('✅ AI service initialized with OpenAI and Pinecone');
    } else {
      this.logger.warn('⚠️ Missing environment variables for OpenAI or Pinecone. Running in simple mode.');
    }
  }

  /**
   * 🔹 Split text into overlapping chunks
   */
  private chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk);
      start += chunkSize - overlap;
    }
    return chunks;
  }

  /**
   * 🔹 Ingest docs.json into Pinecone with content in metadata
   */
  async ingestDocs(): Promise<{ totalChunks: number }> {
    const raw = fs.readFileSync('apps/server/src/util/docs.json', 'utf-8');
    const docs = JSON.parse(raw) as {
      id: string;
      title: string;
      content: string;
    }[];

    const indexName = process.env.PINECONE_INDEX!;
    const indexHost = process.env.PINECONE_INDEX_HOST!;
    const openaiKey = process.env.OPENAI_API_KEY!;

    const index = this.pinecone.Index(indexName, indexHost);

    const embeddings = new OpenAIEmbeddings({
      apiKey: openaiKey,
      modelName: 'text-embedding-ada-002',
    });

    this.logger.log('📦 Preparing chunks...');
    const allTexts: string[] = [];
    const allMetadatas: any[] = [];

    for (const doc of docs) {
      const chunks = this.chunkText(doc.content, 1000, 200);
      chunks.forEach((chunk, i) => {
        allTexts.push(chunk);
        allMetadatas.push({
          id: `${doc.id}_chunk_${i}`,
          title: doc.title,
          originalId: doc.id,
          chunkIndex: i,
          content: chunk, // 🔥 store actual chunk text
        });
      });
    }

    this.logger.log(`📦 Total chunks: ${allTexts.length}`);
    this.logger.log('📦 Upserting chunks to Pinecone...');

    await PineconeStore.fromTexts(allTexts, allMetadatas, embeddings, {
      pineconeIndex: index,
    });

    this.logger.log('✅ Ingest done!');
    return { totalChunks: allTexts.length };
  }

  /**
   * 🔹 Ask GPT with context retrieved from Pinecone
   */
  async ask(question: string): Promise<string> {
    // Check if AI services are available
    if (!this.openai || !this.pinecone) {
      return this.getSimpleResponse(question);
    }

    try {
      const indexName = process.env.PINECONE_INDEX!;
      const indexHost = process.env.PINECONE_INDEX_HOST!;
      const openaiKey = process.env.OPENAI_API_KEY!;

      const index = this.pinecone.Index(indexName, indexHost);

      const embeddings = new OpenAIEmbeddings({
        apiKey: openaiKey,
        modelName: 'text-embedding-ada-002',
      });
      const queryEmbedding = await embeddings.embedQuery(question);

      const queryResponse = await index.query({
        vector: queryEmbedding,
        topK: 5,
        includeMetadata: true,
      });

      const context = queryResponse.matches
        .map((match: any) => match.metadata?.content)
        .filter((c: string | undefined) => !!c)
        .join('\n\n');

      this.logger.log(`🔍 Retrieved ${queryResponse.matches.length} context chunks`);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Use the context to answer.',
          },
          {
            role: 'assistant',
            content: `Context:\n${context}`,
          },
          {
            role: 'user',
            content: question,
          },
        ],
      });

      return completion.choices[0].message.content ?? '';
    } catch (error) {
      this.logger.error('Error in AI service:', error);
      return this.getSimpleResponse(question);
    }
  }

  /**
   * 🔹 Simple response when AI services are not available
   */
  private getSimpleResponse(question: string): string {
    const responses = [
      `I received your message: "${question}". I'm currently running in simple mode. To enable full AI capabilities, please set up your OpenAI and Pinecone environment variables.`,
      `Thanks for your message: "${question}". I'm here to help, but I'm currently in basic mode. For enhanced AI responses, configure your API keys.`,
      `Hello! I got your message: "${question}". I'm working in simple mode right now. Set up your AI environment variables for better responses.`,
      `I understand you said: "${question}". Currently running in basic mode. Configure OpenAI and Pinecone for advanced AI features.`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }
}
