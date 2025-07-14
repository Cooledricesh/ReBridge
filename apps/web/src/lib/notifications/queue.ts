import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { NotificationJob } from '@rebridge/shared';
import { sendEmail } from './email';
import { prisma } from '@/lib/prisma';

// Redis 연결 설정
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// 알림 큐 생성
export const notificationQueue = new Queue<NotificationJob>('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// 알림 워커
export const notificationWorker = new Worker<NotificationJob>(
  'notifications',
  async (job: Job<NotificationJob>) => {
    const { userId, type, data } = job.data;
    
    console.log(`Processing notification job ${job.id} - Type: ${type} for user: ${userId}`);
    
    try {
      // 사용자 정보 조회
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, isRegisteredDisability: true },
      });
      
      if (!user || !user.email) {
        throw new Error('User not found or email not available');
      }
      
      // 알림 타입별 처리
      switch (type) {
        case 'job_expiring':
          await handleJobExpiringNotification(user.email, data);
          break;
          
        case 'job_updated':
          await handleJobUpdatedNotification(user.email, data);
          break;
          
        case 'new_job_match':
          await handleNewJobMatchNotification(user.email, data);
          break;
          
        default:
          throw new Error(`Unknown notification type: ${type}`);
      }
      
      console.log(`Notification sent successfully for job ${job.id}`);
    } catch (error) {
      console.error(`Error processing notification job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

// 알림 처리 함수들
async function handleJobExpiringNotification(email: string, data: NotificationJob['data']) {
  const { jobTitle, company, expiresAt } = data;
  
  const subject = `[ReBridge] 저장한 채용공고가 곧 마감됩니다`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>채용공고 마감 임박 알림</h2>
      <p>안녕하세요, ReBridge입니다.</p>
      <p>저장하신 채용공고가 곧 마감될 예정입니다:</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0;">${jobTitle}</h3>
        <p style="margin: 5px 0;"><strong>회사:</strong> ${company}</p>
        <p style="margin: 5px 0;"><strong>마감일:</strong> ${new Date(expiresAt!).toLocaleDateString('ko-KR')}</p>
      </div>
      
      <p>지원을 원하신다면 서둘러 확인해주세요!</p>
      
      <div style="margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/jobs/${data.jobId}" 
           style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          공고 확인하기
        </a>
      </div>
      
      <hr style="margin-top: 40px; border: none; border-top: 1px solid #e5e5e5;">
      <p style="color: #666; font-size: 14px;">
        이 메일은 ReBridge에서 발송되었습니다.<br>
        알림 설정은 프로필 페이지에서 변경할 수 있습니다.
      </p>
    </div>
  `;
  
  await sendEmail({ to: email, subject, html });
}

async function handleJobUpdatedNotification(email: string, data: NotificationJob['data']) {
  const { jobTitle, company, changes } = data;
  
  const subject = `[ReBridge] 저장한 채용공고가 수정되었습니다`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>채용공고 수정 알림</h2>
      <p>안녕하세요, ReBridge입니다.</p>
      <p>저장하신 채용공고의 정보가 변경되었습니다:</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0;">${jobTitle}</h3>
        <p style="margin: 5px 0;"><strong>회사:</strong> ${company}</p>
      </div>
      
      <p>변경된 내용을 확인하시려면 아래 버튼을 클릭해주세요.</p>
      
      <div style="margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/jobs/${data.jobId}" 
           style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          공고 확인하기
        </a>
      </div>
      
      <hr style="margin-top: 40px; border: none; border-top: 1px solid #e5e5e5;">
      <p style="color: #666; font-size: 14px;">
        이 메일은 ReBridge에서 발송되었습니다.<br>
        알림 설정은 프로필 페이지에서 변경할 수 있습니다.
      </p>
    </div>
  `;
  
  await sendEmail({ to: email, subject, html });
}

async function handleNewJobMatchNotification(email: string, data: NotificationJob['data']) {
  const { matchedJobs = [] } = data;
  
  if (matchedJobs.length === 0) return;
  
  const subject = `[ReBridge] 관심사와 일치하는 새로운 채용공고 ${matchedJobs.length}건`;
  const jobListHtml = matchedJobs.map(job => `
    <li style="margin-bottom: 15px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/jobs/${job.id}" style="color: #3B82F6; text-decoration: none;">
        <strong>${job.title}</strong>
      </a>
      <br>
      <span style="color: #666;">${job.company}</span>
    </li>
  `).join('');
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>새로운 채용공고 알림</h2>
      <p>안녕하세요, ReBridge입니다.</p>
      <p>회원님의 관심사와 일치하는 새로운 채용공고가 등록되었습니다:</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${jobListHtml}
        </ul>
      </div>
      
      <div style="margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/jobs" 
           style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          전체 공고 보기
        </a>
      </div>
      
      <hr style="margin-top: 40px; border: none; border-top: 1px solid #e5e5e5;">
      <p style="color: #666; font-size: 14px;">
        이 메일은 ReBridge에서 발송되었습니다.<br>
        알림 설정은 프로필 페이지에서 변경할 수 있습니다.
      </p>
    </div>
  `;
  
  await sendEmail({ to: email, subject, html });
}

// 워커 에러 핸들링
notificationWorker.on('completed', (job) => {
  console.log(`Notification job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err);
});