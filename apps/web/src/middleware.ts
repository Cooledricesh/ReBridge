import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 성능을 위해 헤더를 미리 생성
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export function middleware(request: NextRequest) {
  // OPTIONS 요청은 빠르게 처리
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { 
      status: 200,
      headers: corsHeaders
    });
  }
  
  // API 경로만 처리
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};