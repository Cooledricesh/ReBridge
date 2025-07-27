import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
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
    // 저장된 공고인지 확인
    const savedJob = await prisma.userSavedJob.findUnique({
      where: {
        userId_jobId: {
          userId: session.user.id,
          jobId: jobId
        }
      }
    })

    if (!savedJob) {
      return NextResponse.json(
        { error: '저장하지 않은 공고입니다' },
        { status: 404 }
      )
    }

    // 저장 해제
    await prisma.userSavedJob.delete({
      where: {
        userId_jobId: {
          userId: session.user.id,
          jobId: jobId
        }
      }
    })

    return NextResponse.json({
      message: '채용공고 저장이 해제되었습니다'
    })
  } catch (error) {
    console.error('Unsave job error:', error)
    return NextResponse.json(
      { error: '저장 해제 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}