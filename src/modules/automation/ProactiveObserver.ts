import { UserActivityLog, ActivityPattern } from '../../core/types/pattern';
import { IPCMessage } from '../../core/types/messages';

export class ProactiveObserver {
  private static readonly LOG_KEY = 'vortexis_activity_logs';
  private static readonly PATTERN_KEY = 'vortexis_activity_patterns';
  
  private static readonly PRIVACY_BLOCKLIST = [
    'bank', 'paypal', 'stripe', 'mail.google', 'outlook', 'appleid', 'login', 'password', 'oauth'
  ];

  // Configs
  private static readonly MAX_LOG_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
  private static readonly SEQUENCE_THRESHOLD = 3; // Occurrences needed
  private static readonly TIME_GROUP_MINUTES = 15; // Max minutes between tab openings to be considered a sequence

  public static async init(): Promise<void> {
    await this.cleanupOldLogs();

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.logActivity(tab.url, tab.title || '');
      }
    });

    // Run pattern detection periodically
    chrome.alarms.create('vortexis_pattern_detect', { periodInMinutes: 30 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'vortexis_pattern_detect') {
        this.detectPatterns();
      }
    });
  }

  private static getTimeOfDay(date: Date): 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' {
    const hours = date.getHours();
    if (hours >= 5 && hours < 12) return 'MORNING';
    if (hours >= 12 && hours < 17) return 'AFTERNOON';
    if (hours >= 17 && hours < 21) return 'EVENING';
    return 'NIGHT';
  }

  private static async logActivity(url: string, title: string): Promise<void> {
    if (!url.startsWith('http')) return;
    
    let domain = '';
    try {
      domain = new URL(url).hostname;
    } catch {
      return;
    }

    if (this.PRIVACY_BLOCKLIST.some(d => domain.includes(d))) return;

    const log: UserActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      url,
      domain,
      title,
      timestamp: Date.now(),
      timeOfDay: this.getTimeOfDay(new Date())
    };

    const logs = await this.getLogs();
    logs.push(log);
    
    // Save locally
    await chrome.storage.local.set({ [this.LOG_KEY]: logs });

    // Instantly check for patterns every time we log (or debounce it in a real-world scenario)
    await this.detectPatterns();
  }

  private static async getLogs(): Promise<UserActivityLog[]> {
    const data = await chrome.storage.local.get(this.LOG_KEY);
    return (data[this.LOG_KEY] as UserActivityLog[]) || [];
  }

  private static async getPatterns(): Promise<ActivityPattern[]> {
    const data = await chrome.storage.local.get(this.PATTERN_KEY);
    return (data[this.PATTERN_KEY] as ActivityPattern[]) || [];
  }

  private static async cleanupOldLogs(): Promise<void> {
    const logs = await this.getLogs();
    const now = Date.now();
    const filtered = logs.filter(l => now - l.timestamp < this.MAX_LOG_AGE_MS);
    await chrome.storage.local.set({ [this.LOG_KEY]: filtered });
  }

  public static async detectPatterns(): Promise<void> {
    const logs = await this.getLogs();
    if (logs.length < 5) return; // Not enough data

    // Group logs into sequences. A sequence is a list of domains visited within 15 minutes of each other
    const sequences: { timeOfDay: string; domains: string[] }[] = [];
    let currentSequence: UserActivityLog[] = [logs[0]];

    for (let i = 1; i < logs.length; i++) {
      const log = logs[i];
      const prevLog = logs[i - 1];
      
      const diffMinutes = (log.timestamp - prevLog.timestamp) / (1000 * 60);
      
      if (diffMinutes <= this.TIME_GROUP_MINUTES) {
        currentSequence.push(log);
      } else {
        if (currentSequence.length >= 2) { // Minimal 2 sites sequence
          sequences.push({
            timeOfDay: currentSequence[0].timeOfDay,
            domains: Array.from(new Set(currentSequence.map(l => l.domain)))
          });
        }
        currentSequence = [log];
      }
    }
    
    // Catch the last sequence
    if (currentSequence.length >= 2) {
      sequences.push({
        timeOfDay: currentSequence[0].timeOfDay,
        domains: Array.from(new Set(currentSequence.map(l => l.domain)))
      });
    }

    // Find repeating sequence combinations
    const sequenceCounts: Record<string, number> = {};
    for (const seq of sequences) {
      if (seq.domains.length < 2) continue; // Ignore single domain visits
      const key = `${seq.timeOfDay}::${seq.domains.join(',')}`;
      sequenceCounts[key] = (sequenceCounts[key] || 0) + 1;
    }

    const existingPatterns = await this.getPatterns();

    let newPatternDetected = false;

    for (const [key, count] of Object.entries(sequenceCounts)) {
      if (count >= this.SEQUENCE_THRESHOLD) {
        const [timeOfDay, domainsStr] = key.split('::');
        const domains = domainsStr.split(',');

        const existing = existingPatterns.find(p => p.domains.join(',') === domainsStr && p.timeOfDay === timeOfDay);
        
        if (existing) {
          existing.occurrenceCount = count;
          existing.lastDetected = Date.now();
        } else {
          existingPatterns.push({
            id: `pattern-${Date.now()}`,
            patternType: 'MULTI_TAB_SEQUENCE',
            domains,
            timeOfDay: timeOfDay as any,
            occurrenceCount: count,
            lastDetected: Date.now(),
            isIgnored: false
          });
          newPatternDetected = true;
        }
      }
    }

    await chrome.storage.local.set({ [this.PATTERN_KEY]: existingPatterns });

    // Trigger Notification for new, non-ignored patterns
    if (newPatternDetected) {
      const activePattern = existingPatterns.find(p => !p.isIgnored && p.occurrenceCount >= this.SEQUENCE_THRESHOLD);
      if (activePattern) {
        this.notifyUser(activePattern);
      }
    }
  }

  private static async notifyUser(pattern: ActivityPattern): Promise<void> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) return;

    const message: IPCMessage = {
      type: 'SHOW_PROACTIVE_TOAST',
      payload: { pattern }
    };
    
    chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {});
  }

  public static async ignorePattern(patternId: string): Promise<void> {
    const patterns = await this.getPatterns();
    const target = patterns.find(p => p.id === patternId);
    if (target) {
      target.isIgnored = true;
      await chrome.storage.local.set({ [this.PATTERN_KEY]: patterns });
    }
  }

  public static async clearData(): Promise<void> {
    await chrome.storage.local.remove([this.LOG_KEY, this.PATTERN_KEY]);
  }
}
