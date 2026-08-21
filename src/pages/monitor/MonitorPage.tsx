import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Cpu, HardDrive, RefreshCw, Server, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiCall } from '@/lib/api/client';
import type { components } from '@/lib/api/types.gen';

type ServerMonitorResponse = components['schemas']['ServerMonitorResponse'];

interface HistoryPoint {
  time: string;
  cpu: number;
  memory: number;
  processMemory: number;
}

const MAX_HISTORY_POINTS = 60;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function formatDuration(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds % 60}s`;
}

function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width="100%" height={height} className="overflow-visible" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MonitorPage() {
  const { t } = useTranslation('monitor');
  const [stats, setStats] = useState<ServerMonitorResponse | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCall<ServerMonitorResponse>('/monitor/');
      setStats(data);
      setHistory((previous) => [
        ...previous,
        {
          time: new Date(data.timestamp * 1000).toLocaleTimeString(),
          cpu: data.cpu.percent,
          memory: data.memory.percent,
          processMemory: data.process.memory_rss_bytes,
        },
      ].slice(-MAX_HISTORY_POINTS));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchStats();
    const interval = window.setInterval(() => void fetchStats(), 5000);
    return () => window.clearInterval(interval);
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const cpu = stats?.cpu.percent ?? 0;
  const memory = stats?.memory.percent ?? 0;
  const processMemory = stats?.process.memory_rss_bytes ?? 0;

  return (
    <div className="space-y-6 p-4 md:p-6" data-testid="monitor-page">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold md:text-3xl">
            <Activity className="h-6 w-6 text-primary" />
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchStats()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </header>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('cpu')}</CardTitle>
            <Cpu className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? `${cpu.toFixed(1)}%` : '--'}</div>
            {stats && <Sparkline data={history.map((point) => point.cpu)} color="hsl(var(--primary))" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('memory')}</CardTitle>
            <HardDrive className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? `${memory.toFixed(1)}%` : '--'}</div>
            <p className="mt-1 text-xs text-muted-foreground">{formatBytes(stats?.memory.used_bytes ?? 0)} / {formatBytes(stats?.memory.total_bytes ?? 0)}</p>
            {stats && <Sparkline data={history.map((point) => point.memory)} color="#22c55e" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('processMemory')}</CardTitle>
            <Server className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(processMemory)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{stats?.process.threads ?? 0} {t('threads')}</p>
            {stats && <Sparkline data={history.map((point) => point.processMemory)} color="#a855f7" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('uptime')}</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats?.process.uptime_seconds ?? 0)}</div>
            <Badge variant="secondary" className="mt-2">{stats?.process.name ?? '--'}</Badge>
          </CardContent>
        </Card>
      </div>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Server className="h-5 w-5" />
              {stats.hostname}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><span className="text-muted-foreground">{t('platform')}</span><p className="font-medium">{stats.platform}</p></div>
            <div><span className="text-muted-foreground">{t('cores')}</span><p className="font-medium">{stats.cpu.cores_logical} logical / {stats.cpu.cores_physical} physical</p></div>
            <div><span className="text-muted-foreground">{t('process')}</span><p className="font-medium">{stats.process.name} (PID {stats.process.pid})</p></div>
            <div><span className="text-muted-foreground">{t('lastUpdated')}</span><p className="font-medium">{new Date(stats.timestamp * 1000).toLocaleTimeString()}</p></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">{t('realTimeMetrics')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {history.slice(-20).reverse().map((point) => (
            <div key={point.time} className="grid grid-cols-[4.5rem_1fr_1fr] items-center gap-3 text-xs">
              <span className="font-mono text-muted-foreground">{point.time}</span>
              <span>CPU {point.cpu.toFixed(0)}%</span>
              <span>{t('memoryShort')} {point.memory.toFixed(0)}%</span>
            </div>
          ))}
          {history.length === 0 && <p className="text-sm text-muted-foreground">{t('noHistory')}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
