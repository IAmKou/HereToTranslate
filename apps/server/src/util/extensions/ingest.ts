import 'dotenv/config';
import fs from 'fs';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/community/vectorstores/pinecone';

/**
 * Utility: split text into chunks
 */
function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    start += chunkSize - overlap; // overlap for context
  }
  return chunks;
}

async function ingest() {
  const raw = fs.readFileSync('apps/server/src/util/docs.json', 'utf-8');
  const docs = JSON.parse(raw) as {
    id: string;
    title: string;
    content: string;
  }[];
  if (
    process.env.PINECONE_API_KEY === undefined ||
    process.env.PINECONE_INDEX === undefined ||
    process.env.PINECONE_INDEX_HOST === undefined ||
    process.env.OPENAI_API_KEY === undefined
  ) {
    console.log('env not found');
  }
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  const index = pinecone.Index(
    process.env.PINECONE_INDEX,
    process.env.PINECONE_INDEX_HOST
  );

  const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
    modelName: 'text-embedding-ada-002',
  });

  console.log('📦 Preparing chunks...');
  const allTexts: string[] = [];
  const allMetadatas: any[] = [];

  for (const doc of docs) {
    const chunks = chunkText(doc.content, 1000, 200); // tune size/overlap
    chunks.forEach((chunk, i) => {
      allTexts.push(chunk);
      allMetadatas.push({
        id: `${doc.id}_chunk_${i}`,
        title: doc.title,
        originalId: doc.id,
        chunkIndex: i,
      });
    });
  }

  console.log(`📦 Total chunks: ${allTexts.length}`);

  console.log('📦 Upserting chunks to Pinecone...');
  await PineconeStore.fromTexts(allTexts, allMetadatas, embeddings, {
    pineconeIndex: index,
  });
  console.log('✅ Done!');
}

ingest().catch(console.error);
