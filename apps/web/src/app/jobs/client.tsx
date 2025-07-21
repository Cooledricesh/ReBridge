'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Building2, Briefcase, Calendar, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ThemeToggle } from '@/components/theme-toggle';
import { SaveJobButton } from '@/components/save-job-button';

interface Job {
  id: string;
  title: string;
  company: string | null;
  locationJson: any;
  salaryRange: any;
  employmentType: string | null;
  source: string;
  externalId: string;
  isDisabilityFriendly: boolean;
  crawledAt: Date | string;
  expiresAt: Date | string | null;
  description: string | null;
}

interface JobsListClientProps {
  initialJobs: Job[];
  totalCount: number;
  currentPage: number;
  searchParams: {
    page?: string;
    q?: string;
    source?: string;
    employmentType?: string;
    location?: string;
    sort?: string;
  };
}

const sourceColors: Record<string, string> = {
  WORKTOGETHER: 'bg-blue-100 text-blue-800',
  SARAMIN: 'bg-purple-100 text-purple-800',
  WORK24: 'bg-teal-100 text-teal-800',
  JOBKOREA: 'bg-orange-100 text-orange-800'
};

const sourceNames: Record<string, string> = {
  WORKTOGETHER: '워크투게더',
  SARAMIN: '사람인',
  WORK24: '고용24',
  JOBKOREA: '잡코리아'
};

