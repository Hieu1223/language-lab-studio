// Shared types for the application

export interface BasePageProps {
  className?: string;
}

export interface MonitorStats {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_rx: number;
  network_tx: number;
  uptime: number;
  active_connections: number;
  request_count: number;
  error_count: number;
  avg_response_time: number;
  timestamp: string;
}

export interface HistoryPoint {
  time: string;
  cpu: number;
  memory: number;
  network: number;
  requests: number;
  errors: number;
  responseTime: number;
}

export type Theme = 'light' | 'dark' | 'system';
export type Locale = 'vi' | 'en';

export interface AppSettings {
  theme: Theme;
  locale: Locale;
  ambientColor: string;
}
