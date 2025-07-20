# GitHub Actions CI/CD 설정 가이드

## 1. GitHub Secrets 설정

GitHub 리포지토리(https://github.com/Cooledricesh/ReBridge)에서 다음 Secrets를 추가해야 합니다:

### 설정 방법:
1. GitHub 리포지토리로 이동
2. Settings → Secrets and variables → Actions
3. "New repository secret" 클릭
4. 아래 각 Secret 추가

### 필요한 Secrets:

#### 1. SERVER_HOST
- **Name**: `SERVER_HOST`
- **Value**: `rebridge.work` (또는 `192.168.68.100` - 내부 IP 사용 시)

#### 2. SERVER_USER
- **Name**: `SERVER_USER`
- **Value**: `root`

#### 3. SERVER_PORT
- **Name**: `SERVER_PORT`
- **Value**: `22`

#### 4. SERVER_SSH_KEY
- **Name**: `SERVER_SSH_KEY`
- **Value**: (아래 전체 내용 복사)
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACAuE8R1g6ZCacwanspzMHk61ZvxpybeECXdigFoBAgHfAAAAKC4udMnuLnT
JwAAAAtzc2gtZWQyNTUxOQAAACAuE8R1g6ZCacwanspzMHk61ZvxpybeECXdigFoBAgHfA
AAAECbakLl0XA/IyfGhs9uwHEcTzM3M2Jw4hdxyNoZqUC+bC4TxHWDpkJpzBqeynMweTrV
m/GnJt4QJd2KAWgECAd8AAAAF2dpdGh1Yi1hY3Rpb25zQHJlYnJpZGdlAQIDBAUG
-----END OPENSSH PRIVATE KEY-----
```

## 2. 환경 변수 설정 (선택사항)

프로덕션 환경 변수가 필요한 경우, 서버의 `.env.production` 파일을 생성하세요:

```bash
cd ~/project/ReBridge
cp .env.example .env.production
# 필요한 환경 변수 설정
```

## 3. PM2 설정 확인

PM2가 설치되어 있지 않다면:
```bash
npm install -g pm2
```

ecosystem.config.js 파일이 없다면 생성:
```bash
cd ~/project/ReBridge
nano ecosystem.config.js
```

내용:
```javascript
module.exports = {
  apps: [
    {
      name: 'rebridge-web',
      script: 'pnpm',
      args: 'start',
      cwd: './apps/web',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'rebridge-crawler',
      script: 'pnpm',
      args: 'start',
      cwd: './apps/crawler',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

## 4. 작동 확인

1. GitHub에서 main 브랜치에 커밋 푸시
2. Actions 탭에서 워크플로우 실행 확인
3. 배포 완료 후 https://rebridge.work 접속 확인

## 5. 트러블슈팅

### SSH 연결 실패
- SERVER_HOST가 올바른지 확인
- 방화벽에서 SSH 포트(22)가 열려있는지 확인

### PM2 명령 실패
- PM2가 전역 설치되어 있는지 확인: `npm install -g pm2`
- ecosystem.config.js 파일이 존재하는지 확인

### 빌드 실패
- pnpm이 설치되어 있는지 확인
- Node.js 버전이 18 이상인지 확인

## 6. 보안 주의사항

- SSH 키는 절대 공개 저장소에 커밋하지 마세요
- GitHub Secrets는 안전하게 암호화되어 저장됩니다
- 필요시 SSH 키를 정기적으로 교체하세요