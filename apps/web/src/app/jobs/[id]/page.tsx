import { Metadata } from 'next';
import JobDetailClient from './client';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/jobs/${params.id}`);
    if (!response.ok) throw new Error('Failed to fetch job');
    
    const job = await response.json();
    
    return {
      title: `${job.title} - ${job.company} | ReBridge`,
      description: job.description?.substring(0, 160) || `${job.company}에서 ${job.title} 포지션을 채용 중입니다.`,
      openGraph: {
        title: `${job.title} - ${job.company}`,
        description: job.description?.substring(0, 160),
        type: 'article',
      },
    };
  } catch {
    return {
      title: '채용공고 상세 | ReBridge',
      description: '정신장애인을 위한 채용공고 상세 정보',
    };
  }
}

export default function JobDetailPage({ params }: { params: { id: string } }) {
  return <JobDetailClient params={params} />;
}