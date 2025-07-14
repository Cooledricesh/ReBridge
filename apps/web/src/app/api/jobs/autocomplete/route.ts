import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { z } from 'zod';

const autocompleteSchema = z.object({
  q: z.string().min(2).max(50),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { q } = autocompleteSchema.parse({ q: searchParams.get('q') });
    
    // 캐시 확인
    const cacheKey = `autocomplete:${q}`;
    const cached = await redis().get(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }
    
    // 채용공고 제목에서 검색
    const jobSuggestions = await prisma.job.findMany({
      where: {
        title: {
          contains: q,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        title: true,
        company: true,
      },
      take: 5,
      orderBy: {
        crawledAt: 'desc',
      },
    });
    
    // 회사명에서 검색
    const companySuggestions = await prisma.job.findMany({
      where: {
        company: {
          contains: q,
          mode: 'insensitive',
        },
      },
      select: {
        company: true,
      },
      distinct: ['company'],
      take: 3,
    });
    
    const suggestions = [
      ...jobSuggestions.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        type: 'job' as const,
      })),
      ...companySuggestions
        .filter(c => c.company)
        .map(c => ({
          id: c.company!,
          title: c.company!,
          company: null,
          type: 'company' as const,
        })),
    ];
    
    const response = { suggestions };
    
    // 10분간 캐시
    await redis().setex(cacheKey, 600, JSON.stringify(response));
    
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Autocomplete error:', error);
    return NextResponse.json(
      { error: '자동완성 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}