import { z } from 'zod';

export const JobSourceSchema = z.enum(['workTogether', 'work24', 'saramin', 'jobkorea']);
export type JobSource = z.infer<typeof JobSourceSchema>;

export const JobSchema = z.object({
  id: z.string().uuid(),
  source: JobSourceSchema,
  externalId: z.string(),
  title: z.string(),
  company: z.string().nullable(),
  location: z.object({
    city: z.string().optional(),
    district: z.string().optional(),
    address: z.string().optional(),
  }).nullable(),
  salaryRange: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().default('KRW'),
  }).nullable(),
  employmentType: z.string().nullable(),
  description: z.string().nullable(),
  isDisabilityFriendly: z.boolean().default(false),
  crawledAt: z.date(),
  expiresAt: z.date().nullable(),
});

export type Job = z.infer<typeof JobSchema>;

export const RawJobDataSchema = z.object({
  source: JobSourceSchema,
  externalId: z.string(),
  url: z.string().url(),
  html: z.string().optional(),
  data: z.record(z.unknown()),
});

export type RawJobData = z.infer<typeof RawJobDataSchema>;

export const JobDetailSchema = JobSchema.extend({
  requirements: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  applicationDeadline: z.date().nullable(),
  contactInfo: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional(),
  }).nullable(),
});

export type JobDetail = z.infer<typeof JobDetailSchema>;

export const NormalizedJobSchema = z.object({
  source: JobSourceSchema,
  externalId: z.string(),
  title: z.string(),
  company: z.string().nullable(),
  locationJson: z.any().nullable(),
  salaryRange: z.any().nullable(),
  employmentType: z.string().nullable(),
  description: z.string().nullable(),
  isDisabilityFriendly: z.boolean(),
  crawledAt: z.date(),
  expiresAt: z.date().nullable(),
  rawData: z.any(),
});

export type NormalizedJob = z.infer<typeof NormalizedJobSchema>;