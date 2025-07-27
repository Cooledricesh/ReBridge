import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 크롤러 설정 가져오기 (첫 번째 레코드)
    let config = await prisma.crawlerConfig.findFirst();
    
    // 설정이 없으면 기본값으로 생성
    if (!config) {
      config = await prisma.crawlerConfig.create({
        data: {
          keywords: ['장애인']
        }
      });
    }

    return NextResponse.json({ keywords: config.keywords });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    return NextResponse.json(
      { error: 'Failed to fetch keywords' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keywords } = await request.json();

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords must be a non-empty array' },
        { status: 400 }
      );
    }

    // 크롤러 설정 업데이트 (첫 번째 레코드)
    let config = await prisma.crawlerConfig.findFirst();
    
    if (config) {
      config = await prisma.crawlerConfig.update({
        where: { id: config.id },
        data: { keywords }
      });
    } else {
      config = await prisma.crawlerConfig.create({
        data: { keywords }
      });
    }

    return NextResponse.json({ keywords: config.keywords });
  } catch (error) {
    console.error('Error updating keywords:', error);
    return NextResponse.json(
      { error: 'Failed to update keywords' },
      { status: 500 }
    );
  }
}