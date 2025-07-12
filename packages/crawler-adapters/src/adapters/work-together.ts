import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import { 
  JobSource, 
  RawJobData, 
  JobDetail, 
  NormalizedJob,
  CRAWL_CONFIG,
  sleep,
  normalizeWhitespace,
  parseKoreanCurrency
} from '@rebridge/shared';
import { BaseCrawlerAdapter } from '../base';

export class WorkTogetherAdapter extends BaseCrawlerAdapter {
  source: JobSource = 'workTogether';
  private baseUrl = 'https://www.worktogether.or.kr';
  private browser: Browser | null = null;

  async crawl(page: number = 1): Promise<RawJobData[]> {
    const results: RawJobData[] = [];
    
    try {
      // Initialize browser
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }

      const context = await this.browser.newContext({
        userAgent: CRAWL_CONFIG.USER_AGENT
      });
      const browserPage = await context.newPage();

      // Navigate to job list page
      const listUrl = `${this.baseUrl}/empInfo/empInfoSrch/list/retriveWorkRegionEmpIntroList.do?pageIndex=${page}`;
      await browserPage.goto(listUrl, { waitUntil: 'networkidle' });
      
      // Wait for content to load
      await browserPage.waitForSelector('.board_list', { timeout: 10000 });
      
      const html = await browserPage.content();
      const $ = cheerio.load(html);

      // Extract job listings
      $('.board_list tbody tr').each((_, element) => {
        const $row = $(element);
        const titleLink = $row.find('td.tit a');
        const href = titleLink.attr('href');
        
        if (href) {
          const externalId = this.extractJobId(href);
          const title = normalizeWhitespace(titleLink.text());
          const company = normalizeWhitespace($row.find('td:nth-child(2)').text());
          const location = normalizeWhitespace($row.find('td:nth-child(3)').text());
          const deadline = normalizeWhitespace($row.find('td:nth-child(5)').text());

          results.push({
            source: this.source,
            externalId,
            url: `${this.baseUrl}${href}`,
            data: {
              title,
              company,
              location,
              deadline,
              listingHtml: $row.html() || ''
            }
          });
        }
      });

      await context.close();
      
      // Apply rate limiting
      await sleep(CRAWL_CONFIG.REQUEST_DELAY.workTogether * 1000);

    } catch (error) {
      console.error('WorkTogether crawl error:', error);
      throw error;
    }

    return results;
  }

  async parseJobDetail(id: string): Promise<JobDetail> {
    try {
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }

      const context = await this.browser.newContext({
        userAgent: CRAWL_CONFIG.USER_AGENT
      });
      const page = await context.newPage();

      const detailUrl = `${this.baseUrl}/empInfo/empInfoSrch/detail/empDetailAuthView.do?searchEpSeq=${id}`;
      await page.goto(detailUrl, { waitUntil: 'networkidle' });
      
      const html = await page.content();
      const $ = cheerio.load(html);

      // Extract detailed information
      const title = normalizeWhitespace($('.view_top h3').text());
      const company = normalizeWhitespace($('.company_name').text());
      const description = normalizeWhitespace($('.view_content').text());
      
      // Extract structured data from detail table
      const details: Record<string, string> = {};
      $('.view_table tr').each((_, row) => {
        const $row = $(row);
        const label = normalizeWhitespace($row.find('th').text());
        const value = normalizeWhitespace($row.find('td').text());
        if (label && value) {
          details[label] = value;
        }
      });

      const jobDetail: JobDetail = {
        id: '',
        source: this.source,
        externalId: id,
        title,
        company,
        location: {
          address: details['근무지역'] || undefined
        },
        salaryRange: this.parseSalaryRange(details['급여']),
        employmentType: details['고용형태'] || null,
        description,
        isDisabilityFriendly: true, // WorkTogether는 장애인 채용 전문
        crawledAt: new Date(),
        expiresAt: this.parseDeadline(details['모집마감일']),
        requirements: this.parseRequirements(details),
        benefits: this.parseBenefits(details),
        applicationDeadline: this.parseDeadline(details['모집마감일']),
        contactInfo: {
          phone: details['담당자 연락처'] || undefined,
          email: details['담당자 이메일'] || undefined
        }
      };

      await context.close();
      
      // Apply rate limiting
      await sleep(CRAWL_CONFIG.REQUEST_DELAY.workTogether * 1000);

      return jobDetail;

    } catch (error) {
      console.error('WorkTogether parseJobDetail error:', error);
      throw error;
    }
  }

  normalizeData(raw: RawJobData): NormalizedJob {
    const { data } = raw;
    
    return {
      source: this.source,
      externalId: raw.externalId,
      title: (data.title as string) || '',
      company: (data.company as string) || null,
      locationJson: data.location ? { address: data.location } : null,
      salaryRange: null, // Will be parsed from detail
      employmentType: null,
      description: null,
      isDisabilityFriendly: true,
      crawledAt: new Date(),
      expiresAt: this.parseDeadline(data.deadline as string),
      rawData: raw
    };
  }

  private extractJobId(href: string): string {
    const match = href.match(/searchEpSeq=(\d+)/);
    return match ? match[1] : '';
  }

  private parseSalaryRange(salaryText?: string): { min?: number; max?: number; currency: string } | null {
    if (!salaryText) return null;
    
    const min = parseKoreanCurrency(salaryText);
    if (min !== null) {
      return { min, currency: 'KRW' };
    }
    
    return null;
  }

  private parseDeadline(deadlineText?: string): Date | null {
    if (!deadlineText) return null;
    
    // Parse Korean date format (예: 2024.12.31)
    const match = deadlineText.match(/(\d{4})\.(\d{2})\.(\d{2})/);
    if (match) {
      return new Date(`${match[1]}-${match[2]}-${match[3]}`);
    }
    
    return null;
  }

  private parseRequirements(details: Record<string, string>): string[] {
    const requirements: string[] = [];
    
    if (details['자격요건']) {
      requirements.push(details['자격요건']);
    }
    if (details['우대사항']) {
      requirements.push(`우대: ${details['우대사항']}`);
    }
    
    return requirements;
  }

  private parseBenefits(details: Record<string, string>): string[] {
    const benefits: string[] = [];
    
    if (details['복리후생']) {
      benefits.push(...details['복리후생'].split(',').map(b => b.trim()));
    }
    
    return benefits;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}