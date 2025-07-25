# **ReBridge 프로젝트 분석 보고서**

  

## **전체 프로젝트 아키텍처 개요**

  

ReBridge는 **Next.js 기반 웹 애플리케이션**과 **별도 노드 기반 크롤러 서비스**로 구성된 모노레포 프로젝트입니다. apps/web 디렉터리에 Next.js 14(App Router) 웹 앱이, apps/crawler 디렉터리에 Puppeteer/Playwright를 활용한 크롤러 서비스가 위치합니다 . 공용 로직과 타입은 packages/shared, 데이터베이스 스키마와 Prisma 클라이언트는 packages/database, 그리고 사이트별 크롤링 로직은 packages/crawler-adapters에서 관리됩니다 . 데이터 인프라는 **PostgreSQL**(Neon), **Redis**(Upstash)와 연계되어 있으며, CI/CD는 GitHub Actions 후 **Vercel**(웹 호스팅) 등에 배포되는 구조로 설계되었습니다 .

  

이러한 아키텍처에서 **Next.js 웹앱**은 SSR 기반의 프론트엔드와 API 라우트를 동시에 제공하고, 백엔드에서는 Prisma ORM으로 PostgreSQL 데이터베이스에 접근합니다. **Redis**는 캐싱과 작업 큐 등에 활용되며, **크롤러 서비스**는 일정 주기로 외부 채용 사이트들을 스크래핑하여 데이터를 수집/정규화한 뒤 DB에 저장하고, 필요한 경우 Redis를 통해 웹앱과 상호작용합니다 . 전체 시스템 다이어그램은 아래와 같습니다:

- Next.js 웹앱 (프론트+API) ↔ **Prisma ORM** ↔ PostgreSQL (채용공고/회원정보 저장)
    
- Next.js 웹앱 ↔ **Redis** (캐싱/큐)
    
- **크롤러 매니저** (Node) ↔ PostgreSQL/Redis (크롤링 결과 저장 및 로그 기록)
    

  

요약하면, ReBridge는 **모노레포**로 웹 프론트엔드와 백엔드(API), 그리고 주기적 크롤러가 한 프로젝트 내에서 모듈화되어 동작하는 구조입니다. Next.js 15.1 + React 19 기반의 웹 인터페이스와, Playwright/Puppeteer로 구현된 크롤러, 그리고 PostgreSQL/Redis로 구성된 **단순 3티어 아키텍처**를 채택하여 MVP를 구축하였습니다 .

  

## **PRD 기반 기능 구현 현황**

  

제품 요구사항 문서(PRD)에서 정의한 **MVP 주요 기능**과 현재 코드 구현 상태를 비교하면 다음과 같습니다 . PRD에 명시된 기능들이 실제 코드에 얼마나 반영되었는지 표로 정리했습니다:

