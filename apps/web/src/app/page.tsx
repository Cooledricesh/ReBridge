'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Building2,
  Clock,
  Filter,
  ChevronDown,
  Bookmark,
  ExternalLink
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from 'next/link';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('latest');
  const [filterSource, setFilterSource] = useState('all');
  const itemsPerPage = 20;

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, filterSource, currentPage]);

  const fetchJobs = async (query = searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      const response = await fetch(`/api/jobs?${params}`);
      const data = await response.json();
      
      if (data.jobs) {
        setJobs(data.jobs);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } else {
        // Use mock data if no real data
        setJobs([
          {
            id: '1',
            title: '사무 보조 직원',
            company: '한국장애인고용공단',
            locationJson: { address: '서울특별시 영등포구' },
            salaryRange: { min: 2400000, currency: 'KRW' },
            employmentType: '정규직',
            isDisabilityFriendly: true,
            crawledAt: new Date().toISOString(),
            source: 'workTogether',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            title: '웹 개발자',
            company: '(주)테크스타트업',
            locationJson: { address: '서울특별시 강남구' },
            salaryRange: { min: 3500000, max: 4500000, currency: 'KRW' },
            employmentType: '정규직',
            isDisabilityFriendly: true,
            crawledAt: new Date().toISOString(),
            source: 'saramin',
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            title: '고객상담 전문가',
            company: '삼성전자서비스',
            locationJson: { address: '경기도 수원시' },
            salaryRange: { min: 2800000, currency: 'KRW' },
            employmentType: '계약직',
            isDisabilityFriendly: true,
            crawledAt: new Date().toISOString(),
            source: 'saramin',
            expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]);
        setTotal(3);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchJobs(searchQuery);
  };

  const formatSalary = (salaryRange: any) => {
    if (!salaryRange) return '급여 협의';
    const { min, max, currency } = salaryRange;
    if (currency === 'KRW') {
      const minStr = min ? `${(min / 10000).toFixed(0)}만원` : '';
      const maxStr = max ? `${(max / 10000).toFixed(0)}만원` : '';
      return max ? `${minStr} ~ ${maxStr}` : `${minStr} 이상` || '급여 협의';
    }
    return '급여 협의';
  };

  const getSourceBadgeVariant = (source: string) => {
    switch (source) {
      case 'workTogether':
        return 'default';
      case 'saramin':
        return 'secondary';
      case 'work24':
        return 'outline';
      case 'jobkorea':
        return 'destructive';
      default:
        return 'default';
    }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    return `${Math.floor(diffDays / 30)}개월 전`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">ReBridge</h1>
                <Badge variant="secondary" className="ml-2 text-xs">Beta</Badge>
              </Link>
            </div>
            <nav className="flex items-center gap-4">
              <Button variant="ghost" size="sm">채용공고</Button>
              <Button variant="ghost" size="sm">기업정보</Button>
              <Button variant="ghost" size="sm">커뮤니티</Button>
              <div className="w-px h-6 bg-gray-200" />
              <Button variant="outline" size="sm">로그인</Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section with Search */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              당신의 새로운 시작을 응원합니다
            </h2>
            <p className="text-gray-600">
              정신장애인을 위한 맞춤형 채용정보를 한 곳에서 확인하세요
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="직무, 회사명, 지역을 검색해보세요"
                className="pl-12 pr-32 h-14 text-base border-gray-200 rounded-lg shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button 
                type="submit" 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 px-6"
              >
                검색
              </Button>
            </form>
            
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-sm text-gray-500">인기 검색어:</span>
              {['사무직', '개발자', '디자이너', '서울', '재택근무'].map((keyword) => (
                <Button
                  key={keyword}
                  variant="ghost"
                  size="sm"
                  className="text-sm text-blue-600 hover:text-blue-700"
                  onClick={() => {
                    setSearchQuery(keyword);
                    setCurrentPage(1);
                    fetchJobs(keyword);
                  }}
                >
                  {keyword}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Filters and Sort */}
      <section className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="채용사이트" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="workTogether">워크투게더</SelectItem>
                  <SelectItem value="saramin">사람인</SelectItem>
                  <SelectItem value="work24">고용24</SelectItem>
                  <SelectItem value="jobkorea">잡코리아</SelectItem>
                </SelectContent>
              </Select>
              
              <Select defaultValue="all">
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="고용형태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="fulltime">정규직</SelectItem>
                  <SelectItem value="contract">계약직</SelectItem>
                  <SelectItem value="parttime">시간제</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="all">
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="지역" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="seoul">서울</SelectItem>
                  <SelectItem value="gyeonggi">경기</SelectItem>
                  <SelectItem value="incheon">인천</SelectItem>
                  <SelectItem value="busan">부산</SelectItem>
                  <SelectItem value="daegu">대구</SelectItem>
                  <SelectItem value="gwangju">광주</SelectItem>
                  <SelectItem value="daejeon">대전</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                상세 필터
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{total}개의 채용공고</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">최신순</SelectItem>
                  <SelectItem value="deadline">마감임박순</SelectItem>
                  <SelectItem value="popular">인기순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12" role="status" aria-live="polite">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true"></div>
                <span className="ml-3 text-gray-600">채용공고를 불러오는 중...</span>
              </div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">검색 결과가 없습니다.</p>
            </div>
          ) : (
            jobs.map((job) => {
              const daysLeft = getDaysUntilExpiry(job.expiresAt);
              
              return (
                <Link key={job.id} href={`/jobs/${job.id}`} className="block">
                  <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-gray-700 font-medium">{job.company}</span>
                            <Badge variant={getSourceBadgeVariant(job.source)} className="text-xs">
                              {getSourceLabel(job.source)}
                            </Badge>
                            {job.isDisabilityFriendly && (
                              <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                                장애인채용
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="ml-4"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // TODO: Implement bookmark functionality
                          }}
                        >
                          <Bookmark className="h-5 w-5" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{job.locationJson?.address || '위치 미정'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">{formatSalary(job.salaryRange)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          <span>{job.employmentType || '고용형태 미정'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(job.crawledAt)} 등록</span>
                        </div>
                      </div>

                      {daysLeft !== null && daysLeft <= 7 && (
                        <div className="mt-3">
                          <Badge variant="destructive" className="text-xs">
                            마감 {daysLeft === 0 ? '오늘' : `${daysLeft}일 전`}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-4"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(`/jobs/${job.id}`, '_self');
                      }}
                    >
                      지원하기
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                    </div>
                  </Card>
                </Link>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                }}
              >
                이전
              </Button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="px-2 text-gray-500">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage(prev => Math.min(totalPages, prev + 1));
                }}
              >
                다음
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">ReBridge</h3>
              <p className="text-sm">
                정신장애인을 위한 맞춤형 채용정보 플랫폼
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">서비스</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">채용공고</a></li>
                <li><a href="#" className="hover:text-white">기업정보</a></li>
                <li><a href="#" className="hover:text-white">이력서 작성</a></li>
                <li><a href="#" className="hover:text-white">커뮤니티</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">고객지원</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">자주 묻는 질문</a></li>
                <li><a href="#" className="hover:text-white">문의하기</a></li>
                <li><a href="#" className="hover:text-white">이용약관</a></li>
                <li><a href="#" className="hover:text-white">개인정보처리방침</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">연락처</h4>
              <ul className="space-y-2 text-sm">
                <li>이메일: support@rebridge.kr</li>
                <li>전화: 02-1234-5678</li>
                <li>운영시간: 평일 09:00 - 18:00</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 ReBridge. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}