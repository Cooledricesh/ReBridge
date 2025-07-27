import cron from 'node-cron';
import { notificationQueue } from './queue';
import { prisma } from '@/lib/prisma';
import { differenceInDays } from 'date-fns';

// 마감 임박 공고 확인 (매일 오전 9시)
export const expiringJobsScheduler = cron.schedule(
  '0 9 * * *',
  async () => {
    console.log('Checking for expiring jobs...');
    
    try {
      // 3일 이내에 마감되는 저장된 공고 조회
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      const expiringJobs = await prisma.userSavedJob.findMany({
        where: {
          job: {
            expiresAt: {
              gte: new Date(),
              lte: threeDaysFromNow,
            },
          },
        },
        include: {
          user: {
            select: { id: true, email: true },
          },
          job: {
            select: {
              id: true,
              title: true,
              company: true,
              expiresAt: true,
            },
          },
        },
      });
      
      // 사용자별로 그룹화
      const userJobsMap = new Map<string, typeof expiringJobs>();
      
      expiringJobs.forEach((savedJob) => {
        const userId = savedJob.user.id;
        if (!userJobsMap.has(userId)) {
          userJobsMap.set(userId, []);
        }
        userJobsMap.get(userId)!.push(savedJob);
      });
      
      // 각 사용자에게 알림 발송
      for (const [userId, userJobs] of userJobsMap) {
        for (const savedJob of userJobs) {
          if (savedJob.job.expiresAt) {
            const daysLeft = differenceInDays(savedJob.job.expiresAt, new Date());
            
            // 3일, 1일 남았을 때만 알림
            if (daysLeft === 3 || daysLeft === 1) {
              await notificationQueue.add('job-expiring', {
                userId,
                type: 'job_expiring',
                data: {
                  jobId: savedJob.job.id,
                  jobTitle: savedJob.job.title,
                  company: savedJob.job.company || '회사 정보 없음',
                  expiresAt: savedJob.job.expiresAt,
                },
              });
            }
          }
        }
      }
      
      console.log(`Queued ${userJobsMap.size} expiring job notifications`);
    } catch (error) {
      console.error('Error checking expiring jobs:', error);
    }
  },
  {
    scheduled: false,
    timezone: 'Asia/Seoul',
  }
);

// 새로운 매칭 공고 확인 (6시간마다)
export const newJobMatchScheduler = cron.schedule(
  '0 */6 * * *',
  async () => {
    console.log('Checking for new job matches...');
    
    try {
      // 사용자 선호도가 설정된 사용자들 조회
      const usersWithPreferences = await prisma.user.findMany({
        where: {
          OR: [
            { preferredLocation: { not: null } },
            { preferredJobType: { not: null } },
            { preferredEmploymentType: { not: null } },
          ],
        },
        select: {
          id: true,
          email: true,
          preferredLocation: true,
          preferredJobType: true,
          preferredEmploymentType: true,
          lastNotificationAt: true,
        },
      });
      
      const sixHoursAgo = new Date();
      sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
      
      for (const user of usersWithPreferences) {
        // 최근에 알림을 보낸 경우 스킵
        if (user.lastNotificationAt && user.lastNotificationAt > sixHoursAgo) {
          continue;
        }
        
        // 사용자 선호도에 맞는 새 공고 조회
        const matchingJobs = await prisma.job.findMany({
          where: {
            AND: [
              { crawledAt: { gte: sixHoursAgo } },
              user.preferredLocation ? {
                OR: [
                  { locationJson: { path: ['address'], string_contains: user.preferredLocation } },
                  { locationJson: { path: ['region'], string_contains: user.preferredLocation } },
                ],
              } : {},
              user.preferredEmploymentType ? {
                employmentType: user.preferredEmploymentType,
              } : {},
            ],
          },
          select: {
            id: true,
            title: true,
            company: true,
          },
          take: 5,
          orderBy: { crawledAt: 'desc' },
        });
        
        if (matchingJobs.length > 0) {
          await notificationQueue.add('new-job-match', {
            userId: user.id,
            type: 'new_job_match',
            data: {
              matchedJobs: matchingJobs.map(job => ({
                id: job.id,
                title: job.title,
                company: job.company || '회사 정보 없음',
              })),
            },
          });
          
          // 마지막 알림 시간 업데이트
          await prisma.user.update({
            where: { id: user.id },
            data: { lastNotificationAt: new Date() },
          });
        }
      }
      
      console.log(`Checked job matches for ${usersWithPreferences.length} users`);
    } catch (error) {
      console.error('Error checking new job matches:', error);
    }
  },
  {
    scheduled: false,
    timezone: 'Asia/Seoul',
  }
);

// 스케줄러 시작/중지 함수
export function startNotificationSchedulers() {
  expiringJobsScheduler.start();
  newJobMatchScheduler.start();
  console.log('Notification schedulers started');
}

export function stopNotificationSchedulers() {
  expiringJobsScheduler.stop();
  newJobMatchScheduler.stop();
  console.log('Notification schedulers stopped');
}