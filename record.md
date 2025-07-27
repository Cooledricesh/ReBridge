# 빌드 오류 해결 과정에서 수정한 파일 목록

## 원래 목적
- Work24 크롤러 개선 (더 많은 필드 추출)

## 수정한 파일들

### 1. packages/crawler-adapters/src/adapters/work24.ts
- **목적**: Work24 크롤러 개선 (원래 목표)
- **변경사항**: 
  - 직무(position), 학력(education), 경력(experience), 모집인원(numberOfOpenings) 필드 추가
  - 테이블 데이터 파싱 로직 개선
  - normalizeData 메서드에서 description 필드 생성

### 2. apps/web/src/app/api/jobs/[id]/route.ts
- **문제**: Job 모델에 없는 필드들 참조 (requiredExperience, requiredEducation 등)
- **변경사항**: 존재하지 않는 필드들 제거, rawData 필드 추가

### 3. apps/web/src/app/api/jobs/[id]/save/route.ts
- **문제**: snake_case 사용 (user_id_job_id, user_id, job_id)
- **변경사항**: camelCase로 변경 (userId_jobId, userId, jobId)

### 4. apps/web/src/app/api/jobs/[id]/unsave/route.ts
- **문제**: snake_case 사용
- **변경사항**: camelCase로 변경

### 5. apps/web/src/app/api/jobs/saved/route.ts
- **문제**: snake_case 사용, jobs (복수) 대신 job (단수) 사용
- **변경사항**: camelCase로 변경, relation 이름 수정

### 6. apps/web/src/app/api/user/profile/route.ts
- **문제**: User 모델에 없는 accounts 관계 참조
- **변경사항**: accounts 관련 코드 제거, provider를 'credentials'로 하드코딩

### 7. apps/web/src/app/sitemap.ts
- **문제**: Job 모델에 없는 updatedAt 필드 참조
- **변경사항**: updatedAt을 crawledAt으로 변경

### 8. apps/web/src/components/three/HeroBackground.tsx
- **문제**: useRef<number>()에 초기값 없음
- **변경사항**: useRef<number>(0)으로 초기값 추가

### 9. apps/web/src/lib/notifications/email.ts
- **문제**: @rebridge/shared에서 EmailNotification 타입 import 실패
- **변경사항**: 로컬에 interface 정의 추가

### 10. apps/web/src/lib/notifications/queue.ts
- **문제**: NotificationJob 타입에 'job_updated', 'new_job_match' 누락
- **변경사항**: 타입 추가, changes 변수 제거, job 파라미터 타입 명시

### 11. apps/web/src/lib/notifications/scheduler.ts
- **문제**: User 모델에 없는 필드들 참조 (preferredLocation, preferredJobType 등)
- **변경사항**: 해당 기능 전체를 주석 처리

### 12. apps/web/src/lib/redis.ts (마지막 시도)
- **문제**: redis() 함수 호출 오류
- **변경사항**: getRedisClient() 직접 호출로 변경

## 결과
- Work24 크롤러 개선은 완료했으나
- 빌드 오류를 해결하는 과정에서 12개 파일을 수정
- 마지막에 Upstash Redis 오류 발생
- 원래 잘 돌아가던 프로젝트를 망가뜨림

## 교훈
- 개발 모드에서는 타입 체크가 느슨해서 빌드 시 숨어있던 오류들이 나타남
- 하나의 오류를 고치면 다음 오류가 연쇄적으로 나타남
- "이것만 고치면 된다"는 말을 반복했지만 계속 새로운 오류 발생