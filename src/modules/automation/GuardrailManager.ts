export interface GuardrailCheckResult {
  robotsDisallowed: boolean;
  rateLimitExceeded: boolean;
  heuristicWarning: boolean;
  details: string;
}

export class GuardrailManager {
  private static readonly ROBOTS_CACHE_KEY = 'vortexis_robots_cache';
  private static readonly RATE_LIMIT_KEY = 'vortexis_rate_limit';
  private static readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly RATE_LIMIT_MAX = 60; // Max requests per minute
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private static bypassedDomains: Set<string> = new Set();

  public static bypassDomain(domain: string): void {
    this.bypassedDomains.add(domain);
  }

  public static async checkGuardrails(url: string, heuristicWarning: boolean = false): Promise<GuardrailCheckResult> {
    const domain = new URL(url).hostname;
    const path = new URL(url).pathname;

    if (this.bypassedDomains.has(domain)) {
      return { robotsDisallowed: false, rateLimitExceeded: false, heuristicWarning: false, details: '' };
    }

    const [robotsDisallowed, rateLimitExceeded] = await Promise.all([
      this.checkRobotsTxt(domain, path),
      this.checkAndIncrementRateLimit(domain)
    ]);

    let details = '';
    if (robotsDisallowed) details += '🤖 URL dilarang oleh robots.txt. ';
    if (rateLimitExceeded) details += '⏱️ Terlalu banyak permintaan (Rate Limit). ';
    if (heuristicWarning) details += '⚠️ Terdapat peringatan indikasi pelarangan bot pada halaman. ';

    return {
      robotsDisallowed,
      rateLimitExceeded,
      heuristicWarning,
      details: details.trim()
    };
  }

  private static async checkRobotsTxt(domain: string, path: string): Promise<boolean> {
    const cache = await this.getRobotsCache();
    const cachedData = cache[domain];
    const now = Date.now();

    if (cachedData && now - cachedData.timestamp < this.TTL_MS) {
      return this.isPathDisallowed(path, cachedData.rules);
    }

    // Fetch and parse
    try {
      const response = await fetch(`https://${domain}/robots.txt`);
      if (!response.ok) {
        // If no robots.txt, assume allowed
        await this.cacheRobotsRules(domain, []);
        return false;
      }
      
      const text = await response.text();
      const rules = this.parseRobotsTxt(text);
      await this.cacheRobotsRules(domain, rules);
      
      return this.isPathDisallowed(path, rules);
    } catch {
      // Network error, assume allowed but don't cache
      return false;
    }
  }

  private static parseRobotsTxt(text: string): string[] {
    const lines = text.split('\\n');
    let isTargetAgent = false;
    const disallowedPaths: string[] = [];

    for (const line of lines) {
      const cleaned = line.trim().toLowerCase();
      if (!cleaned || cleaned.startsWith('#')) continue;

      if (cleaned.startsWith('user-agent:')) {
        const agent = cleaned.split(':')[1].trim();
        isTargetAgent = agent === '*' || agent === 'vortexis';
      } else if (isTargetAgent && cleaned.startsWith('disallow:')) {
        const path = cleaned.split(':')[1].trim();
        if (path) disallowedPaths.push(path);
      } else if (isTargetAgent && cleaned.startsWith('allow:')) {
         // Complex allow/disallow logic omitted for brevity
      }
    }
    return disallowedPaths;
  }

  private static isPathDisallowed(path: string, disallowedPaths: string[]): boolean {
    if (disallowedPaths.includes('/')) return true;
    for (const disallowed of disallowedPaths) {
      if (path.startsWith(disallowed.replace('*', ''))) return true;
    }
    return false;
  }

  private static async getRobotsCache(): Promise<Record<string, { timestamp: number; rules: string[] }>> {
    const data = await chrome.storage.local.get(this.ROBOTS_CACHE_KEY);
    return (data[this.ROBOTS_CACHE_KEY] as Record<string, { timestamp: number; rules: string[] }>) || {};
  }

  private static async cacheRobotsRules(domain: string, rules: string[]): Promise<void> {
    const cache = await this.getRobotsCache();
    cache[domain] = { timestamp: Date.now(), rules };
    await chrome.storage.local.set({ [this.ROBOTS_CACHE_KEY]: cache });
  }

  private static async checkAndIncrementRateLimit(domain: string): Promise<boolean> {
    const data = await chrome.storage.local.get(this.RATE_LIMIT_KEY);
    const rateLimits = (data[this.RATE_LIMIT_KEY] as Record<string, number[]>) || {};
    
    const now = Date.now();
    const domainTimestamps: number[] = rateLimits[domain] || [];
    
    // Clean up old timestamps
    const recentTimestamps = domainTimestamps.filter(t => now - t < this.RATE_LIMIT_WINDOW);
    
    if (recentTimestamps.length >= this.RATE_LIMIT_MAX) {
      return true;
    }
    
    recentTimestamps.push(now);
    rateLimits[domain] = recentTimestamps;
    
    await chrome.storage.local.set({ [this.RATE_LIMIT_KEY]: rateLimits });
    return false;
  }
}
