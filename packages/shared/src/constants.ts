export const CRAWL_CONFIG = {
  // Request delays in seconds
  REQUEST_DELAY: {
    workTogether: 3,
    work24: 5,
    saramin: 2,
    jobkorea: 4,
  },
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_BACKOFF: [1000, 2000, 4000], // milliseconds
  
  // Concurrency
  MAX_CONCURRENT_REQUESTS: 4,
  
  // Cron schedules
  CRON_SCHEDULE: '0 */6 * * *', // Every 6 hours
  
  // User agent
  USER_AGENT: 'ReBridge-Crawler/1.0 (+https://rebridge.kr/about)',
} as const;

export const REDIS_KEYS = {
  JOBS_LATEST: 'jobs:latest',
  JOBS_CACHE_PREFIX: 'jobs:cache:',
  CRAWL_LOCK_PREFIX: 'crawl:lock:',
  NOTIFICATION_QUEUE: 'notification:queue',
} as const;

export const JOB_SOURCES = {
  WORK_TOGETHER: 'workTogether',
  WORK24: 'work24',
  SARAMIN: 'saramin',
  JOBKOREA: 'jobkorea',
} as const;