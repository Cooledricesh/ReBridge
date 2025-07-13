import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SavedJobsClient from './client'

export default async function SavedJobsPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  return <SavedJobsClient />
}