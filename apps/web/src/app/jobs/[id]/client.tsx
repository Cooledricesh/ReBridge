'use client';

import { useState, useEffect } from 'react';
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
  DollarSign, 
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
  Heart
} from 'lucide-react';

interface Job {
  id: string;
  source: string;
  externalId: string;
  title: string;
  company: string;
  description: string;
  locationJson: any;
  salaryRange: any;
  employmentType: string;
  isDisabilityFriendly: boolean;
  requiredExperience?: string;
  requiredEducation?: string;
  benefits?: string[];
  requirements?: string[];
  preferredQualifications?: string[];
  crawledAt: string;
  expiresAt: string;
  applyUrl?: string;
  contactInfo?: any;
}

export default function JobDetailClient({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchJobDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchJobDetail = async () => {
    try {
      const response = await fetch(`/api/jobs/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch job');
      
      const data = await response.json();
      setJob(data);
    } catch (error) {
      console.error('Error fetching job:', error);
      // Use mock data for preview
      setJob({
        id: params.id as string,
        source: 'workTogether',
        externalId: 'WT123456',
        title: '사무 보조 직원',
        company: '한국장애인고용공단',
        description: `우리 공단은 장애인이 직업생활을 통해 자립할 수 있도록 지원하고, 사업주의 장애인 고용을 전문적으로 돕는 기관입니다.

본 채용은 정신장애인을 우대하며, 근무환경이 장애친화적으로 조성되어 있습니다.

주요 업무:
- 문서 작성 및 정리
- 데이터 입력 및 관리
- 전화 응대 및 방문객 안내
- 회의 준비 및 지원
- 기타 사무 보조 업무

근무 조건:
- 주 5일 근무 (월~금)
- 근무시간: 09:00 ~ 18:00
- 4대 보험 가입
- 연차 및 경조사 휴가
- 중식 제공

우대 사항:
- 컴퓨터 활용 능력 우수자
- 관련 자격증 소지자
- 장애인 우대`,
        locationJson: { 
          address: '서울특별시 영등포구 버드나루로2길 8',
          city: '서울특별시',
          district: '영등포구'
        },
        salaryRange: { 
          min: 2400000, 
          currency: 'KRW',
          type: 'monthly'
        },
        employmentType: '정규직',
        isDisabilityFriendly: true,
        requiredExperience: '경력무관',
        requiredEducation: '고졸 이상',
        benefits: [
          '4대보험',
          '연차/경조사 휴가',
          '중식 제공',
          '정기 건강검진',
          '교육비 지원'
        ],
        requirements: [
          '정신장애인 우대',
          '컴퓨터 기본 활용 가능자',
          '성실하고 책임감 있는 분'
        ],
        preferredQualifications: [
          '문서작성 프로그램 활용 가능자',
          '관련 업무 경험자',
          '장애인 취업 지원 프로그램 수료자'
        ],
        crawledAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        applyUrl: 'https://www.kead.or.kr',
        contactInfo: {
          phone: '02-1588-1519',
          email: 'recruit@kead.or.kr'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const formatSalary = (salaryRange: any) => {
    if (!salaryRange) return '급여 협의';
    const { min, max, currency } = salaryRange;
    if (currency === 'KRW') {
      const minStr = min ? `${(min / 10000).toFixed(0)}만원` : '';
      const maxStr = max ? `${(max / 10000).toFixed(0)}만원` : '';
      return max ? `월 ${minStr} ~ ${maxStr}` : `월 ${minStr} 이상`;
    }
    return '급여 협의';
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'workTogether':
        return '워크투게더';
      case 'saramin':
        return '사람인';
      case 'work24':
        return '고용24';
      case 'jobkorea':
        return '잡코리아';
      default:
        return source;
    }
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    if (!expiresAt) return null;
    const days = Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const handleSave = () => {
    setSaved(!saved);
    // TODO: Implement actual save functionality
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: job?.title,
        text: `${job?.company}에서 ${job?.title} 채용 중`,
        url: window.location.href
      });
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('링크가 복사되었습니다!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">채용공고를 찾을 수 없습니다.</p>
          <Button onClick={() => router.push('/')}>목록으로 돌아가기</Button>
        </Card>
      </div>
    );
  }

  const daysLeft = getDaysUntilExpiry(job.expiresAt);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                뒤로가기
              </Button>
              <Link href="/" className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">ReBridge</h1>
              </Link>
            </div>
            <nav className="flex items-center gap-2">
              <Button variant="outline" size="sm">로그인</Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Job Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Title Card */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {job.title}
                  </h1>
                  <div className="flex items-center gap-3">
                    <span className="text-lg text-gray-700">{job.company}</span>
                    <Badge variant="secondary">
                      {getSourceLabel(job.source)}
                    </Badge>
                    {job.isDisabilityFriendly && (
                      <Badge variant="outline" className="border-green-500 text-green-700">
                        <Heart className="h-3 w-3 mr-1" />
                        장애인채용
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleSave}
                    className={saved ? 'text-blue-600' : ''}
                  >
                    <Bookmark className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleShare}>
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {daysLeft !== null && daysLeft <= 7 && (
                <Badge variant="destructive" className="mb-4">
                  마감 {daysLeft === 0 ? '오늘' : `${daysLeft}일 전`}
                </Badge>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>{job.locationJson?.address || '위치 미정'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">{formatSalary(job.salaryRange)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Briefcase className="h-4 w-4 flex-shrink-0" />
                  <span>{job.employmentType || '고용형태 미정'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>등록일: {new Date(job.crawledAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>

            {/* Job Description */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">상세 내용</h2>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-gray-700">
                  {job.description}
                </pre>
              </div>
            </Card>

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  자격 요건
                </h2>
                <ul className="space-y-2">
                  {job.requirements.map((req, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Preferred Qualifications */}
            {job.preferredQualifications && job.preferredQualifications.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">우대 사항</h2>
                <ul className="space-y-2">
                  {job.preferredQualifications.map((qual, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span className="text-gray-700">{qual}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* Right Column - Apply Section */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <Button 
                className="w-full mb-4" 
                size="lg"
                onClick={() => window.open(job.applyUrl || '#', '_blank')}
              >
                지원하기
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>

              <Separator className="my-4" />

              {/* Company Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    기업 정보
                  </h3>
                  <p className="text-gray-700">{job.company}</p>
                </div>

                {/* Experience & Education */}
                <div className="space-y-3">
                  {job.requiredExperience && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">경력:</span>
                      <span className="text-gray-800">{job.requiredExperience}</span>
                    </div>
                  )}
                  {job.requiredEducation && (
                    <div className="flex items-center gap-2 text-sm">
                      <GraduationCap className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">학력:</span>
                      <span className="text-gray-800">{job.requiredEducation}</span>
                    </div>
                  )}
                </div>

                {/* Benefits */}
                {job.benefits && job.benefits.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">복리후생</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.benefits.map((benefit, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact Info */}
                {job.contactInfo && (
                  <div>
                    <h3 className="font-semibold mb-2">문의처</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      {job.contactInfo.phone && (
                        <p>전화: {job.contactInfo.phone}</p>
                      )}
                      {job.contactInfo.email && (
                        <p>이메일: {job.contactInfo.email}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="text-xs text-gray-500">
                <p>출처: {getSourceLabel(job.source)}</p>
                <p>공고번호: {job.externalId}</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Related Jobs */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6">비슷한 채용공고</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <h3 className="font-semibold text-gray-900 mb-1">웹 디자이너</h3>
                <p className="text-gray-600 text-sm mb-2">(주)디자인컴퍼니</p>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    서울 강남구
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    월 300만원
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm">
            <p>&copy; 2025 ReBridge. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}