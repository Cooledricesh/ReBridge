import cron from 'node-cron';
import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { CrawlerManager } from './crawler-manager';
import { CrawlerMonitoring } from './monitoring';
import { CRAWL_CONFIG, REDIS_KEYS } from '@rebridge/shared';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
const crawlerManager = new CrawlerManager(redis);
const crawlerMonitoring = new CrawlerMonitoring(redis);

// Create separate Redis connections for BullMQ
const queueConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const workerConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// BullMQ setup
const crawlQueue = new Queue('crawl-jobs', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: CRAWL_CONFIG.MAX_RETRIES,
    backoff: {
      type: 'exponential',
      delay: CRAWL_CONFIG.RETRY_BACKOFF[0],
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

const queueEvents = new QueueEvents('crawl-jobs', {
  connection: new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }),
});

// Worker setup
const crawlWorker = new Worker(
  'crawl-jobs',
  async (job) => {
    const { source, page } = job.data;
    console.log(`Processing crawl job for ${source}, page ${page}`);
    
    try {
      const result = await crawlerManager.crawlSource(source, page);
      console.log(`Crawl completed for ${source}: ${result.jobsFound} jobs found, ${result.jobsNew} new`);
      
      // Check for immediate alerts after crawl
      if (result.error) {
        const alerts = await crawlerMonitoring.checkAndAlert();
        if (alerts.length > 0) {
          console.warn(`⚠️ Monitoring alerts detected after ${source} crawl failure`);
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Crawl failed for ${source}:`, error);
      throw error;
    }
  },
  {
    connection: workerConnection,
    concurrency: CRAWL_CONFIG.MAX_CONCURRENT_REQUESTS,
  }
);

// Error handling
crawlWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed with result:`, returnvalue);
});

// Schedule crawl jobs
async function scheduleCrawls() {
  console.log('Scheduling crawl jobs...');
  
  // Add initial crawl jobs
  await crawlQueue.add('crawl-saramin', { source: 'saramin', page: 1 });
  await crawlQueue.add('crawl-work24', { source: 'work24', page: 1 });
  await crawlQueue.add('crawl-jobkorea', { source: 'jobkorea', page: 1 });
  
  // Schedule recurring crawls
  cron.schedule(CRAWL_CONFIG.CRON_SCHEDULE, async () => {
    console.log('Running scheduled crawl...');
    await crawlQueue.add('crawl-saramin', { source: 'saramin', page: 1 });
    await crawlQueue.add('crawl-work24', { source: 'work24', page: 1 });
    await crawlQueue.add('crawl-jobkorea', { source: 'jobkorea', page: 1 });
  });
  
  console.log(`Crawl jobs scheduled with cron: ${CRAWL_CONFIG.CRON_SCHEDULE}`);
  
  // Schedule monitoring checks every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running monitoring check...');
    try {
      const alerts = await crawlerMonitoring.checkAndAlert();
      if (alerts.length > 0) {
        console.log(`Found ${alerts.length} monitoring alerts`);
      }
    } catch (error) {
      console.error('Monitoring check failed:', error);
    }
  });
  
  console.log('Monitoring scheduled to run every hour');
}

// Initialize and start
async function start() {
  console.log('🚀 Crawler service starting...');
  
  try {
    await crawlerManager.initialize();
    await scheduleCrawls();
    console.log('✅ Crawler service started successfully');
  } catch (error) {
    console.error('❌ Failed to start crawler service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('🛑 Shutting down crawler service...');
  
  try {
    await crawlQueue.close();
    await crawlWorker.close();
    await queueEvents.close();
    await crawlerManager.cleanup();
    await redis.quit();
    console.log('✅ Crawler service shut down gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the service
start();