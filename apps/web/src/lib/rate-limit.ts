import { NextResponse } from 'next/server';

// Mock rate limiter for build without Redis
export const rateLimiters = {
  api: { limit: async () => ({ success: true, limit: 60, remaining: 60, reset: Date.now() + 60000 }) },
  auth: { limit: async () => ({ success: true, limit: 10, remaining: 10, reset: Date.now() + 3600000 }) },
  search: { limit: async () => ({ success: true, limit: 30, remaining: 30, reset: Date.now() + 60000 }) },
  profile: { limit: async () => ({ success: true, limit: 20, remaining: 20, reset: Date.now() + 3600000 }) },
};

export async function checkRateLimit(
  limiter: any,
  identifier?: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  return { success: true, limit: 60, remaining: 60, reset: Date.now() + 60000 };
}

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

export function withRateLimit(
  handler: Function,
  limiterName: keyof typeof rateLimiters = 'api'
) {
  return async function (req: Request, ...args: any[]) {
    // In mock mode, always allow requests
    const response = await handler(req, ...args);
    
    if (response instanceof NextResponse) {
      response.headers.set('X-RateLimit-Limit', '60');
      response.headers.set('X-RateLimit-Remaining', '60');
      response.headers.set('X-RateLimit-Reset', new Date(Date.now() + 60000).toISOString());
    }
    
    return response;
  };
}