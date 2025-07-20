import { JobSource, RawJobData, JobDetail, NormalizedJob } from '@rebridge/shared';

export interface CrawlerAdapter {
  source: JobSource;
  crawl(page?: number): Promise<RawJobData[]>;
  parseJobDetail(id: string): Promise<JobDetail>;
  normalizeData(raw: RawJobData): NormalizedJob | Promise<NormalizedJob>;
}

export abstract class BaseCrawlerAdapter implements CrawlerAdapter {
  abstract source: JobSource;
  
  abstract crawl(page?: number): Promise<RawJobData[]>;
  abstract parseJobDetail(id: string): Promise<JobDetail>;
  abstract normalizeData(raw: RawJobData): NormalizedJob | Promise<NormalizedJob>;
  
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}