|**기능명 (****_PRD 정의_****)**|**PRD 요구 사항 상세**|**구현 여부 및 내용**|
|---|---|---|
|**통합 채용 피드**_(주요 4개 채용 채널 통합)_|워크투게더, 고용24, 사람인, 잡코리아의 장애인 채용공고를 매일 수집하여 최신순 목록 제공. 지역·고용형태 등 **필터**와 검색어로 결과를 제한하고, 공고 **상세정보 열람** 가능.|**구현 완료:** 4개 소스별 크롤러 어댑터가 존재하며, 6시간마다 최신 공고를 수집해 DB에 누적 . Next.js 웹앱의 /jobs 페이지에서 모든 공고를 최신순으로 표시하고, 검색어 및 **사이트(source), 고용형태, 지역** 필터를 Querystring으로 제공하여 결과를 필터링함 . 각 공고 항목을 클릭하면 상세 페이지(/jobs/[id])에서 공고 세부내용을 보여주며, 관련 공고 추천도 구현됨.|
|**간단 사용자 프로필**_(경량 회원가입/로그인)_|이메일과 비밀번호로 회원 가입 및 로그인. 프로필 정보로 **장애인 등록 여부**만 추가로 받고, 해당 필드를 이용해 맞춤 정보 제공. 로그인 상태에서 **관심 공고 저장** 및 알림 설정 관리.|**구현 완료 (일부 보완 필요):** NextAuth를 통한 **이메일/비밀번호 기반 인증**이 동작하며, 사용자는 회원가입 시 이메일, 비밀번호, 이름(선택사항), 장애인 등록 여부를 입력할 수 있음 . Prisma User 스키마에도 is_registered_disability 필드가 포함되어 저장됨 . 회원가입 후 곧바로 자동 로그인되며 세션 유지에 JWT를 사용 . **카카오 OAuth 로그인**은 PRD에는 명시됐으나(Kakao 소셜 로그인) , 현재 코드에는 CredentialsProvider만 설정되어 있어 미구현된 상태입니다 . 프로필 편집 UI는 최소한으로 (혹은 향후 구현 예정)이며, 로그인된 사용자는 저장한 공고 목록 등을 볼 수 있습니다 (※ /saved 페이지 구현은 추후 과제로 남은 것으로 추정).|
|**기본 알림 기능**_(관심 공고 변화 알림)_|사용자가 관심(**저장**)한 채용공고의 **상태 변화**(공고 마감 또는 수정) 발생 시 알림을 전송. 또한 사용자가 관심 가질만한 **신규 공고 알림**도 제공. 알림 수단은 이메일 및 푸시.|**부분 구현:** 사용자는 공고 리스트나 상세 페이지에서 하트(♡) 버튼을 눌러 **공고 저장/해제**를 할 수 있으며, 이는 백엔드 API(/api/jobs/[id]/save, /api/jobs/[id]/unsave)를 통해 DB의 user_saved_jobs 테이블에 반영됩니다 . 그러나 **알림 전송 로직은 현재 미구현**입니다. PRD에서 제시된 BullMQ 워커를 통한 이메일 알림 예시 나 Redis 스트림을 활용한 알림 큐 설계 에 대응하는 코드가 없어서, 저장한 공고의 마감 알림이나 신규 공고 매칭 알림은 아직 동작하지 않습니다. 향후 notification:queue Redis 큐와 Worker를 만들어 PRD의 알림 시나리오를 구현해야 합니다.|
|**기타 구현 사항**|–|**(추가)** PRD의 기타 요구사항도 대체로 반영되었습니다. 예를 들어 **검색 기능**(제목/회사명 키워드 검색)과 **필터** 기능은 구현되어 있고, 채용공고 **정렬 옵션**(최신순/마감임박순/인기순)도 지원됩니다 . 공고 **조회수 집계**를 위해 viewCount 필드를 두고 상세 페이지 열람 시 1 증가 처리하여 인기순 정렬에 활용 . 또한 **접근성** 향상을 위해 스크린리더용 콘텐츠, 다크모드 지원 등이 UI에 반영됐으며, **반응형 디자인**으로 모바일~데스크톱 환경을 모두 대응합니다.|

**요약:** 통합 채용정보 수집/검색, 회원 가입·로그인 및 관심 공고 저장 기능은 요구사항에 맞게 구현되어 **MVP 기능을 충족**합니다. 다만 **소셜 로그인 미지원**, **알림 미동작** 등의 세부 사항은 PRD 대비 누락되어 있어 추후 보완이 필요합니다. 그 외에는 데이터베이스 스키마도 PRD 설계대로 users, jobs, user_saved_jobs, crawl_logs의 핵심 4개 테이블이 모두 존재하며 , Prisma 마이그레이션으로 인덱스/제약조건(예: UNIQUE(source, external_id)로 공고 중복 방지 등)도 적용되어 있습니다 . 전반적으로 핵심 기능 구현은 PRD의 MVP 요구사항 범위 내에서 **완성도 높게 이루어져 있으며**, 일부 예정된 고도화 기능(AI 매칭, 커뮤니티 등)은 Phase 2로 미뤄진 상태입니다 .

  

## **서버 빌드 후 미작동 원인 분석 및 제안**

  

사용자가 npm run build (프로덕션 빌드) 수행 후 서버가 시작되지 않는 문제를 겪고 있다면, **원인은 배포 스크립트나 환경설정의 미흡**으로 추정됩니다. 분석 결과, 다음 몇 가지 가능성을 확인했습니다:

