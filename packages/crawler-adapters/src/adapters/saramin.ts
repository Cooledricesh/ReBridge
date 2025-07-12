import { chromium, Browser } from 'playwright';
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

export class SaraminAdapter extends BaseCrawlerAdapter {
  source: JobSource = 'saramin';
  private baseUrl = 'https://www.saramin.co.kr';
  private browser: Browser | null = null;

  async crawl(page: number = 1): Promise<RawJobData[]> {
    const results: RawJobData[] = [];
    
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
      const browserPage = await context.newPage();

      // Search for disability-friendly jobs
      const searchUrl = `${this.baseUrl}/zf_user/search?search_area=main&search_done=y&search_optional_item=n&searchType=search&searchword=%EC%9E%A5%EC%95%A0%EC%9D%B8&recruitPage=${page}`;
      await browserPage.goto(searchUrl, { waitUntil: 'networkidle' });
      
      // Wait for job listings to load
      await browserPage.waitForSelector('.item_recruit', { timeout: 10000 });
      
      const html = await browserPage.content();
      const $ = cheerio.load(html);

      // Extract job listings
      $('.item_recruit').each((_, element) => {
        const $item = $(element);
        const $titleLink = $item.find('.job_tit a');
        const href = $titleLink.attr('href');
        
        if (href) {
          const externalId = this.extractJobId(href);
          const title = normalizeWhitespace($titleLink.attr('title') || $titleLink.text());
          const company = normalizeWhitespace($item.find('.corp_name a').text());
          const conditions = $item.find('.job_condition span');
          
          const location = normalizeWhitespace(conditions.eq(0).text());
          const experience = normalizeWhitespace(conditions.eq(1).text());
          const education = normalizeWhitespace(conditions.eq(2).text());
          const employmentType = normalizeWhitespace(conditions.eq(3).text());
          const deadline = normalizeWhitespace($item.find('.job_date .date').text());

          results.push({
            source: this.source,
            externalId,
            url: `${this.baseUrl}${href}`,
            data: {
              title,
              company,
              location,
              experience,
              education,
              employmentType,
              deadline,
              listingHtml: $item.html() || ''
            }
          });
        }
      });

      await context.close();
      
      // Apply rate limiting
      await sleep(CRAWL_CONFIG.REQUEST_DELAY.saramin * 1000);

    } catch (error) {
      console.error('Saramin crawl error:', error);
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

      const detailUrl = `${this.baseUrl}/zf_user/jobs/relay/view?rec_idx=${id}`;
      await page.goto(detailUrl, { waitUntil: 'networkidle' });
      
      const html = await page.content();
      const $ = cheerio.load(html);

      // Extract detailed information
      const title = normalizeWhitespace($('.wrap_jv_header .jv_header a').text());
      const company = normalizeWhitespace($('.wrap_jv_header .jv_company a').text());
      const description = normalizeWhitespace($('.cont.box').text());
      
      // Extract requirements and qualifications
      const requirements: string[] = [];
      $('.cont.box').each((_, box) => {
        const $box = $(box);
        const sectionTitle = $box.find('h3').text();
        if (sectionTitle.includes('자격요건') || sectionTitle.includes('우대사항')) {
          $box.find('li').each((_, li) => {
            requirements.push(normalizeWhitespace($(li).text()));
          });
        }
      });

      // Extract benefits
      const benefits: string[] = [];
      $('.jv_benefit .benefit_list li').each((_, li) => {
        benefits.push(normalizeWhitespace($(li).text()));
      });

      // Extract location
      const locationText = normalizeWhitespace($('.jv_location').text());
      
      // Extract salary
      const salaryText = normalizeWhitespace($('.jv_cont.jv_summary .col .cont:contains("급여")').text());
      
      // Check if disability-friendly
      const isDisabilityFriendly = html.includes('장애인채용') || 
                                   html.includes('장애인 채용') ||
                                   html.includes('장애인우대');

      const jobDetail: JobDetail = {
        id: '',
        source: this.source,
        externalId: id,
        title,
        company,
        location: {
          address: locationText || undefined
        },
        salaryRange: this.parseSalaryRange(salaryText),
        employmentType: normalizeWhitespace($('.jv_cont.jv_summary .col .cont:contains("고용형태")').text()) || null,
        description,
        isDisabilityFriendly,
        crawledAt: new Date(),
        expiresAt: this.parseDeadline($('.jv_cont.jv_summary .col .cont:contains("마감일")').text()),
        requirements,
        benefits,
        applicationDeadline: this.parseDeadline($('.jv_cont.jv_summary .col .cont:contains("마감일")').text()),
        contactInfo: {}
      };

      await context.close();
      
      // Apply rate limiting
      await sleep(CRAWL_CONFIG.REQUEST_DELAY.saramin * 1000);

      return jobDetail;

    } catch (error) {
      console.error('Saramin parseJobDetail error:', error);
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
      employmentType: (data.employmentType as string) || null,
      description: null,
      isDisabilityFriendly: false, // Will be determined from detail
      crawledAt: new Date(),
      expiresAt: this.parseDeadline(data.deadline as string),
      rawData: raw
    };
  }

  private extractJobId(href: string): string {
    const match = href.match(/rec_idx=(\d+)/);
    return match ? match[1] : '';
  }

  private parseSalaryRange(salaryText?: string): { min?: number; max?: number; currency: string } | null {
    if (!salaryText) return null;
    
    // Extract salary range (e.g., "3,000만원 ~ 4,000만원")
    const rangeMatch = salaryText.match(/(\d+(?:,\d+)?)\s*만원\s*~\s*(\d+(?:,\d+)?)\s*만원/);
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1].replace(/,/g, '')) * 10000;
      const max = parseInt(rangeMatch[2].replace(/,/g, '')) * 10000;
      return { min, max, currency: 'KRW' };
    }
    
    // Single salary
    const singleMatch = salaryText.match(/(\d+(?:,\d+)?)\s*만원/);
    if (singleMatch) {
      const amount = parseInt(singleMatch[1].replace(/,/g, '')) * 10000;
      return { min: amount, currency: 'KRW' };
    }
    
    return null;
  }

  private parseDeadline(deadlineText?: string): Date | null {
    if (!deadlineText) return null;
    
    // Parse various deadline formats
    // "~ 12/31(화)" format
    const dateMatch = deadlineText.match(/(\d{1,2})\/(\d{1,2})/);
    if (dateMatch) {
      const currentYear = new Date().getFullYear();
      const month = parseInt(dateMatch[1]);
      const day = parseInt(dateMatch[2]);
      return new Date(currentYear, month - 1, day);
    }
    
    // "상시채용" or "채용시까지"
    if (deadlineText.includes('상시') || deadlineText.includes('채용시')) {
      // Set to 6 months from now
      const future = new Date();
      future.setMonth(future.getMonth() + 6);
      return future;
    }
    
    return null;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}