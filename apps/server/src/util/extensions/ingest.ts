import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';

function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}

async function ingest() {
  const { PINECONE_API_KEY, PINECONE_INDEX, PINECONE_INDEX_HOST, OPENAI_API_KEY } = process.env;
  if (!PINECONE_API_KEY || !PINECONE_INDEX || !PINECONE_INDEX_HOST || !OPENAI_API_KEY) {
    throw new Error('❌ Missing environment variables');
  }

  const raw = fs.readFileSync(path.resolve('apps/server/src/util/docs.json'), 'utf-8');
  const docs = JSON.parse(raw) as { id: string; title: string; content: string }[];

  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pinecone.Index(PINECONE_INDEX, PINECONE_INDEX_HOST);

  const embeddings = new OpenAIEmbeddings({
    apiKey: OPENAI_API_KEY,
    modelName: 'text-embedding-ada-002',
  });

  const allTexts: string[] = [];
  const allIds: string[] = [];
  const allMetadatas: any[] = [];

  for (const doc of docs) {
    const chunks = chunkText(doc.content);
    chunks.forEach((chunk, i) => {
      const vectorId = `${doc.id}_chunk_${i}`; // 🔥 stable id
      allIds.push(vectorId);
      allTexts.push(chunk);
      allMetadatas.push({
        title: doc.title,
        originalId: doc.id,
        chunkIndex: i,
        content: chunk,
      });
    });
  }

  console.log(`📦 Total chunks: ${allTexts.length}`);

  console.log('🔄 Generating embeddings...');
  const vectors = await embeddings.embedDocuments(allTexts);

  const upsertData = vectors.map((values, i) => ({
    id: allIds[i],
    values,
    metadata: allMetadatas[i],
  }));

  console.log('🧹 Clearing index before ingest...');
  await index.deleteAll();

  console.log('📤 Upserting to Pinecone...');
  await index.upsert(upsertData);

  console.log('✅ Ingestion completed!');
}

ingest().catch(err => console.error('❌ Ingestion failed:', err));
