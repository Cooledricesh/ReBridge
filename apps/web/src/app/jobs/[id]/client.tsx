'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft,
  MapPin, 
  Calendar, 
  Building2,
  Clock,
  Bookmark,
  Share2,
  ExternalLink,
  CheckCircle,
  Users,
  Briefcase,
  GraduationCap,
  FileText,
  Heart,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';
import { SaveJobButton } from '@/components/save-job-button';

interface JobDetailClientProps {
  job: any;
  relatedJobs: any[];
}

const sourceColors: Record<string, string> = {
  WORKTOGETHER: 'bg-blue-100 text-blue-800',
  SARAMIN: 'bg-purple-100 text-purple-800',
  WORK24: 'bg-green-100 text-green-800',
  JOBKOREA: 'bg-orange-100 text-orange-800'
};

const sourceNames: Record<string, string> = {
  WORKTOGETHER: '워크투게더',
  SARAMIN: '사람인',
  WORK24: '고용24',
  JOBKOREA: '잡코리아'
};

export default function JobDetailClient({ job, relatedJobs }: JobDetailClientProps) {
  const router = useRouter();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${job.title} - ${job.company || '회사명 미정'}`,
          text: job.description?.substring(0, 100),
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to copying URL
      await navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 복사되었습니다.');
    }
  };

  const formatSalary = (min: number | null, max: number | null, info: string | null) => {
    if (info) return info;
    if (min && max) return `${(min / 10000).toFixed(0)}만원 ~ ${(max / 10000).toFixed(0)}만원`;
    if (min) return `${(min / 10000).toFixed(0)}만원 이상`;
    if (max) return `${(max / 10000).toFixed(0)}만원 이하`;
    return '추후 협의';
  };

  const getExpiryStatus = (expiresAt: Date | string | null) => {
    if (!expiresAt) return null;
    const expires = new Date(expiresAt);
    const today = new Date();
    const daysLeft = Math.ceil((expires.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (daysLeft < 0) return { text: '마감됨', color: 'text-gray-500' };
    if (daysLeft <= 3) return { text: `D-${daysLeft}`, color: 'text-red-600 font-semibold' };
    if (daysLeft <= 7) return { text: `D-${daysLeft}`, color: 'text-orange-600' };
    return { text: `D-${daysLeft}`, color: 'text-gray-600' };
  };

  const expiryStatus = getExpiryStatus(job.expiresAt);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>뒤로가기</span>
            </button>
            
            <div className="flex items-center gap-2">
              <SaveJobButton 
                jobId={job.id}
                size="sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
                <span className="ml-2">공유</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={sourceColors[job.source]}>
                      {sourceNames[job.source]}
                    </Badge>
                    {job.isDisabilityFriendly && (
                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        장애인 우대
                      </Badge>
                    )}
                    {expiryStatus && (
                      <span className={expiryStatus.color}>
                        {expiryStatus.text}
                      </span>
                    )}
                  </div>
                  
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {job.title}
                  </h1>
                  
                  <div className="flex items-center gap-4 text-gray-600">
                    {job.company && (
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        <span>{job.company}</span>
                      </div>
                    )}
                    {(job.location || job.locationDetail) && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{job.location} {job.locationDetail}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">고용형태</span>
                  <p className="font-medium">{job.employmentType || '정보 없음'}</p>
                </div>
                <div>
                  <span className="text-gray-500">급여</span>
                  <p className="font-medium">
                    {formatSalary(job.salaryMin, job.salaryMax, job.salaryInfo)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">경력</span>
                  <p className="font-medium">{job.experienceLevel || '무관'}</p>
                </div>
                <div>
                  <span className="text-gray-500">학력</span>
                  <p className="font-medium">{job.educationLevel || '무관'}</p>
                </div>
              </div>
            </Card>

            {/* Job Description */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                상세 내용
              </h2>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {job.description || '상세 정보가 없습니다.'}
              </div>
            </Card>

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  자격 요건
                </h2>
                <ul className="space-y-2">
                  {job.requirements.map((req: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      <span className="text-gray-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Preferred Qualifications */}
            {job.preferredQualifications && job.preferredQualifications.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  우대 사항
                </h2>
                <ul className="space-y-2">
                  {job.preferredQualifications.map((qual: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5" />
                      <span className="text-gray-700">{qual}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">복리후생</h2>
                <div className="flex flex-wrap gap-2">
                  {job.benefits.map((benefit: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {benefit}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Button */}
            <Card className="p-6">
              <Button
                className="w-full"
                size="lg"
                asChild
              >
                <a
                  href={job.externalUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  지원하기
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
              
              {job.applicationDeadline && (
                <p className="text-sm text-gray-500 mt-3 text-center">
                  마감일: {format(new Date(job.applicationDeadline), 'yyyy년 MM월 dd일', { locale: ko })}
                </p>
              )}
            </Card>

            {/* Job Info */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">채용 정보</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-500">등록일</p>
                    <p className="font-medium">
                      {format(new Date(job.crawledAt), 'yyyy년 MM월 dd일', { locale: ko })}
                    </p>
                  </div>
                </div>
                
                {job.expiresAt && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-gray-500">마감일</p>
                      <p className="font-medium">
                        {format(new Date(job.expiresAt), 'yyyy년 MM월 dd일', { locale: ko })}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-2">
                  <Briefcase className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-500">채용 형태</p>
                    <p className="font-medium">{job.employmentType || '정보 없음'}</p>
                  </div>
                </div>
                
                {job.workingHours && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-gray-500">근무 시간</p>
                      <p className="font-medium">{job.workingHours}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Related Jobs */}
            {relatedJobs.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">추천 채용공고</h3>
                <div className="space-y-3">
                  {relatedJobs.map((relatedJob) => (
                    <Link
                      key={relatedJob.id}
                      href={`/jobs/${relatedJob.id}`}
                      className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <h4 className="font-medium text-sm mb-1 line-clamp-2">
                        {relatedJob.title}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {relatedJob.company} · {relatedJob.location}
                      </p>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}