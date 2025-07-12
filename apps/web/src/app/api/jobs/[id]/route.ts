import { NextResponse } from 'next/server';
import { prisma } from '@rebridge/database';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        source: true,
        externalId: true,
        title: true,
        company: true,
        description: true,
        locationJson: true,
        salaryRange: true,
        employmentType: true,
        isDisabilityFriendly: true,
        requiredExperience: true,
        requiredEducation: true,
        benefits: true,
        requirements: true,
        preferredQualifications: true,
        crawledAt: true,
        expiresAt: true,
        applyUrl: true,
        contactInfo: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}