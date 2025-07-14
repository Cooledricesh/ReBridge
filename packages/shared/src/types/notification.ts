export interface NotificationJob {
  userId: string;
  type: 'job_expiring' | 'job_updated' | 'new_job_match';
  data: {
    jobId?: string;
    jobTitle?: string;
    company?: string;
    expiresAt?: Date;
    changes?: Record<string, any>;
    matchedJobs?: Array<{
      id: string;
      title: string;
      company: string;
    }>;
  };
}

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text?: string;
}