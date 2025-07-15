'use client';

import { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  ArrowRight,
  Sparkles,
  Users,
  Target,
  Shield
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroBackground from '@/components/three/HeroBackground';

gsap.registerPlugin(ScrollTrigger);

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('latest');
  const [filterSource, setFilterSource] = useState('all');
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [savingJobs, setSavingJobs] = useState<Set<string>>(new Set());
  const itemsPerPage = 20;

  // Refs for GSAP animations
  const heroRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLFormElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const jobsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, filterSource, currentPage]);

  useEffect(() => {
    // GSAP animations
    const ctx = gsap.context(() => {
      // Hero section animation
      gsap.from('.hero-title', {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
      });

      gsap.from('.hero-subtitle', {
        y: 30,
        opacity: 0,
        duration: 1,
        delay: 0.2,
        ease: 'power3.out',
      });

      // Search box animation
      if (searchRef.current) {
        gsap.from(searchRef.current, {
          y: 30,
          opacity: 0,
          duration: 1,
          delay: 0.4,
          ease: 'power3.out',
        });
      }

      // Popular keywords animation
      gsap.from('.keyword-button', {
        scale: 0,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        delay: 0.6,
        ease: 'back.out(1.7)',
      });

      // Features animation
      gsap.from('.feature-card', {
        scrollTrigger: {
          trigger: featuresRef.current,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse',
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out',
      });

      // Stats animation
      gsap.from('.stat-item', {
        scrollTrigger: {
          trigger: statsRef.current,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse',
        },
        scale: 0,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'back.out(1.7)',
      });

      // Job cards animation
      ScrollTrigger.batch('.job-card', {
        onEnter: (batch) => gsap.to(batch, {
          opacity: 1,
          y: 0,
          stagger: 0.15,
          overwrite: true,
        }),
        onLeave: (batch) => gsap.to(batch, {
          opacity: 0,
          y: 100,
          stagger: 0.15,
          overwrite: true,
        }),
        onEnterBack: (batch) => gsap.to(batch, {
          opacity: 1,
          y: 0,
          stagger: 0.15,
          overwrite: true,
        }),
        onLeaveBack: (batch) => gsap.to(batch, {
          opacity: 0,
          y: -100,
          stagger: 0.15,
          overwrite: true,
        }),
      });

      // Set initial state for job cards
      gsap.set('.job-card', { opacity: 0, y: 50 });
    });

    return () => ctx.revert();
  }, [jobs]);

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

  const handleSaveJob = async (jobId: string) => {
    setSavingJobs(prev => new Set(prev).add(jobId));
    
    // Simulate save animation
    setTimeout(() => {
      setSavedJobs(prev => new Set(prev).add(jobId));
      setSavingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }, 500);
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
        return 'secondary';
      case 'saramin':
        return 'default';
      case 'work24':
        return 'destructive';
      case 'jobkorea':
        return 'outline';
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center group">
                <h1 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                  ReBridge
                </h1>
                <Badge variant="secondary" className="ml-2 text-xs">Beta</Badge>
              </Link>
            </div>
            <nav className="flex items-center gap-4">
              <Link href="/jobs">
                <Button variant="ghost" size="sm" className="hover:scale-105 transition-transform">
                  채용공고
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="hover:scale-105 transition-transform">
                기업정보
              </Button>
              <Button variant="ghost" size="sm" className="hover:scale-105 transition-transform">
                커뮤니티
              </Button>
              <div className="w-px h-6 bg-gray-200" />
              <Button variant="outline" size="sm" className="hover:scale-105 transition-transform">
                로그인
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section with Three.js Background */}
      <section ref={heroRef} className="relative overflow-hidden py-20">
        <HeroBackground />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="hero-title text-5xl font-bold text-foreground mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
              당신의 새로운 시작을 응원합니다
            </h2>
            <p className="hero-subtitle text-xl text-muted-foreground">
              정신장애인을 위한 맞춤형 채용정보를 한 곳에서 확인하세요
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <form ref={searchRef} onSubmit={handleSearch} className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 transition-colors group-hover:text-primary" />
              <Input
                type="text"
                placeholder="직무, 회사명, 지역을 검색해보세요"
                className="pl-12 pr-32 h-16 text-lg border-2 border-border rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl focus:shadow-xl focus:border-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button 
                type="submit" 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-12 px-8 text-base hover:scale-105 transition-transform"
              >
                검색
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
            
            <div className="flex items-center justify-center gap-2 mt-6">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">인기 검색어:</span>
              {['사무직', '개발자', '디자이너', '서울', '재택근무'].map((keyword) => (
                <Button
                  key={keyword}
                  variant="ghost"
                  size="sm"
                  className="keyword-button text-sm text-primary hover:text-primary/80 hover:bg-primary/10 transition-all"
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

      {/* Features Section */}
      <section ref={featuresRef} className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="feature-card text-center group cursor-pointer">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">맞춤형 채용정보</h3>
              <p className="text-muted-foreground">정신장애인을 위한 검증된 채용공고만을 선별하여 제공합니다</p>
            </div>
            <div className="feature-card text-center group cursor-pointer">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">안전한 근무환경</h3>
              <p className="text-muted-foreground">장애친화적 기업문화를 가진 검증된 기업들의 공고를 우선 추천합니다</p>
            </div>
            <div className="feature-card text-center group cursor-pointer">
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">커뮤니티 지원</h3>
              <p className="text-muted-foreground">같은 고민을 가진 사람들과 정보를 공유하고 서로 응원합니다</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-16 bg-gradient-to-r from-primary/5 to-purple-600/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="stat-item">
              <div className="text-4xl font-bold text-primary mb-2">1,234</div>
              <div className="text-muted-foreground">등록된 채용공고</div>
            </div>
            <div className="stat-item">
              <div className="text-4xl font-bold text-green-600 mb-2">567</div>
              <div className="text-muted-foreground">검증된 기업</div>
            </div>
            <div className="stat-item">
              <div className="text-4xl font-bold text-purple-600 mb-2">89%</div>
              <div className="text-muted-foreground">취업 성공률</div>
            </div>
            <div className="stat-item">
              <div className="text-4xl font-bold text-orange-600 mb-2">24/7</div>
              <div className="text-muted-foreground">실시간 지원</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters and Sort */}
      <section className="bg-card border-b sticky top-16 z-40">
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

              <Button variant="outline" size="sm" className="hover:scale-105 transition-transform">
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
      <main ref={jobsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12" role="status" aria-live="polite">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true"></div>
                <span className="ml-3 text-muted-foreground">지금 좋은 공고를 찾는 중이에요...</span>
              </div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">검색 결과가 없습니다.</p>
            </div>
          ) : (
            jobs.map((job) => {
              const daysLeft = getDaysUntilExpiry(job.expiresAt);
              
              return (
                <Link key={job.id} href={`/jobs/${job.id}`} className="block job-card">
                  <Card className="p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer hover:border-primary/20">
                    <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground hover:text-primary transition-soft">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-foreground/80 font-medium">{job.company}</span>
                            <Badge variant={getSourceBadgeVariant(job.source)} className="text-xs">
                              {getSourceLabel(job.source)}
                            </Badge>
                            {job.isDisabilityFriendly && (
                              <Badge variant="outline" className="text-xs border-secondary text-secondary-foreground">
                                장애인채용
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`ml-4 hover:scale-110 transition-transform ${savingJobs.has(job.id) ? 'animate-pulse' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSaveJob(job.id);
                          }}
                        >
                          <Bookmark 
                            className={`h-5 w-5 transition-colors ${savedJobs.has(job.id) ? 'fill-primary text-primary' : ''}`} 
                          />
                        </Button>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-3">
                        {job.locationJson?.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{job.locationJson.address}</span>
                          </div>
                        )}
                        {job.salaryRange && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">{formatSalary(job.salaryRange)}</span>
                          </div>
                        )}
                        {job.employmentType && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            <span>{job.employmentType}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(job.crawledAt)}</span>
                        </div>
                      </div>

                      {daysLeft !== null && daysLeft <= 7 && (
                        <div className="mt-3">
                          <Badge variant="destructive" className="text-xs animate-pulse">
                            마감 {daysLeft === 0 ? '오늘' : `${daysLeft}일 전`}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-4 hover:scale-105 transition-transform"
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
                className="hover:scale-105 transition-transform"
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
                    className="hover:scale-105 transition-transform"
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
                    className="hover:scale-105 transition-transform"
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
                className="hover:scale-105 transition-transform"
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
                <li><a href="#" className="hover:text-white transition-colors">채용공고</a></li>
                <li><a href="#" className="hover:text-white transition-colors">기업정보</a></li>
                <li><a href="#" className="hover:text-white transition-colors">이력서 작성</a></li>
                <li><a href="#" className="hover:text-white transition-colors">커뮤니티</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">고객지원</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">자주 묻는 질문</a></li>
                <li><a href="#" className="hover:text-white transition-colors">문의하기</a></li>
                <li><a href="#" className="hover:text-white transition-colors">이용약관</a></li>
                <li><a href="#" className="hover:text-white transition-colors">개인정보처리방침</a></li>
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