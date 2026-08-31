export interface UserActivityLog {
  id: string;
  url: string;
  domain: string;
  title: string;
  timestamp: number;
  timeOfDay: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
}

export interface ActivityPattern {
  id: string;
  patternType: 'MULTI_TAB_SEQUENCE';
  domains: string[];
  timeOfDay: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | 'ANY';
  occurrenceCount: number;
  lastDetected: number;
  isIgnored: boolean;
}
