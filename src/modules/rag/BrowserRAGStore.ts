import { IVectorStore } from '../../core/ports/IVectorStore';
import { RAGChunk, RAGDocument, RAGSearchResult } from '../../core/types/rag';
import { TextSplitter } from './TextSplitter';

export class BrowserRAGStore implements IVectorStore {
  private documents: Map<string, RAGDocument> = new Map();
  private allChunks: RAGChunk[] = [];

  public async ingestDocument(doc: { url: string; title: string; text: string }): Promise<RAGDocument> {
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const textChunks = TextSplitter.splitText(doc.text, { chunkSize: 500, chunkOverlap: 50 });

    const chunks: RAGChunk[] = textChunks.map((chunkText, index) => {
      const chunkId = `${docId}-chunk-${index}`;
      const vector = this.createTfIdfVector(chunkText);
      return {
        id: chunkId,
        documentId: docId,
        text: chunkText,
        index,
        tokenCount: chunkText.split(/\s+/).length,
        metadata: {
          url: doc.url,
          title: doc.title,
        },
        vector,
      };
    });

    const ragDoc: RAGDocument = {
      id: docId,
      url: doc.url,
      title: doc.title,
      timestamp: new Date().toISOString(),
      fullText: doc.text,
      chunks,
    };

    this.documents.set(docId, ragDoc);
    this.allChunks.push(...chunks);

    return ragDoc;
  }

  public async query(queryText: string, topK: number = 3): Promise<RAGSearchResult[]> {
    if (this.allChunks.length === 0) return [];

    const queryVector = this.createTfIdfVector(queryText);
    const scored: RAGSearchResult[] = this.allChunks.map((chunk) => {
      const score = this.cosineSimilarity(queryVector, chunk.vector || []);
      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  public async clear(): Promise<void> {
    this.documents.clear();
    this.allChunks = [];
  }

  public getDocumentsCount(): number {
    return this.documents.size;
  }

  public getTotalChunksCount(): number {
    return this.allChunks.length;
  }

  private createTfIdfVector(text: string): number[] {
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
    const freqMap: Record<string, number> = {};
    
    for (const w of words) {
      freqMap[w] = (freqMap[w] || 0) + 1;
    }

    // Simplified frequency hashing vector representation (fixed dimension = 64)
    const dim = 64;
    const vector = new Array(dim).fill(0);

    for (const [word, count] of Object.entries(freqMap)) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash << 5) - hash + word.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % dim;
      vector[index] += count;
    }

    // L2 Normalize
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? vector.map((v) => v / norm) : vector;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct;
  }
}
