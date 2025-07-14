#!/usr/bin/env node

const { config } = require('dotenv');
const path = require('path');

// .env 파일 로드
config({ path: path.join(__dirname, '.env') });
config({ path: path.join(__dirname, '.env.local') });

console.log('🔍 ReBridge 환경변수 검사 시작...\n');

// 필수 환경변수
const required = {
  'DATABASE_URL': '데이터베이스 연결 문자열',
  'REDIS_URL': 'Redis 연결 문자열',
  'NEXTAUTH_URL': 'NextAuth 인증 URL',
  'NEXTAUTH_SECRET': 'NextAuth 비밀키 (32바이트 이상)'
};

// 선택적 환경변수
const optional = {
  'NEXT_PUBLIC_APP_URL': '애플리케이션 공개 URL',
  'KAKAO_CLIENT_ID': '카카오 OAuth 클라이언트 ID',
  'KAKAO_CLIENT_SECRET': '카카오 OAuth 클라이언트 시크릿',
  'SMTP_HOST': '이메일 SMTP 호스트',
  'SMTP_PORT': '이메일 SMTP 포트',
  'SMTP_USER': '이메일 사용자',
  'SMTP_PASSWORD': '이메일 비밀번호',
  'SMTP_FROM': '발신자 이메일',
  'SENTRY_DSN': 'Sentry 에러 추적 DSN',
  'SLACK_WEBHOOK_URL': 'Slack 알림 웹훅',
  'UPSTASH_REDIS_REST_URL': 'Upstash Redis REST URL',
  'UPSTASH_REDIS_REST_TOKEN': 'Upstash Redis 토큰'
};

let hasError = false;

// 필수 환경변수 검사
console.log('📋 필수 환경변수 검사:\n');
Object.entries(required).forEach(([key, description]) => {
  const value = process.env[key];
  if (!value) {
    console.log(`❌ ${key} - 미설정 (${description})`);
    hasError = true;
  } else {
    // 민감한 정보는 일부만 표시
    let displayValue = value;
    if (key.includes('SECRET') || key.includes('PASSWORD')) {
      displayValue = value.substring(0, 8) + '...';
    } else if (key.includes('URL')) {
      displayValue = value.replace(/:[^:@]+@/, ':****@');
    }
    console.log(`✅ ${key} - 설정됨 (${displayValue})`);
  }
});

// NEXTAUTH_SECRET 길이 검사
if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
  console.log('\n⚠️  경고: NEXTAUTH_SECRET이 너무 짧습니다. 32바이트 이상을 권장합니다.');
  console.log('   생성 명령: openssl rand -base64 32');
}

// 선택적 환경변수 검사
console.log('\n📋 선택적 환경변수 검사:\n');
Object.entries(optional).forEach(([key, description]) => {
  const value = process.env[key];
  if (!value) {
    console.log(`⚪ ${key} - 미설정 (${description})`);
  } else {
    let displayValue = value;
    if (key.includes('SECRET') || key.includes('PASSWORD') || key.includes('TOKEN')) {
      displayValue = value.substring(0, 8) + '...';
    }
    console.log(`✅ ${key} - 설정됨`);
  }
});

// 환경 감지
console.log('\n🌍 환경 정보:\n');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`실행 경로: ${process.cwd()}`);

// 결과 요약
console.log('\n📊 검사 결과:\n');
if (hasError) {
  console.log('❌ 필수 환경변수가 누락되었습니다!');
  console.log('   ENV_SETUP_GUIDE.md 파일을 참고하여 설정해주세요.');
  process.exit(1);
} else {
  console.log('✅ 모든 필수 환경변수가 설정되었습니다!');
  
  // 추가 권장사항
  if (!process.env.KAKAO_CLIENT_ID) {
    console.log('\n💡 팁: 카카오 로그인을 사용하려면 KAKAO_CLIENT_ID와 KAKAO_CLIENT_SECRET을 설정하세요.');
  }
  if (!process.env.SMTP_HOST) {
    console.log('💡 팁: 이메일 알림을 사용하려면 SMTP 설정을 추가하세요.');
  }
}