export interface RAGChunk {
  id: string;
  documentId: string;
  text: string;
  index: number;
  tokenCount: number;
  metadata: {
    url: string;
    title: string;
    section?: string;
  };
  vector?: number[];
}

export interface RAGDocument {
  id: string;
  url: string;
  title: string;
  timestamp: string;
  fullText: string;
  chunks: RAGChunk[];
}

export interface RAGSearchResult {
  chunk: RAGChunk;
  score: number;
}
