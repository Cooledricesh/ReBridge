import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const registerSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  name: z.string().optional(),
  isRegisteredDisability: z.boolean().optional().default(false),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    const validatedData = registerSchema.parse(body)
    
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: "이미 존재하는 이메일입니다" },
        { status: 400 }
      )
    }
    
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)
    
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password_hash: hashedPassword,
        is_registered_disability: validatedData.isRegisteredDisability,
      },
      select: {
        id: true,
        email: true,
        is_registered_disability: true,
      }
    })
    
    return NextResponse.json({
      message: "회원가입이 완료되었습니다",
      user
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "회원가입 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}