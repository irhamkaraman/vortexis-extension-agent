import { TabNode, TabEdge, TabEntity, TabGraphQueryResponse } from '../../core/types/graph';

export class TabGraphManager {
  private nodes: Map<number, TabNode> = new Map();
  private edges: TabEdge[] = [];
  
  private readonly privacyBlocklist = [
    'bank', 'paypal', 'stripe', 'mail.google', 'outlook', 'appleid', 'login', 'password'
  ];

  public updateTabContext(tabId: number, url: string, title: string, entities: TabEntity[]): void {
    const domain = new URL(url).hostname;
    
    // Privacy check
    if (this.privacyBlocklist.some(blocked => domain.includes(blocked))) {
      return;
    }

    const node: TabNode = {
      tabId,
      url,
      title,
      domain,
      entities,
      lastUpdated: Date.now()
    };

    this.nodes.set(tabId, node);
    this.recalculateEdges();
  }

  public removeTab(tabId: number): void {
    this.nodes.delete(tabId);
    this.edges = this.edges.filter(e => e.sourceTabId !== tabId && e.targetTabId !== tabId);
  }

  private recalculateEdges(): void {
    this.edges = [];
    const tabs = Array.from(this.nodes.values());

    for (let i = 0; i < tabs.length; i++) {
      for (let j = i + 1; j < tabs.length; j++) {
        const t1 = tabs[i];
        const t2 = tabs[j];

        if (t1.domain === t2.domain) {
          this.edges.push({
            sourceTabId: t1.tabId,
            targetTabId: t2.tabId,
            relationship: 'SAME_DOMAIN',
            weight: 1,
            reason: `Keduanya berada di domain ${t1.domain}`
          });
        }

        let sharedEntities = 0;
        const t2Values = new Set(t2.entities.map(e => e.value.toLowerCase()));

        for (const e1 of t1.entities) {
          if (t2Values.has(e1.value.toLowerCase())) {
            sharedEntities++;
          }
        }

        if (sharedEntities > 0) {
          this.edges.push({
            sourceTabId: t1.tabId,
            targetTabId: t2.tabId,
            relationship: 'SIMILAR_ENTITIES',
            weight: sharedEntities * 2,
            reason: `Memiliki ${sharedEntities} entitas yang sama`
          });
        }
      }
    }
  }

  public queryAcrossTabs(query: string): TabGraphQueryResponse {
    const qLower = query.toLowerCase();
    
    const relevantTabs: TabNode[] = [];
    
    for (const node of this.nodes.values()) {
      let score = 0;
      if (node.title.toLowerCase().includes(qLower) || node.url.toLowerCase().includes(qLower)) {
        score += 10;
      }

      for (const ent of node.entities) {
        if (qLower.includes(ent.value.toLowerCase()) || ent.value.toLowerCase().includes(qLower)) {
          score += 20;
        }
      }

      // If the query is just asking for "bandingkan tab", return all tabs with entities
      if (qLower.includes('banding') || qLower.includes('compare') || qLower.includes('semua tab')) {
        score += 5; 
      }

      if (score > 0) {
        relevantTabs.push(node);
      }
    }

    const relevantTabIds = new Set(relevantTabs.map(t => t.tabId));
    const relevantEdges = this.edges.filter(e => relevantTabIds.has(e.sourceTabId) && relevantTabIds.has(e.targetTabId));

    let summary = '';
    if (relevantTabs.length === 0) {
      summary = 'Tidak ada tab yang relevan dengan kueri tersebut.';
    } else {
      summary = `Ditemukan ${relevantTabs.length} tab relevan. `;
      summary += relevantTabs.map(t => `[Tab ${t.tabId}] ${t.title} memiliki entitas: ` + t.entities.map(e => `${e.type}(${e.value})`).join(', ')).join('. ');
    }

    return {
      relevantTabs,
      edges: relevantEdges,
      summary
    };
  }
}
