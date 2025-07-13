'use client'

import Link from 'next/link'
import { AuthButton } from './auth-button'
import { ThemeToggle } from './theme-toggle'
import { Briefcase } from 'lucide-react'
import { useSession } from 'next-auth/react'

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Briefcase className="h-6 w-6" />
            <span className="text-xl">ReBridge</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/jobs" className="text-sm font-medium transition-colors hover:text-primary">
              채용공고
            </Link>
            {session && (
              <Link href="/saved-jobs" className="text-sm font-medium transition-colors hover:text-primary">
                저장한 공고
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  )
}