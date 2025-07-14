import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { withRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const searchSchema = z.object({
  q: z.string().min(1).max(100),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  source: z.string().optional(),
  employmentType: z.string().optional(),
  location: z.string().optional(),
  sort: z.enum(['latest', 'relevant']).default('relevant'),
});

async function searchHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams);
    
    const validatedParams = searchSchema.parse(params);
    const { q, page, limit, source, employmentType, location, sort } = validatedParams;
    
    // 캐시 키 생성
    const cacheKey = `search:${JSON.stringify(validatedParams)}`;
    
    // Redis 캐시 확인
    const cached = await redis().get(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }
    
    // 검색 조건 구성
    const where: any = {
      AND: [
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { company: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
      ],
    };
    
    if (source) {
      where.AND.push({ source });
    }
    
    if (employmentType) {
      where.AND.push({ employmentType });
    }
    
    if (location) {
      where.AND.push({
        OR: [
          { locationJson: { path: ['address'], string_contains: location } },
          { locationJson: { path: ['region'], string_contains: location } },
        ],
      });
    }
    
    // 정렬 옵션
    const orderBy = sort === 'latest' 
      ? { crawledAt: 'desc' as const }
      : undefined;
    
    // 병렬로 검색 수행
    const [results, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
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
        },
      }),
      prisma.job.count({ where }),
    ]);
    
    // relevant 정렬인 경우 점수 계산
    if (sort === 'relevant') {
      const scoredResults = results.map(job => {
        let score = 0;
        const qLower = q.toLowerCase();
        
        // 제목 일치: 높은 점수
        if (job.title.toLowerCase().includes(qLower)) {
          score += 10;
          // 정확한 단어 일치는 추가 점수
          if (job.title.toLowerCase().split(' ').includes(qLower)) {
            score += 5;
          }
        }
        
        // 회사명 일치: 중간 점수
        if (job.company?.toLowerCase().includes(qLower)) {
          score += 5;
        }
        
        // 최신 공고: 약간의 가산점
        const daysSinceCrawled = Math.floor(
          (Date.now() - new Date(job.crawledAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceCrawled < 7) {
          score += 2;
        }
        
        return { ...job, score };
      });
      
      // 점수순으로 정렬
      scoredResults.sort((a, b) => b.score - a.score);
      
      // score 필드 제거
      results.splice(0, results.length, ...scoredResults.map(({ score, ...job }) => job));
    }
    
    const response = {
      results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      query: {
        q,
        source,
        employmentType,
        location,
        sort,
      },
    };
    
    // 결과 캐시 (5분)
    await redis().setex(cacheKey, 300, JSON.stringify(response));
    
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Search error:', error);
    return NextResponse.json(
      { error: '검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(searchHandler, 'search');