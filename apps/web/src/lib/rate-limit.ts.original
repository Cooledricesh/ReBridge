import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

// Redis 인스턴스 생성 (환경변수로 설정)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// 다양한 rate limiter 생성
export const rateLimiters = {
  // API 일반 요청: 분당 60회
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: 'rebridge:api',
  }),

  // 인증 관련: 시간당 10회
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    analytics: true,
    prefix: 'rebridge:auth',
  }),

  // 검색: 분당 30회
  search: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
    prefix: 'rebridge:search',
  }),

  // 프로필 업데이트: 시간당 20회
  profile: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'),
    analytics: true,
    prefix: 'rebridge:profile',
  }),
};

// Rate limit 체크 함수
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier?: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // IP 주소 또는 사용자 ID를 식별자로 사용
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || 
             headersList.get('x-real-ip') || 
             'anonymous';
  
  const id = identifier || ip;
  const { success, limit, remaining, reset } = await limiter.limit(id);
  
  return { success, limit, remaining, reset };
}

// Rate limit 응답 헬퍼
export function rateLimitResponse(
  limit: number,
  remaining: number,
  reset: number
): NextResponse {
  return NextResponse.json(
    { 
      error: 'Too many requests', 
      message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
      retryAfter: new Date(reset).toISOString(),
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
        'Retry-After': Math.floor((reset - Date.now()) / 1000).toString(),
      },
    }
  );
}

// Rate limit 미들웨어 래퍼
export function withRateLimit(
  handler: Function,
  limiterName: keyof typeof rateLimiters = 'api'
) {
  return async function (req: Request, ...args: any[]) {
    const limiter = rateLimiters[limiterName];
    const { success, limit, remaining, reset } = await checkRateLimit(limiter);
    
    if (!success) {
      return rateLimitResponse(limit, remaining, reset);
    }
    
    // Rate limit 정보를 응답 헤더에 추가
    const response = await handler(req, ...args);
    
    if (response instanceof NextResponse) {
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString());
    }
    
    return response;
  };
}