export function JobsListClient({ initialJobs, totalCount, currentPage, searchParams }: JobsListClientProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.q || '');
  const [selectedSource, setSelectedSource] = useState(searchParams.source || '');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState(searchParams.employmentType || '');
  const [selectedLocation, setSelectedLocation] = useState(searchParams.location || '');
  const [selectedSort, setSelectedSort] = useState(searchParams.sort || 'latest');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const totalPages = Math.ceil(totalCount / 20);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ q: searchQuery, page: '1' });
  };

  const updateUrl = (params: Record<string, string>) => {
    const current = new URLSearchParams(urlSearchParams.toString());
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });

    router.push(`/jobs?${current.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: newPage.toString() });
    // 페이지 변경 후 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const formatSalary = (salaryRange: any) => {
    if (!salaryRange) return '급여 협의';
    const { min, max, text } = salaryRange;
    if (text) return text;
    if (min && max) return `${(min / 10000).toFixed(0)}만원 ~ ${(max / 10000).toFixed(0)}만원`;
    if (min) return `${(min / 10000).toFixed(0)}만원 이상`;
    if (max) return `${(max / 10000).toFixed(0)}만원 이하`;
    return '추후 협의';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Skip navigation */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50">
        본문으로 건너뛰기
      </a>
      
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 sticky top-0 z-40" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center" aria-label="ReBridge 홈으로 이동">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">ReBridge</span>
            </Link>
            
            {/* 검색바 */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-8" role="search">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" aria-hidden="true" />
                <label htmlFor="job-search" className="sr-only">채용공고 검색</label>
                <input
                  id="job-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="직무, 회사명으로 검색해보세요"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  aria-label="채용공고 검색어 입력"
                />
              </div>
            </form>

            <nav className="flex items-center space-x-4" role="navigation" aria-label="주 메뉴">
              <Link href="/saved" className="text-gray-700 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 dark:text-gray-300 dark:hover:text-blue-400">
                저장공고
              </Link>
              <Link href="/profile" className="text-gray-700 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 dark:text-gray-300 dark:hover:text-blue-400">
                내 프로필
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" role="main" id="main-content">
        {/* 필터 및 정렬 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6" aria-label="검색 필터 및 정렬">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-expanded={isFilterOpen}
                aria-controls="filter-options"
              >
                <Filter className="w-4 h-4" aria-hidden="true" />
                필터
              </button>
              
              <label htmlFor="sort-select" className="sr-only">정렬 기준 선택</label>
              <select
                id="sort-select"
                value={selectedSort}
                onChange={(e) => updateUrl({ sort: e.target.value, page: '1' })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="채용공고 정렬 기준"
              >
                <option value="latest">최신순</option>
                <option value="deadline">마감임박순</option>
                <option value="popular">인기순</option>
              </select>
            </div>

            <div className="text-sm text-gray-600">
              총 <span className="font-semibold text-blue-600">{totalCount.toLocaleString()}</span>개의 채용공고
            </div>
          </div>

          {/* 확장된 필터 */}
          {isFilterOpen && (
            <div id="filter-options" className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4" role="region" aria-label="상세 필터 옵션">
              <div>
                <label htmlFor="source-filter" className="block text-sm font-medium text-gray-700 mb-2">채용 사이트</label>
                <select
                  id="source-filter"
                  value={selectedSource}
                  onChange={(e) => updateUrl({ source: e.target.value, page: '1' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">전체</option>
                  <option value="WORKTOGETHER">워크투게더</option>
                  <option value="SARAMIN">사람인</option>
                  <option value="WORK24">고용24</option>
                  <option value="JOBKOREA">잡코리아</option>
                </select>
              </div>

              <div>
                <label htmlFor="employment-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">고용 형태</label>
                <select
                  id="employment-filter"
                  value={selectedEmploymentType}
                  onChange={(e) => updateUrl({ employmentType: e.target.value, page: '1' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">전체</option>
                  <option value="정규직">정규직</option>
                  <option value="계약직">계약직</option>
                  <option value="시간제">시간제</option>
                  <option value="인턴">인턴</option>
                </select>
              </div>

              <div>
                <label htmlFor="location-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">지역</label>
                <select
                  id="location-filter"
                  value={selectedLocation}
                  onChange={(e) => updateUrl({ location: e.target.value, page: '1' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">전체</option>
                  <option value="서울">서울</option>
                  <option value="경기">경기</option>
                  <option value="인천">인천</option>
                  <option value="부산">부산</option>
                  <option value="대구">대구</option>
                  <option value="광주">광주</option>
                  <option value="대전">대전</option>
                  <option value="울산">울산</option>
                  <option value="세종">세종</option>
                  <option value="강원">강원</option>
                  <option value="충북">충북</option>
                  <option value="충남">충남</option>
                  <option value="전북">전북</option>
                  <option value="전남">전남</option>
                  <option value="경북">경북</option>
                  <option value="경남">경남</option>
                  <option value="제주">제주</option>
                </select>
              </div>
            </div>
          )}
        </section>

        {/* 채용공고 목록 */}
        <section className="grid grid-cols-1 gap-4" role="region" aria-label="채용공고 목록" aria-live="polite">
          {initialJobs.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">검색 결과가 없습니다.</p>
              <p className="text-gray-400 dark:text-gray-500 mt-2">다른 검색어나 필터를 시도해보세요.</p>
            </div>
          ) : (
            initialJobs.map((job) => {
              const expiryStatus = getExpiryStatus(job.expiresAt);
              
              return (
                <article key={job.id} className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${sourceColors[job.source]}`}>
                          {sourceNames[job.source]}
                        </span>
                        {job.isDisabilityFriendly && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            장애인 우대
                          </span>
                        )}
                        {expiryStatus && (
                          <span className={expiryStatus.color}>
                            {expiryStatus.text}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {job.title}
                        </Link>
                      </h3>

                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {job.company && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" aria-hidden="true" />
                            <span>{job.company}</span>
                          </div>
                        )}
                        {job.locationJson && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" aria-hidden="true" />
                            <span>{job.locationJson.address || job.locationJson.region || '위치 미정'}</span>
                          </div>
                        )}
                        {job.employmentType && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" aria-hidden="true" />
                            <span>{job.employmentType}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {formatSalary(job.salaryRange)}
                        </span>
                      </div>
                    </div>

                    <div className="ml-4">
                      <SaveJobButton 
                        jobId={job.id} 
                        size="icon"
                        variant="ghost"
                      />
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                    <time dateTime={new Date(job.crawledAt).toISOString()}>
                      등록일: {format(new Date(job.crawledAt), 'yyyy.MM.dd', { locale: ko })}
                    </time>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-2" role="navigation" aria-label="페이지 네비게이션">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300"
              aria-label="이전 페이지로 이동"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>

            {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
              const page = i + 1;
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 2 && page <= currentPage + 2)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      page === currentPage
                        ? 'bg-blue-600 text-white dark:bg-blue-500'
                        : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                    aria-label={`페이지 ${page}${page === currentPage ? ' (현재 페이지)' : ''}`}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </button>
                );
              }
              if (page === currentPage - 3 || page === currentPage + 3) {
                return <span key={page} className="px-2">...</span>;
              }
              return null;
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300"
              aria-label="다음 페이지로 이동"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}