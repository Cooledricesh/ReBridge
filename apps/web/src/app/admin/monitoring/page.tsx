'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Database } from 'lucide-react';

interface CrawlStatus {
  recentCrawls: Array<{
    id: string;
    source: string;
    status: string;
    jobs_found: number;
    jobs_new: number;
    jobs_updated: number;
    error_message?: string;
    started_at: string;
    completed_at?: string;
  }>;
  statistics: {
    successRates: Record<string, number>;
    avgCrawlTimes: Record<string, number>;
    jobCounts: Record<string, number>;
  };
  alerts: Array<{
    source: string;
    type: string;
    message: string;
  }>;
  sources: string[];
}

export default function MonitoringPage() {
  const [status, setStatus] = useState<CrawlStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/crawl-status');
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error || 'Failed to load data'}</p>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    return `${(seconds / 60).toFixed(1)}m`;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'running':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">크롤러 모니터링 대시보드</h1>

      {/* Alerts */}
      {status.alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {status.alerts.map((alert, index) => (
            <div
              key={index}
              className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3"
            >
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <span className="font-medium text-red-800">{alert.source}:</span>
                <span className="text-red-700 ml-2">{alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Source Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {status.sources.map((source) => (
          <Card key={source}>
            <CardHeader>
              <CardTitle className="text-lg">{source}</CardTitle>
              <CardDescription>지난 24시간 통계</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">성공률</span>
                  <span className="font-medium">
                    {status.statistics.successRates[source]?.toFixed(1) || '0'}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">평균 시간</span>
                  <span className="font-medium">
                    {status.statistics.avgCrawlTimes[source]
                      ? formatDuration(status.statistics.avgCrawlTimes[source])
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">총 공고수</span>
                  <span className="font-medium">
                    {status.statistics.jobCounts[source]?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Crawls */}
      <Card>
        <CardHeader>
          <CardTitle>최근 크롤링 기록</CardTitle>
          <CardDescription>최근 50건의 크롤링 작업 내역</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">소스</th>
                  <th className="text-left p-2">상태</th>
                  <th className="text-left p-2">발견</th>
                  <th className="text-left p-2">신규</th>
                  <th className="text-left p-2">수정</th>
                  <th className="text-left p-2">시작 시간</th>
                  <th className="text-left p-2">소요 시간</th>
                </tr>
              </thead>
              <tbody>
                {status.recentCrawls.map((crawl) => {
                  const duration = crawl.completed_at
                    ? (new Date(crawl.completed_at).getTime() -
                        new Date(crawl.started_at).getTime()) /
                      1000
                    : null;

                  return (
                    <tr key={crawl.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{crawl.source}</td>
                      <td className="p-2">
                        <Badge variant={getStatusBadgeVariant(crawl.status)}>
                          {crawl.status}
                        </Badge>
                      </td>
                      <td className="p-2">{crawl.jobs_found}</td>
                      <td className="p-2 text-green-600">+{crawl.jobs_new}</td>
                      <td className="p-2 text-blue-600">~{crawl.jobs_updated}</td>
                      <td className="p-2 text-gray-600">
                        {new Date(crawl.started_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="p-2">
                        {duration ? formatDuration(duration) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}