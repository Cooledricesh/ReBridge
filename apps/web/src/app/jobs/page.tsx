import { Metadata } from 'next';
import { JobsListClient } from './client';
import { prisma } from '@rebridge/database';
import { redis } from '@/lib/redis';
import { measurePerformance } from '@/lib/monitoring';
import { Job } from '@prisma/client';

export async function generateMetadata(props: JobsPageProps): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const query = searchParams.q;
  const location = searchParams.location;
  
  let title = '채용공고 - ReBridge';
  let description = '정신장애인을 위한 맞춤형 채용정보를 찾아보세요. 워크투게더, 사람인, 고용24, 잡코리아의 모든 장애인 채용공고를 한 곳에서 확인하세요.';
  
  if (query) {
    title = `"${query}" 검색 결과 - ReBridge`;
    description = `${query}에 대한 채용공고 검색 결과입니다. 정신장애인을 위한 맞춤형 채용정보를 찾아보세요.`;
  } else if (location) {
    title = `${location} 지역 채용공고 - ReBridge`;
    description = `${location} 지역의 채용공고를 찾아보세요. 정신장애인을 위한 맞춤형 채용정보를 제공합니다.`;
  }
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: 'https://rebridge.kr/jobs',
      siteName: 'ReBridge',
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    }
  };
}

interface JobsPageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    source?: string;
    employmentType?: string;
    location?: string;
    sort?: string;
  }>;
}

const CACHE_KEY = 'jobs:latest';
const CACHE_TTL = 3600; // 1시간
const ITEMS_PER_PAGE = 20;

export default async function JobsPage(props: JobsPageProps) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page || 1);
  const query = searchParams.q || '';
  const source = searchParams.source;
  const employmentType = searchParams.employmentType;
  const location = searchParams.location;
  const sort = searchParams.sort || 'latest';

  // 캐시 키 생성 (쿼리 파라미터 포함)
  const cacheKey = `${CACHE_KEY}:${page}:${query}:${source}:${employmentType}:${location}:${sort}`;
  const performance = measurePerformance('/jobs');

  try {
    // Redis 캐시 확인
    const cached = await redis().get(cacheKey);
    if (cached) {
      performance.recordCacheHit();
      const { jobs, totalCount } = JSON.parse(cached as string);
      return (
        <JobsListClient 
          initialJobs={jobs} 
          totalCount={totalCount} 
          currentPage={page}
          searchParams={searchParams}
        />
      );
    }

    // 데이터베이스에서 조회
    const where: any = {
      AND: []
    };

    // 검색어 필터
    if (query) {
      where.AND.push({
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      });
    }

    // 출처 필터
    if (source) {
      where.AND.push({ source });
    }

    // 고용 형태 필터
    if (employmentType) {
      where.AND.push({ employmentType });
    }

    // 지역 필터
    if (location) {
      where.AND.push({
        OR: [
          { location: { contains: location, mode: 'insensitive' } },
          { locationDetail: { contains: location, mode: 'insensitive' } }
        ]
      });
    }

    // 정렬 옵션
    let orderBy: any = { crawledAt: 'desc' };
    if (sort === 'deadline') {
      orderBy = { expiresAt: 'asc' };
    } else if (sort === 'popular') {
      orderBy = { viewCount: 'desc' };
    }

    // 전체 개수 조회
    const totalCount = await prisma.job.count({ where });

    // 채용공고 조회
    const jobs = await prisma.job.findMany({
      where,
      orderBy,
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      select: {
        id: true,
        title: true,
        company: true,
        locationJson: true,
        salaryRange: true,
        employmentType: true,
        source: true,
        externalId: true,
        isDisabilityFriendly: true,
        crawledAt: true,
        expiresAt: true,
        description: true
      }
    });

    // Redis에 캐시 저장
    await redis().setex(
      cacheKey, 
      CACHE_TTL, 
      JSON.stringify({ jobs, totalCount })
    );

    performance.recordCacheMiss();

    return (
      <JobsListClient 
        initialJobs={jobs} 
        totalCount={totalCount} 
        currentPage={page}
        searchParams={searchParams}
      />
    );
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    
    // 에러 시 빈 데이터로 렌더링
    return (
      <JobsListClient 
        initialJobs={[]} 
        totalCount={0} 
        currentPage={page}
        searchParams={searchParams}
      />
    );
  }
}