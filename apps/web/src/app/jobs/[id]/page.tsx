import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JobDetailClient from './client';
import { prisma } from '@rebridge/database';
import { redis } from '@/lib/redis';
import { measurePerformance } from '@/lib/monitoring';

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(props: JobDetailPageProps): Promise<Metadata> {
  const params = await props.params;
  
  try {
    // Try to get from cache first
    const cacheKey = `job:${params.id}`;
    const cached = await redis().get(cacheKey);
    const job = cached ? JSON.parse(cached as string) : await prisma.job.findUnique({
      where: { id: params.id }
    });
    
    if (!job) {
      return {
        title: '채용공고를 찾을 수 없습니다 | ReBridge',
        description: '요청하신 채용공고를 찾을 수 없습니다.',
      };
    }
    
    return {
      title: `${job.title} - ${job.company || '회사명 미정'} | ReBridge`,
      description: job.description?.substring(0, 160) || `${job.company || '회사'}에서 ${job.title} 포지션을 채용 중입니다.`,
      openGraph: {
        title: `${job.title} - ${job.company || '회사명 미정'}`,
        description: job.description?.substring(0, 160),
        type: 'article',
        publishedTime: job.crawledAt,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${job.title} - ${job.company || '회사명 미정'}`,
        description: job.description?.substring(0, 160),
      }
    };
  } catch {
    return {
      title: '채용공고 상세 | ReBridge',
      description: '정신장애인을 위한 채용공고 상세 정보',
    };
  }
}

export default async function JobDetailPage(props: JobDetailPageProps) {
  const params = await props.params;
  const performance = measurePerformance('/jobs/[id]');
  
  try {
    // Check cache first
    const cacheKey = `job:${params.id}`;
    const cached = await redis().get(cacheKey);
    
    let job;
    if (cached) {
      performance.recordCacheHit();
      job = JSON.parse(cached as string);
    } else {
      // Fetch from database
      job = await prisma.job.findUnique({
        where: { id: params.id }
      });
      
      if (!job) {
        notFound();
      }
      
      // Note: viewCount field doesn't exist in current schema
      // If you want to track views, you'll need to add this field to the schema
      
      // Cache for 1 hour
      await redis().setex(cacheKey, 3600, JSON.stringify(job));
      performance.recordCacheMiss();
    }
    
    // Get related jobs
    const relatedJobs = await prisma.job.findMany({
      where: {
        AND: [
          { id: { not: params.id } },
          {
            OR: [
              { company: job.company },
              { employmentType: job.employmentType }
            ]
          }
        ]
      },
      take: 5,
      orderBy: { crawledAt: 'desc' },
      select: {
        id: true,
        title: true,
        company: true,
        locationJson: true,
        employmentType: true,
        salaryRange: true,
        source: true,
        expiresAt: true,
        isDisabilityFriendly: true
      }
    });
    
    // Generate structured data for SEO
    const locationData = job.locationJson as any;
    const salaryData = job.salaryRange as any;
    
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: job.title,
      description: job.description,
      identifier: {
        '@type': 'PropertyValue',
        name: 'JobID',
        value: job.id,
      },
      datePosted: job.crawledAt,
      validThrough: job.expiresAt,
      employmentType: job.employmentType,
      hiringOrganization: {
        '@type': 'Organization',
        name: job.company || '회사명 미정',
      },
      jobLocation: locationData ? {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: locationData.address || locationData.city,
          addressRegion: locationData.region,
          addressCountry: 'KR',
        },
      } : undefined,
      baseSalary: salaryData?.min ? {
        '@type': 'MonetaryAmount',
        currency: salaryData.currency || 'KRW',
        value: {
          '@type': 'QuantitativeValue',
          minValue: salaryData.min,
          maxValue: salaryData.max,
          unitText: 'YEAR',
        },
      } : undefined,
    };
    
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <JobDetailClient job={job} relatedJobs={relatedJobs} />
      </>
    );
  } catch (error) {
    console.error('Failed to fetch job:', error);
    notFound();
  }
}