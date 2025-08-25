import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'openai';
import fs from 'fs';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/community/vectorstores/pinecone';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);
  private openai: OpenAI;
  private pinecone: Pinecone;

  private readonly openaiKey: string;
  private readonly pineconeKey: string;
  private readonly pineconeIndex: string;
  private readonly pineconeHost: string;

  constructor(private readonly configService: ConfigService) {

    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    const pineconeKey = this.configService.get<string>('PINECONE_API_KEY');
    const pineconeIndex = this.configService.get<string>('PINECONE_INDEX');
    const pineconeHost = this.configService.get<string>('PINECONE_INDEX_HOST');


    // Check if environment variables are set
    if (openaiKey && pineconeKey && pineconeIndex && pineconeHost) {
      this.openai = new OpenAI({
        apiKey: openaiKey,
      });

      this.pinecone = new Pinecone({
        apiKey: pineconeKey,
      });

      this.openaiKey = openaiKey;
      this.pineconeKey = pineconeKey;
      this.pineconeIndex = pineconeIndex;
      // Ensure the host doesn't have trailing slashes to prevent double slash issues
      this.pineconeHost = pineconeHost.replace(/\/+$/, '');

      this.logger.log('✅ AI service initialized with OpenAI and Pinecone');
      this.logger.log(`📊 Configuration: index=${pineconeIndex}, host=${pineconeHost}`);
      
      // Test Pinecone connection asynchronously
      this.testPineconeConnection().catch(error => {
        this.logger.error('❌ Initial Pinecone connection test failed:', error);
      });
    } else {
      this.logger.warn('⚠️ Missing environment variables for OpenAI or Pinecone. Running in simple mode.');
      this.logger.warn(`🔍 Environment check: openaiKey=${!!openaiKey}, pineconeKey=${!!pineconeKey}, pineconeIndex=${!!pineconeIndex}, pineconeHost=${!!pineconeHost}`);
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
    // Check if AI services are available
    if (!this.openai || !this.pinecone || !this.pineconeIndex || !this.pineconeHost || !this.openaiKey) {
      throw new Error('AI services not properly initialized. Check environment variables.');
    }

    const raw = fs.readFileSync('apps/server/src/util/docs.json', 'utf-8');
    const docs = JSON.parse(raw) as {
      id: string;
      title: string;
      content: string;
    }[];

    const index = this.pinecone.Index(this.pineconeIndex, this.pineconeHost);

    const embeddings = new OpenAIEmbeddings({
      apiKey: this.openaiKey,
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

    // Validate that all required properties are set
    if (!this.pineconeIndex || !this.pineconeHost || !this.openaiKey) {
      this.logger.warn('Missing required AI service configuration');
      return this.getSimpleResponse(question);
    }

    try {
      // Use class properties instead of process.env
      this.logger.log(`🔍 Connecting to Pinecone index: ${this.pineconeIndex} at ${this.pineconeHost}`);
      
      const index = this.pinecone.Index(this.pineconeIndex, this.pineconeHost);

      const embeddings = new OpenAIEmbeddings({
        apiKey: this.openaiKey,
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
      
      // Log additional details for Pinecone errors
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('Pinecone')) {
        this.logger.error(`Pinecone configuration: index=${this.pineconeIndex}, host=${this.pineconeHost}`);
        this.logger.error(`Error details: ${error.message}`);
      }
      
      return this.getSimpleResponse(question);
    }
  }

  /**
   * 🔹 Test Pinecone connection
   */
  async testPineconeConnection(): Promise<boolean> {
    if (!this.pinecone || !this.pineconeIndex || !this.pineconeHost) {
      return false;
    }

    try {
      const index = this.pinecone.Index(this.pineconeIndex, this.pineconeHost);
      // Try to get index stats to test connection
      await index.describeIndexStats();
      this.logger.log('✅ Pinecone connection test successful');
      return true;
    } catch (error) {
      this.logger.error('❌ Pinecone connection test failed:', error);
      return false;
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
