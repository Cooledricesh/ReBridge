# ReBridge 성능 최적화 가이드

## 원격 서버 성능 진단 방법

### 1. 서버 리소스 모니터링
```bash
# CPU 및 메모리 사용률 확인
top
htop

# PM2 프로세스 상태 확인
pm2 status
pm2 monit

# 메모리 사용량 상세 확인
pm2 describe rebridge-web
```

### 2. 응답 시간 측정
```bash
# 로컬에서 원격 서버로 테스트
curl -w "Total time: %{time_total}s\n" -o /dev/null -s https://your-domain.com

# 상세 시간 분석
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com
```

curl-format.txt 파일:
```
time_namelookup:  %{time_namelookup}s\n
time_connect:  %{time_connect}s\n
time_appconnect:  %{time_appconnect}s\n
time_pretransfer:  %{time_pretransfer}s\n
time_redirect:  %{time_redirect}s\n
time_starttransfer:  %{time_starttransfer}s\n
time_total:  %{time_total}s\n
```

### 3. 네트워크 레이턴시 확인
```bash
# Ping 테스트
ping your-domain.com

# Traceroute로 경로 확인
traceroute your-domain.com
```

## 성능 최적화 방법

### 1. 미들웨어 최적화
```typescript
// apps/web/src/middleware.ts
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
```

### 2. Next.js 프로덕션 최적화
```javascript
// next.config.js
module.exports = {
  // 이미지 최적화
  images: {
    domains: ['your-domain.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // 번들 최적화
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
          },
        },
      };
    }
    return config;
  },
  
  // 압축 활성화
  compress: true,
  
  // 정적 페이지 생성
  output: 'standalone',
};
```

### 3. PM2 클러스터 모드 활성화
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'rebridge-web',
    script: 'node',
    args: 'server.js',
    cwd: './apps/web/.next/standalone/apps/web',
    instances: 'max', // CPU 코어 수만큼
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // 메모리 제한
    max_memory_restart: '1G',
    // 에러 시 재시작
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
  }]
};
```

### 4. 캐싱 전략 개선
```typescript
// API 응답 캐싱
export async function GET(request: Request) {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

### 5. 데이터베이스 쿼리 최적화
```typescript
// Prisma 쿼리 최적화
const jobs = await prisma.job.findMany({
  select: {
    id: true,
    title: true,
    company: true,
    location: true,
    // 필요한 필드만 선택
  },
  take: 20, // 페이지네이션
  // 인덱스 활용
  orderBy: {
    createdAt: 'desc'
  }
});
```

### 6. 정적 자산 최적화
- 이미지를 WebP/AVIF 형식으로 변환
- CSS/JS 번들 크기 최소화
- 폰트 서브셋 사용
- Gzip/Brotli 압축 활성화

### 7. 외부 접근 최적화
ngrok 대신 더 빠른 대안:
- Cloudflare Tunnel (더 낮은 레이턴시)
- 고정 IP + 도메인 직접 연결
- CDN 사용 (정적 자산)

## 모니터링 도구 설정

### PM2 모니터링
```bash
# PM2 Plus 무료 모니터링
pm2 monitor

# 커스텀 메트릭스
pm2 install pm2-server-monit
```

### 로그 분석
```bash
# 응답 시간 로그 분석
grep "GET /" logs/out.log | awk '{print $NF}' | sort -n | tail -20
```

## 즉시 적용 가능한 개선사항

1. **미들웨어 간소화**: 위의 최적화된 버전 적용
2. **PM2 클러스터 모드**: 멀티 프로세스로 처리량 증가
3. **정적 페이지 캐싱**: 자주 접근하는 페이지 캐싱
4. **이미지 최적화**: next/image 컴포넌트 활용

## 성능 목표
- 첫 페이지 로드: < 2초
- API 응답: < 200ms
- 정적 자산: CDN 캐싱으로 < 50ms