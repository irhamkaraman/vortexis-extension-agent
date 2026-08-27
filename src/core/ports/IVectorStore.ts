import { RAGDocument, RAGSearchResult } from '../types/rag';

export interface IVectorStore {
  ingestDocument(doc: { url: string; title: string; text: string }): Promise<RAGDocument>;
  query(queryText: string, topK?: number): Promise<RAGSearchResult[]>;
  clear(): Promise<void>;
  getDocumentsCount(): number;
}
