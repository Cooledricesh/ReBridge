'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'

export function AuthButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground flex items-center gap-2">
          <User className="h-4 w-4" />
          {session.user?.email}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          로그아웃
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/login">로그인</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/register">회원가입</Link>
      </Button>
    </div>
  )
}