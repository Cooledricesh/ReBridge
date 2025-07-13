'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays, Building2, MapPin, Briefcase, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { SaveJobButton } from '@/components/save-job-button'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface SavedJob {
  user_id: string
  job_id: string
  saved_at: string
  jobs: {
    id: string
    title: string
    company: string | null
    location_json: any
    salary_range: any
    employment_type: string | null
    description: string | null
    is_disability_friendly: boolean
    source: string
    crawled_at: string
    expires_at: string | null
  }
}

const sourceNames: Record<string, string> = {
  WORKTOGETHER: '워크투게더',
  SARAMIN: '사람인',
  WORK24: '고용24',
  JOBKOREA: '잡코리아'
}

const sourceColors: Record<string, string> = {
  WORKTOGETHER: 'default',
  SARAMIN: 'secondary',
  WORK24: 'outline',
  JOBKOREA: 'destructive'
}

export default function SavedJobsClient() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchSavedJobs()
  }, [page])

  const fetchSavedJobs = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/jobs/saved?page=${page}&limit=20`)
      const data = await response.json()

      if (response.ok) {
        setSavedJobs(data.data)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Failed to fetch saved jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnsave = (jobId: string) => {
    setSavedJobs(prev => prev.filter(item => item.job_id !== jobId))
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">저장한 채용공고</h1>
          <p className="text-muted-foreground mt-2">
            관심있는 채용공고를 저장하고 관리하세요
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">저장한 채용공고</h1>
        <p className="text-muted-foreground mt-2">
          관심있는 채용공고를 저장하고 관리하세요
        </p>
      </div>

      {savedJobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">저장한 채용공고가 없습니다</p>
            <p className="text-muted-foreground mb-4">
              관심있는 채용공고를 저장해보세요
            </p>
            <Button asChild>
              <Link href="/jobs">채용공고 둘러보기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {savedJobs.map(({ jobs: job, saved_at }) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">
                        <Link href={`/jobs/${job.id}`} className="hover:underline">
                          {job.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <div className="flex flex-wrap gap-4 text-sm">
                          {job.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {job.company}
                            </span>
                          )}
                          {job.location_json && typeof job.location_json === 'object' && 
                           'address' in job.location_json && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {(job.location_json as any).address}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            저장일: {format(new Date(saved_at), 'yyyy.MM.dd', { locale: ko })}
                          </span>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={sourceColors[job.source] as any}>
                        {sourceNames[job.source] || job.source}
                      </Badge>
                      {job.is_disability_friendly && (
                        <Badge variant="outline">장애인 우대</Badge>
                      )}
                      <SaveJobButton 
                        jobId={job.id}
                        initialSaved={true}
                        size="icon"
                        variant="ghost"
                      />
                    </div>
                  </div>
                </CardHeader>
                {job.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {job.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                이전
              </Button>
              <span className="px-4 text-sm">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}