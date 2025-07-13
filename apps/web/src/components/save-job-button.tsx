'use client'

import { useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Heart, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface SaveJobButtonProps {
  jobId: string
  initialSaved?: boolean
  size?: 'sm' | 'default' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'ghost'
  className?: string
}

export function SaveJobButton({
  jobId,
  initialSaved = false,
  size = 'default',
  variant = 'outline',
  className
}: SaveJobButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isSaved, setIsSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  const handleSaveToggle = async () => {
    if (!session) {
      toast.error('로그인이 필요합니다')
      router.push('/login')
      return
    }

    startTransition(async () => {
      try {
        const endpoint = isSaved 
          ? `/api/jobs/${jobId}/unsave`
          : `/api/jobs/${jobId}/save`
        
        const method = isSaved ? 'DELETE' : 'POST'
        
        const response = await fetch(endpoint, { method })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '오류가 발생했습니다')
        }

        setIsSaved(!isSaved)
        toast.success(isSaved ? '저장이 해제되었습니다' : '공고가 저장되었습니다')
      } catch (error) {
        console.error('Save toggle error:', error)
        toast.error(error instanceof Error ? error.message : '오류가 발생했습니다')
      }
    })
  }

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleSaveToggle}
      disabled={isPending}
      className={cn(
        'transition-colors',
        isSaved && 'text-red-600 hover:text-red-700',
        className
      )}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart 
          className={cn(
            'h-4 w-4',
            size === 'icon' && 'h-5 w-5',
            isSaved && 'fill-current'
          )}
        />
      )}
      {size !== 'icon' && (
        <span className="ml-2">
          {isSaved ? '저장됨' : '저장'}
        </span>
      )}
    </Button>
  )
}