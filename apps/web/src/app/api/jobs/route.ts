import { NextResponse } from 'next/server';
import { prisma } from '@rebridge/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('q') || '';

    const skip = (page - 1) * limit;

    // Build where clause - exclude expired jobs
    const now = new Date();
    const baseWhere = {
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: now } }
      ]
    };

    const where = search
      ? {
          AND: [
            baseWhere,
            {
              OR: [
                { title: { contains: search, mode: 'insensitive' as const } },
                { company: { contains: search, mode: 'insensitive' as const } },
                { description: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          ]
        }
      : baseWhere;

    // Get jobs and total count in parallel
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { crawledAt: 'desc' },
        take: limit,
        skip,
        select: {
          id: true,
          source: true,
          externalId: true,
          title: true,
          company: true,
          locationJson: true,
          salaryRange: true,
          employmentType: true,
          isDisabilityFriendly: true,
          crawledAt: true,
          expiresAt: true,
        },
      }),
      prisma.job.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}