import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const savedJobs = await prisma.userSavedJob.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            locationJson: true,
            salaryRange: true,
            employmentType: true,
            source: true,
            isDisabilityFriendly: true,
            crawledAt: true,
            expiresAt: true,
          }
        }
      },
      orderBy: {
        savedAt: 'desc'
      }
    });

    return NextResponse.json(savedJobs);
  } catch (error) {
    console.error('Error fetching saved jobs:', error);
    return NextResponse.json(
      { error: '저장한 공고를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}