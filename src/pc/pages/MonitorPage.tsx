import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Cpu, HardDrive, Network, RefreshCw, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiCall } from '@/lib/api/client';
import type { MonitorStats, HistoryPoint } from '@/shared/types';

const MAX_HISTORY_POINTS = 60;

export default function MonitorPagePC() {
  const { t } = useTranslation('monitor');
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch monitor stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(fetchStats, 2000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // Task Manager-style graph component
  const TaskManagerGraph = ({ data, color, height = 150 }: { data: number[]; color: string; height?: number }) => {
    if (data.length < 2) return null;
    
    const max = 100;
    const min = 0;
    const range = max - min || 1;
    const width = 100;
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    const areaPoints = `0,${height} ${points} ${width},${height}`;

    return (
      <svg width="100%" height={height} className="overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <polygon
          points={areaPoints}
          fill={`url(#gradient-${color})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const StatCard = ({ title, value, icon: Icon, trend, color, unit = '' }: { 
    title: string; 
    value: string; 
    icon: React.ComponentType<{ className?: string }>; 
    trend?: number[];
    color: string;
    unit?: string;
  }) => (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`w-4 h-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}{unit}</div>
        {trend && trend.length > 1 && (
          <div className="mt-2 h-16">
            <TaskManagerGraph data={trend} color={color.replace('text-', '')} height={60} />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading && !stats) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Loading system metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in" data-testid="monitor-page">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            System Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time server performance metrics</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </header>

      {error && (
        <Card className="bg-destructive/10 border-destructive/50">
          <CardContent className="pt-6 flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Grid with Task Manager-style graphs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CPU Usage"
          value={stats ? `${stats.cpu_usage.toFixed(1)}` : '--'}
          icon={Cpu}
          trend={history.map(h => h.cpu)}
          color="text-blue-500"
          unit="%"
        />
        <StatCard
          title="Memory Usage"
          value={stats ? `${stats.memory_usage.toFixed(1)}` : '--'}
          icon={HardDrive}
          trend={history.map(h => h.memory)}
          color="text-green-500"
          unit="%"
        />
        <StatCard
          title="Network I/O"
          value={stats ? `${formatBytes(stats.network_rx + stats.network_tx)}/s` : '--'}
          icon={Network}
          trend={history.map(h => h.network)}
          color="text-purple-500"
        />
        <StatCard
          title="Uptime"
          value={stats ? formatDuration(stats.uptime) : '--'}
          icon={Clock}
          color="text-orange-500"
        />
      </div>

      {/* Large Task Manager-style Graph Area */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Real-time Performance Graph
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-500" />
                  CPU Usage
                </span>
                <span className="font-mono text-blue-500">{stats?.cpu_usage.toFixed(1)}%</span>
              </div>
              <div className="h-32 bg-muted/30 rounded-lg p-2">
                <TaskManagerGraph data={history.map(h => h.cpu)} color="#3b82f6" height={120} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-green-500" />
                  Memory Usage
                </span>
                <span className="font-mono text-green-500">{stats?.memory_usage.toFixed(1)}%</span>
              </div>
              <div className="h-32 bg-muted/30 rounded-lg p-2">
                <TaskManagerGraph data={history.map(h => h.memory)} color="#22c55e" height={120} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  Response Time
                </span>
                <span className="font-mono text-purple-500">{stats?.avg_response_time.toFixed(0)}ms</span>
              </div>
              <div className="h-32 bg-muted/30 rounded-lg p-2">
                <TaskManagerGraph data={history.map(h => h.responseTime)} color="#a855f7" height={120} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Request Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Requests</span>
              <Badge variant="default">{stats?.request_count ?? 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Error Count</span>
              <Badge variant={stats && stats.error_count > 0 ? 'destructive' : 'secondary'}>
                {stats?.error_count ?? 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Response Time</span>
              <Badge variant="outline">{stats ? `${stats.avg_response_time.toFixed(0)}ms` : '--'}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Connections</span>
              <Badge variant="default">{stats?.active_connections ?? 0}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Error Rate</span>
              <span className={`text-sm font-medium ${stats && stats.request_count > 0 && (stats.error_count / stats.request_count) > 0.01 ? 'text-destructive' : 'text-success'}`}>
                {stats && stats.request_count > 0 ? `${((stats.error_count / stats.request_count) * 100).toFixed(2)}%` : '0.00%'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">CPU</span>
              <span className="font-mono">{stats?.cpu_usage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Memory</span>
              <span className="font-mono">{stats?.memory_usage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Disk</span>
              <span className="font-mono">{stats ? `${stats.disk_usage.toFixed(1)}%` : '--'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
