'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Heart, 
  MapPin, 
  Building2, 
  Briefcase, 
  Calendar, 
  Trash2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface SavedJob {
  id: string;
  job: {
    id: string;
    title: string;
    company: string | null;
    locationJson: any;
    salaryRange: any;
    employmentType: string | null;
    source: string;
    isDisabilityFriendly: boolean;
    crawledAt: Date | string;
    expiresAt: Date | string | null;
  };
  savedAt: Date | string;
}

export default function SavedJobsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchSavedJobs();
    }
  }, [status, router]);

  const fetchSavedJobs = async () => {
    try {
      const response = await fetch('/api/user/saved-jobs');
      if (!response.ok) throw new Error('Failed to fetch saved jobs');
      
      const data = await response.json();
      setSavedJobs(data);
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
      toast.error('저장한 공고를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsaveJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/unsave`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to unsave job');

      setSavedJobs(prev => prev.filter(item => item.job.id !== jobId));
      toast.success('공고 저장이 취소되었습니다.');
    } catch (error) {
      console.error('Error unsaving job:', error);
      toast.error('공고 저장 취소에 실패했습니다.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedJobs.size === 0) {
      toast.error('삭제할 공고를 선택해주세요.');
      return;
    }

    try {
      const promises = Array.from(selectedJobs).map(jobId =>
        fetch(`/api/jobs/${jobId}/unsave`, { method: 'POST' })
      );

      await Promise.all(promises);

      setSavedJobs(prev => 
        prev.filter(item => !selectedJobs.has(item.job.id))
      );
      setSelectedJobs(new Set());
      toast.success(`${selectedJobs.size}개의 공고가 삭제되었습니다.`);
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('일괄 삭제에 실패했습니다.');
    }
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const formatSalary = (salaryRange: any) => {
    if (!salaryRange) return '급여 협의';
    const { min, max, text } = salaryRange;
    if (text) return text;
    if (min && max) return `${(min / 10000).toFixed(0)}만원 ~ ${(max / 10000).toFixed(0)}만원`;
    if (min) return `${(min / 10000).toFixed(0)}만원 이상`;
    if (max) return `${(max / 10000).toFixed(0)}만원 이하`;
    return '급여 협의';
  };

  const getExpiryStatus = (expiresAt: Date | string | null) => {
    if (!expiresAt) return null;
    const expires = new Date(expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { text: '마감', color: 'bg-gray-500' };
    if (daysLeft <= 3) return { text: `D-${daysLeft}`, color: 'bg-red-500' };
    if (daysLeft <= 7) return { text: `D-${daysLeft}`, color: 'bg-orange-500' };
    return { text: `D-${daysLeft}`, color: 'bg-blue-500' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>저장한 공고를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/jobs">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">저장한 공고</h1>
          </div>
          
          {savedJobs.length > 0 && (
            <div className="flex items-center gap-4">
              <p className="text-gray-600 dark:text-gray-400">
                총 {savedJobs.length}개의 공고를 저장했습니다.
              </p>
              {selectedJobs.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="ml-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {selectedJobs.size}개 삭제
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {savedJobs.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              아직 저장한 공고가 없습니다. 
              <Link href="/jobs" className="underline ml-1">
                채용공고 둘러보기
              </Link>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {savedJobs.map((item) => {
              const job = item.job;
              const expiryStatus = getExpiryStatus(job.expiresAt);
              
              return (
                <Card key={job.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedJobs.has(job.id)}
                        onChange={() => toggleJobSelection(job.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <Link href={`/jobs/${job.id}`} className="group">
                            <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                              {job.title}
                            </h2>
                          </Link>
                          
                          <div className="flex items-center gap-2">
                            {expiryStatus && (
                              <Badge className={`${expiryStatus.color} text-white`}>
                                {expiryStatus.text}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUnsaveJob(job.id)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Heart className="h-5 w-5 fill-current" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {job.company && (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              <span>{job.company}</span>
                            </div>
                          )}
                          {job.locationJson && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>
                                {job.locationJson.address || job.locationJson.region || '위치 미정'}
                              </span>
                            </div>
                          )}
                          {job.employmentType && (
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-4 w-4" />
                              <span>{job.employmentType}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(new Date(item.savedAt), 'yyyy.MM.dd', { locale: ko })} 저장
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {formatSalary(job.salaryRange)}
                          </span>
                          <div className="flex items-center gap-2">
                            {job.isDisabilityFriendly && (
                              <Badge variant="secondary">장애인채용</Badge>
                            )}
                            <Badge variant="outline">{job.source}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}