import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Cpu, HardDrive, Network, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiCall } from '@/lib/api/client';
import type { MonitorStats, HistoryPoint } from '@/shared/types';

const MAX_HISTORY_POINTS = 30;

export default function MonitorPageMobile() {
  const { t } = useTranslation('monitor');
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = async () => {
    try {
      const data = await apiCall<MonitorStats>('/monitor/stats');
      setStats(data);
      
      setHistory(prev => {
        const newPoint: HistoryPoint = {
          time: new Date(data.timestamp).toLocaleTimeString(),
          cpu: data.cpu_usage,
          memory: data.memory_usage,
          network: (data.network_rx + data.network_tx) / 1024,
          requests: data.request_count,
          errors: data.error_count,
          responseTime: data.avg_response_time,
        };
        const updated = [...prev, newPoint];
        if (updated.length > MAX_HISTORY_POINTS) {
          return updated.slice(updated.length - MAX_HISTORY_POINTS);
        }
        return updated;
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch monitor stats:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(fetchStats, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const MiniGraph = ({ data, color }: { data: number[]; color: string }) => {
    if (data.length < 2) return null;
    const height = 40;
    const width = 100;
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (val / 100) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100%" height={height} className="overflow-visible">
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    );
  };

  if (loading && !stats) {
    return (
      <div className="h-screen flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3" data-testid="monitor-page-mobile">
      <header className="flex items-center justify-between">
        <h1 className="font-bold text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Monitor
        </h1>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Cpu className="w-3 h-3 text-blue-500" /> CPU
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats ? `${stats.cpu_usage.toFixed(1)}%` : '--'}</div>
            <MiniGraph data={history.map(h => h.cpu)} color="#3b82f6" />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-green-500" /> Memory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats ? `${stats.memory_usage.toFixed(1)}%` : '--'}</div>
            <MiniGraph data={history.map(h => h.memory)} color="#22c55e" />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Network className="w-3 h-3 text-purple-500" /> Network
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{stats ? `${formatBytes(stats.network_rx + stats.network_tx)}/s` : '--'}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-orange-500" /> Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="default">{stats?.request_count ?? 0}</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