- **시작 스크립트 호출 문제:** ReBridge는 Turborepo 모노레포로 구성되어 있어, 루트 package.json에는 build와 dev 스크립트만 정의돼 있고 start 스크립트는 없습니다 . 따라서 npm run build로 빌드한 후에 바로 npm start를 해도 아무 동작을 하지 않습니다. 웹 서버를 실행하려면 **웹 앱 패키지**의 start 스크립트를 호출해야 합니다. 예를 들어 pnpm start --filter @rebridge/web 명령을 통해 apps/web 내 Next.js 앱을 실행해야 합니다. apps/web/package.json을 보면 start: "next start"로 정의되어 있어, 빌드된 Next 애플리케이션을 이 방식으로 구동하게 됩니다 . 요컨대, **루트에서 서버를 시작하려 한 것이 문제**일 수 있으며, 올바른 명령으로 웹 앱을 시작해야 합니다. (또는 Vercel 등 배포환경에서는 자동으로 npm run build 후 npm start에 해당하는 동작을 패키지별로 해주지 않으므로, 설정이 필요합니다.)
    
- **환경 변수 미설정:** 프로덕션 모드에서 필요한 **환경 변수(.env)**가 설정되지 않아 발생하는 오류 가능성도 있습니다. 예를 들어 NextAuth 인증에는 NEXTAUTH_URL (서비스 URL)과 NEXTAUTH_SECRET (서명용 비밀키)이 환경 변수로 반드시 설정돼야 합니다 . PRD 부록의 보안 체크리스트에서도 NEXTAUTH_SECRET를 강력한 값으로 설정하고 실제 도메인의 NEXTAUTH_URL을 지정할 것을 강조합니다 . 만약 이를 설정하지 않고 빌드/실행하면 JWT 토큰 서명 관련 오류로 서버가 즉시 종료되거나, 인증 세션 유지가 되지 않는 문제가 생길 수 있습니다. 또 데이터베이스 연결 문자열(DATABASE_URL)이나 Redis URL(REDIS_URL)도 .env에 없으면 Prisma 클라이언트나 ioredis 초기화에서 예외가 발생할 수 있습니다 . 개발 모드(pnpm dev)에서는 .env를 못 찾더라도 큰 문제 없이 뜰 수 있지만, 프로덕션 빌드(next start)에선 이러한 필드가 없으면 실패할 여지가 크므로 **환경 변수를 모두 정확히 설정**해야 합니다.
    
- **빌드 결과 경로 및 배포 설정:** Next.js 15 버전으로 빌드된 산출물이 .next/ 디렉터리에 생성되는데, 이를 제대로 참조하여 시작하고 있는지도 확인해야 합니다. 일반적으로 next start는 .next 폴더를 자동 인식하나, Turborepo 환경에서 경로가 달라지지 않았는지 확인이 필요합니다. 현재 turbo.json 설정상 빌드 출력 경로가 커스터마이징되어 있진 않은 것으로 보입니다 (Next.js 기본값 사용). 그러므로 pnpm build → pnpm start --filter @rebridge/web 절차만 지키면 실행되어야 합니다.
    
- **기타 잠재적 이슈:** next.config.ts 설정을 점검한 결과, 빌드에 영향 줄만한 특이값은 없었습니다. ESLint 오류 무시 설정과 외부 이미지 도메인 허용 정도만 있고 , webpack 또는 output 관련 커스텀은 없습니다. 따라서 빌드 자체는 정상적으로 완료될 가능성이 높고, 문제는 **실행 단계**에 국한됩니다. Prisma 마이그레이션이 반영되지 않은 상태에서 서버를 켰다면 DB 스키마 불일치 오류가 날 수 있으나, 문의 맥락상 빌드는 성공하고 “서버 시작이 안 된다”는 것이므로, 이는 아닐 것으로 보입니다. 그래도 안전을 위해 프로덕션 빌드 전에 pnpm db:migrate로 최신 마이그레이션을 적용했는지 확인이 필요합니다.
    

  

**해결 제안:**

1. **올바른 서버 시작 명령 사용:** 빌드 후에는 루트에서가 아니라 웹 앱 패키지 컨텍스트에서 Next.js를 시작해야 합니다. 예를 들어 프로젝트 루트에서 pnpm run dev로 개발 서버를 켤 때는 터보레포가 둘 다 돌렸지만, 프로덕션에선 pnpm build 후 pnpm start -F @rebridge/web로 웹만 기동해야 합니다. 이를 package.json이나 배포 스크립트에 반영하십시오.
    
2. **환경 변수 설정:** .env.production 또는 적절한 환경 변수로 NEXTAUTH_URL, NEXTAUTH_SECRET, DATABASE_URL, REDIS_URL 등을 설정하세요 . 특히 NextAuth secret 미설정 시 **서버가 바로 종료**되므로 유의해야 합니다. 또한 Vercel에 배포한다면 해당 환경변수를 Vercel 설정에 추가하고, 자기 도메인으로 NEXTAUTH_URL을 지정해야 로그인 콜백 등이 올바르게 작동합니다.
    
