import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');

  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');

    // Test User CRUD
    console.log('📝 Testing User CRUD operations...');
    
    // Create
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'hashed_password_here',
        isRegisteredDisability: false,
      },
    });
    console.log('✅ User created:', user.id);

    // Read
    const foundUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    console.log('✅ User found:', foundUser?.email);

    // Update
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isRegisteredDisability: true },
    });
    console.log('✅ User updated:', updatedUser.isRegisteredDisability);

    // Delete
    await prisma.user.delete({
      where: { id: user.id },
    });
    console.log('✅ User deleted\n');

    // Test Job CRUD
    console.log('📝 Testing Job CRUD operations...');
    
    const job = await prisma.job.create({
      data: {
        source: 'test',
        externalId: `test-${Date.now()}`,
        title: '테스트 채용공고',
        company: '테스트 회사',
        crawledAt: new Date(),
      },
    });
    console.log('✅ Job created:', job.id);

    await prisma.job.delete({
      where: { id: job.id },
    });
    console.log('✅ Job deleted\n');

    console.log('🎉 All database tests passed!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();