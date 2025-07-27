import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// GET: 프로필 정보 조회
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        isRegisteredDisability: true,
        createdAt: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...user,
      provider: 'credentials', // Always credentials since no OAuth in schema
      name: session.user.name || '',
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: '프로필 정보를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

// PATCH: 프로필 정보 수정
const updateProfileSchema = z.object({
  name: z.string().optional(),
  isRegisteredDisability: z.boolean().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = updateProfileSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        passwordHash: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 비밀번호 변경 요청인 경우
    if (validatedData.newPassword) {
      if (!validatedData.currentPassword) {
        return NextResponse.json(
          { error: '현재 비밀번호를 입력해주세요.' },
          { status: 400 }
        );
      }

      // OAuth 로그인 사용자는 비밀번호 변경 불가
      if (!user.passwordHash) {
        return NextResponse.json(
          { error: '소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.' },
          { status: 400 }
        );
      }

      // 현재 비밀번호 확인
      const isValidPassword = await bcrypt.compare(
        validatedData.currentPassword,
        user.passwordHash
      );

      if (!isValidPassword) {
        return NextResponse.json(
          { error: '현재 비밀번호가 올바르지 않습니다.' },
          { status: 400 }
        );
      }

      // 새 비밀번호 해시
      const hashedPassword = await bcrypt.hash(validatedData.newPassword, 12);
      
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          passwordHash: hashedPassword,
        }
      });
    }

    // 기타 정보 업데이트
    const updateData: any = {};
    if (validatedData.isRegisteredDisability !== undefined) {
      updateData.isRegisteredDisability = validatedData.isRegisteredDisability;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
      });
    }

    return NextResponse.json({
      message: '프로필이 업데이트되었습니다.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: '프로필 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  }
}