3. **로그 확인:** 로컬에서 pnpm start --filter @rebridge/web를 실행하며 터미널 로그나 Vercel 로그를 확인하면 어떤 에러로 종료되는지 원인을 알 수 있습니다. 상기한 환경변수 미비라면 관련 메시지가 떴을 것이고, DB 연결 문제라면 Prisma에서 오류를 뱉었을 것입니다. 그 구체적인 에러 로그를 기준으로 추가 조치를 취하면 됩니다.
    

  

이상의 조치를 취하면, 빌드 후 서버가 정상적으로 기동되어 기능 테스트를 진행할 수 있을 것으로 판단됩니다.

  

## **웹 크롤링 기능 구현 상태 및 실행 가능성 평가**

  

ReBridge의 **크롤러 기능**은 별도 Node.js 서비스(apps/crawler)로 구현되어 있으며, **주기적 자동 실행과 병렬 수집** 메커니즘을 갖추고 있습니다. 구성 및 동작 방식은 다음과 같습니다:

- **크롤러 구성 요소:** 크롤러 서비스는 **CrawlerManager** 클래스를 중심으로, 네 가지 채용 소스별 어댑터 (WorkTogetherAdapter, Work24Adapter, SaraminAdapter, JobKoreaAdapter)를 초기화합니다 . 각각의 어댑터는 CrawlerAdapter 인터페이스(소스 식별자, crawl(page) 메서드로 목록 수집, parseJobDetail(id)로 상세 파싱, normalizeData로 구조화)를 구현합니다 . PRD에서 정의된 바처럼 WorkTogether/고용24/잡코리아 등은 실제 웹 렌더링이 필요한 동적 페이지로 Playwright(Chromium headless)를 사용하고, 사람인(Saramin)은 검색 파라미터를 이용하는 방식 등으로 어댑터별 최적 로직을 사용합니다 .
    
- **스케줄러 및 병렬 처리:** Node-Cron을 이용해 **6시간마다** 크롤 작업을 트리거하며 , BullMQ 큐를 사용해 네 개 소스의 크롤 작업을 **동시에** 처리합니다(큐 이름 'crawl-jobs', **동시 워커 4개** 설정) . 한 주기에 모든 소스의 첫 페이지를 수집하고, 추가로 필요하면 페이지를 넘겨가며 크롤합니다. 각 워커는 Playwright를 통해 해당 사이트에 HTTP 요청을 보내고 DOM을 로딩한 뒤, Cheerio로 HTML 파싱하여 채용공고 목록을 추출합니다. 그 후 각 공고의 상세정보도 parseJobDetail을 통해 필요시 가져오도록 구성돼 있습니다 . 크롤 완료 후 **크롤링 로그(crawl_logs 테이블)**에 수집된 개수, 신규/업데이트 수량, 에러 여부 등을 기록합니다 .
    
- **데이터 정규화 및 중복 처리:** 수집한 Raw 데이터는 어댑터별 normalizeData에서 통일된 Job 엔터티로 변환되며, Prisma를 통해 PostgreSQL jobs 테이블에 저장됩니다. 이때 PRD에 명시된 대로 (source, external_id) 복합 고유키로 **중복 공고 방지**를 하고 있어, 이미 있는 공고는 job.update로 필드들을 갱신하고 새로운 공고만 job.create로 추가하게 됩니다 . 또 마감일(expiresAt)이나 장애인채용 여부 등의 필드도 파싱하여 저장하며, 누락 데이터는 가능한 한 채워 넣도록 (e.g., 급여 정보 파싱) 시도합니다. 저장 후에는 **캐시 갱신**을 위해 Redis의 최신 공고 리스트(jobs:latest 키 등)를 갱신/무효화하여 웹에서 즉시 새로운 공고를 볼 수 있게 합니다 .
    
