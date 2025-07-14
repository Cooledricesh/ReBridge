# ReBridge 프로젝트 실행 문제 해결 기록

## 발생일: 2025-07-13

### 🔴 문제 상황
- Next.js 앱이 실행되지 않고 웹페이지가 열리지 않음
- 터미널에는 "Ready"가 표시되지만 실제로 localhost:3000이 응답하지 않음
- ERR_CONNECTION_REFUSED 에러 발생

### 🔍 원인
**Prisma 클라이언트 미생성 문제**
- monorepo 구조에서 Prisma 클라이언트가 제대로 생성되지 않음
- `@prisma/client` 패키지는 설치되었지만 실제 클라이언트 코드가 생성되지 않음
- 데이터베이스 초기화 과정에서 앱이 멈춤

### ✅ 해결 방법
```bash
cd apps/web
npx prisma generate
```

### 📊 결과
- Prisma 클라이언트 재생성 후 즉시 해결
- 앱이 3001 포트에서 정상 실행 (3000 포트 충돌로 자동 변경)
- 모든 기능 정상 작동

### 💡 교훈
1. **monorepo에서 Prisma 사용 시 주의사항**
   - 패키지 설치 후 반드시 `prisma generate` 실행
   - 스키마 변경 시에도 클라이언트 재생성 필요

2. **문제 해결 체크리스트**
   - [ ] Prisma 클라이언트 생성 확인
   - [ ] 포트 충돌 확인
   - [ ] node_modules 동기화 상태 확인
   - [ ] 환경 변수 설정 확인

3. **예방 방법**
   - postinstall 스크립트에 `prisma generate` 추가 고려
   - README에 초기 설정 단계 명시