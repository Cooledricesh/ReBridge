const { Worker, Queue } = require('bullmq');
const Redis = require('ioredis');

async function testCrawler() {
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null
  });

  const crawlQueue = new Queue('crawl', { connection: redis });

  console.log('Adding test crawl jobs...');
  
  // Add jobs for each source
  const sources = ['saramin', 'work24', 'jobkorea'];
  
  for (const source of sources) {
    await crawlQueue.add(`crawl-${source}`, {
      source,
      page: 1
    });
    console.log(`Added crawl job for ${source}`);
  }

  console.log('Test crawl jobs added successfully!');
  
  // Check queue status
  const waiting = await crawlQueue.getWaitingCount();
  const active = await crawlQueue.getActiveCount();
  const completed = await crawlQueue.getCompletedCount();
  const failed = await crawlQueue.getFailedCount();
  
  console.log(`\nQueue Status:`);
  console.log(`- Waiting: ${waiting}`);
  console.log(`- Active: ${active}`);
  console.log(`- Completed: ${completed}`);
  console.log(`- Failed: ${failed}`);
  
  await redis.quit();
}

testCrawler().catch(console.error);