- **레이트리밋 및 안정성:** 크롤러는 **사이트별 요청 간격**과 **재시도 전략**을 설정하여 운영됩니다. 예를 들어 CRAWL_CONFIG에 workTogether=3초, work24=5초 등의 딜레이가 정의되어 있고 , 각 요청 후 sleep()으로 대기합니다. 실패 시 최대 3회까지 **지수 백오프**(1초→2초→4초)로 재시도하도록 구현되었습니다 . 또한 User-Agent를 ReBridge-Crawler/1.0으로 지정하고 robots.txt 준수를 명시 하는 등, 크롤링으로 인한 차단이나 법적 문제를 최소화하려는 설정이 돋보입니다.
    
- **모니터링 및 알림:** 크롤러에는 간단한 **모니터링 로직**도 포함되어 있습니다. CrawlerMonitoring 클래스가 크롤 로그를 주기적으로 검사하여 최근 크롤 성공률이나 소요시간을 체크하고, 실패율이 기준치 이상이면 슬랙/메일 알림을 보낸다는 설계가 PRD에 있습니다 . 현재 코드에도 crawlerMonitoring.checkAndAlert()를 1시간마다 호출하는 부분이 있으나 , 구체적인 알림 전송 구현은 Placehoder 수준입니다. 추후 이 부분을 확장하여 운영 관점에서 크롤러 상태를 추적할 수 있습니다.
    

  

**실행 가능성 평가:** 현 시점의 구현으로 판단할 때, **ReBridge 크롤러 기능은 대부분 완성되어 있으며 정상 동작 가능**합니다. 크롤러 서비스용 package.json에는 dev, build, start 스크립트가 정의돼 있어 개발모드와 프로덕션모드 실행 방법도 명확합니다 . README에도 크롤러 실행 절차가 별도로 안내돼 있는데, .env에 데이터베이스와 Redis 연결 정보를 넣은 후 pnpm crawl 또는 pnpm start로 크롤러를 실행하면 된다고 설명합니다 . Playwright와 Puppeteer 의존성도 이미 포함돼 있어 , 첫 설치 시 브라우저 드라이버 세팅만 완료되면 (Playwright는 설치 시 자동으로 headless chromium을 받습니다) 로컬/서버 어디서든 구동될 것입니다. 다만 **리소스 사용량**에 유의해야 합니다. Headless 브라우저를 동시 4개까지 띄우도록 되어 있으므로 CPU 및 메모리 사용이 높을 수 있으며, Docker 컨테이너로 운용 시에는 적절한 베이스 이미지 세팅과 –no-sandbox 옵션 등이 이미 적용돼 있습니다 .

  

현재 구현된 크롤러가 6시간 간격으로 돌아가면, 하루 최대 4회 새로운 공고를 수집합니다. 이는 PRD 목표(“매일 자동 수집”)에 부합합니다 . 각 사이트별로 1페이지씩 수집하도록 설정돼 있는데(더 깊은 페이지 크롤링 로직은 필요 시 확장 가능), MVP 단계에서는 최신 공고 위주로 보는 것이므로 문제 없습니다. 수집된 데이터는 즉시 웹에 노출되며, Redis 캐시로 조회 속도도 향상시키고 있습니다. 크롤러가 수집한 공고 데이터에 대해 **장애인 채용 여부 필터링**도 잘 적용되어 있는데, 예를 들어 WorkTogether나 고용24 등 자체적으로 장애인 공고만 조회하거나 제목에 ‘[장애인]’ 키워드가 포함된 공고만 선별하는 식으로 구현했습니다 .

  

결론적으로, **ReBridge의 웹 크롤링 기능은 설계대로 구현되어 있으며 현재 상태에서도 실행에 무리가 없습니다.** 실제 운영 시에 필요한 DB/Redis 등 인프라만 갖춰지면, 크롤러 서비스를 가동하여 실시간 채용정보 수집이 가능할 것으로 보입니다. 추후 알림 기능 연계를 위해, 크롤링한 데이터 중 **사용자 관심공고와 매칭**되는 변화가 있으면 앞서 언급한 알림 큐에 작업을 넣는 로직을 추가 구현하면 될 것입니다. 전반적으로 크롤러는 안정성 (재시도, 지연), 효율(병렬 처리, 캐싱), 확장성(어댑터 추가) 측면에서 **MVP 요구사항을 충족**하며, 실 환경에서도 정상 동작할 것으로 평가됩니다.

  

**참고 자료:** 주요 기능 및 아키텍처는 PRD 문서  에, DB/스키마 및 구현 세부는 코드와 마이그레이션 파일  등에 근거하였습니다. 이상으로 ReBridge 프로젝트에 대한 분석을 마칩니다.