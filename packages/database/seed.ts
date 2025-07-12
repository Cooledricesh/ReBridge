import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test user
  const testUser = await prisma.user.create({
    data: {
      email: 'test@rebridge.kr',
      passwordHash: await hash('test123!', 12),
      isRegisteredDisability: true,
    },
  });

  console.log(`✅ Created test user: ${testUser.email}`);

  // Create sample crawl log
  const crawlLog = await prisma.crawlLog.create({
    data: {
      source: 'workTogether',
      status: 'success',
      jobsFound: 0,
      jobsNew: 0,
      jobsUpdated: 0,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  console.log(`✅ Created sample crawl log for source: ${crawlLog.source}`);

  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });