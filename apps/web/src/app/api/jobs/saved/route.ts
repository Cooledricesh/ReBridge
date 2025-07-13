import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: '로그인이 필요합니다' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit

  try {
    // 총 개수 조회
    const totalCount = await prisma.userSavedJob.count({
      where: { user_id: session.user.id }
    })

    // 저장된 공고 목록 조회
    const savedJobs = await prisma.userSavedJob.findMany({
      where: { user_id: session.user.id },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            company: true,
            location_json: true,
            salary_range: true,
            employment_type: true,
            description: true,
            is_disability_friendly: true,
            source: true,
            crawled_at: true,
            expires_at: true
          }
        }
      },
      orderBy: { saved_at: 'desc' },
      skip,
      take: limit
    })

    return NextResponse.json({
      data: savedJobs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Get saved jobs error:', error)
    return NextResponse.json(
      { error: '저장 목록 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}