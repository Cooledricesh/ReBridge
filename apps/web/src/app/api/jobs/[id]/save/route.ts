import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: '로그인이 필요합니다' },
      { status: 401 }
    )
  }

  const jobId = params.id

  try {
    // Job이 존재하는지 확인
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      return NextResponse.json(
        { error: '채용공고를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 이미 저장했는지 확인
    const existingSave = await prisma.userSavedJob.findUnique({
      where: {
        user_id_job_id: {
          user_id: session.user.id,
          job_id: jobId
        }
      }
    })

    if (existingSave) {
      return NextResponse.json(
        { error: '이미 저장한 공고입니다' },
        { status: 400 }
      )
    }

    // 저장
    const savedJob = await prisma.userSavedJob.create({
      data: {
        user_id: session.user.id,
        job_id: jobId
      },
      include: {
        jobs: true
      }
    })

    return NextResponse.json({
      message: '채용공고가 저장되었습니다',
      savedJob
    })
  } catch (error) {
    console.error('Save job error:', error)
    return NextResponse.json(
      { error: '저장 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}