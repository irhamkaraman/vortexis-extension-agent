export type EntityType = 'PRICE' | 'PRODUCT' | 'DATE' | 'PERSON' | 'COMPANY' | 'KEYWORD';

export interface TabEntity {
  type: EntityType;
  value: string;
  context: string;
}

export interface TabNode {
  tabId: number;
  url: string;
  title: string;
  domain: string;
  entities: TabEntity[];
  lastUpdated: number;
}

export interface TabEdge {
  sourceTabId: number;
  targetTabId: number;
  relationship: 'SAME_DOMAIN' | 'SIMILAR_ENTITIES' | 'OPENED_FROM';
  weight: number;
  reason: string;
}

export interface TabGraphQueryResponse {
  relevantTabs: TabNode[];
  edges: TabEdge[];
  summary: string;
}
