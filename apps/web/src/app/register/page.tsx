'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      name: formData.get('name') as string,
      isRegisteredDisability: formData.get('isRegisteredDisability') === 'on',
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || '회원가입 중 오류가 발생했습니다')
        return
      }

      // 회원가입 성공 후 자동 로그인
      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (signInResult?.error) {
        router.push('/login')
      } else {
        router.push('/jobs')
        router.refresh()
      }
    } catch (error) {
      setError('회원가입 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
          <CardDescription>
            ReBridge 계정을 만들어 맞춤 채용 정보를 받아보세요
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="email@example.com"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="최소 6자 이상"
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">이름 (선택)</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="홍길동"
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isRegisteredDisability" 
                name="isRegisteredDisability"
                disabled={isLoading}
              />
              <Label 
                htmlFor="isRegisteredDisability" 
                className="text-sm font-normal cursor-pointer"
              >
                장애인 등록 여부
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '회원가입 중...' : '회원가입'}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-primary hover:underline">
                로그인
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}