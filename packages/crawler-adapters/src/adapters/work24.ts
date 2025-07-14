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

export class Work24Adapter extends BaseCrawlerAdapter {
  source: JobSource = 'work24';
  private baseUrl = 'https://www.work24.go.kr';
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

      // Navigate to job list page with disability filter
      const listUrl = `${this.baseUrl}/wk/a/c/CA0101.do?srchType=12&srchKeyword=&rowsPerPage=20&pageNo=${page}&srchEmplTypList=&srchWorkAreaList=&srchMjrNmList=&srchJobKindList=&srchWageType=&srchWageMin=&srchWageMax=&srchWorkDayTyp=&srchDisablGbn=Y`;
      await browserPage.goto(listUrl, { waitUntil: 'networkidle', timeout: CRAWL_CONFIG.TIMEOUT.NAVIGATION });
      
      // Wait for content to load with increased timeout
      await browserPage.waitForSelector('.tbl-type01', { timeout: CRAWL_CONFIG.TIMEOUT.SELECTOR });
      
      const html = await browserPage.content();
      const $ = cheerio.load(html);

      // Extract job listings - use more specific selector
      $('.tbl-type01 tbody tr:not(.no-data)').each((_, element) => {
        const $row = $(element);
        const titleLink = $row.find('.al-l a');
        const onclick = titleLink.attr('onclick');
        
        if (onclick) {
          const externalId = this.extractJobId(onclick);
          const title = normalizeWhitespace(titleLink.text());
          const company = normalizeWhitespace($row.find('td:nth-child(3)').text());
          const location = normalizeWhitespace($row.find('td:nth-child(4)').text());
          const deadline = normalizeWhitespace($row.find('td:nth-child(6)').text());

          results.push({
            source: this.source,
            externalId,
            url: `${this.baseUrl}/wk/a/c/CA0301.do?jobId=${externalId}`,
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
      await sleep(CRAWL_CONFIG.REQUEST_DELAY.work24 * 1000);

    } catch (error) {
      console.error('Work24 crawl error:', error);
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

      const detailUrl = `${this.baseUrl}/wk/a/c/CA0301.do?jobId=${id}`;
      await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: CRAWL_CONFIG.TIMEOUT.NAVIGATION });
      
      const html = await page.content();
      const $ = cheerio.load(html);

      // Wait for detail content to load
      await page.waitForSelector('.content, .detail-content, .job-content', { timeout: CRAWL_CONFIG.TIMEOUT.SELECTOR });
      
      // Extract detailed information - use multiple possible selectors
      const title = normalizeWhitespace(
        $('.job-detail-top h3').text() || 
        $('.detail-title').text() || 
        $('h2.title').text() ||
        $('h3.title').first().text()
      );
      const company = normalizeWhitespace(
        $('.company-info .name').text() || 
        $('.company-name').text() ||
        $('.corp-name').text()
      );
      const description = normalizeWhitespace(
        $('.job-detail-content').text() || 
        $('.detail-content').text() ||
        $('.job-content').text()
      );
      
      // Extract structured data from detail sections - use multiple possible selectors
      const details: Record<string, string> = {};
      $('.job-info-table tr, .detail-table tr, .info-table tr, table.tbl-type01 tr').each((_, row) => {
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
          address: details['근무지역'] || details['근무지'] || undefined
        },
        salaryRange: this.parseSalaryRange(details['급여'] || details['임금']),
        employmentType: details['고용형태'] || details['모집직종'] || null,
        description,
        isDisabilityFriendly: true, // Filtered for disability-friendly jobs
        crawledAt: new Date(),
        expiresAt: this.parseDeadline(details['모집마감일'] || details['접수마감일']),
        requirements: this.parseRequirements(details),
        benefits: this.parseBenefits(details),
        applicationDeadline: this.parseDeadline(details['모집마감일'] || details['접수마감일']),
        contactInfo: {
          phone: details['담당자 연락처'] || details['전화번호'] || undefined,
          email: details['이메일'] || undefined
        }
      };

      await context.close();
      
      // Apply rate limiting
      await sleep(CRAWL_CONFIG.REQUEST_DELAY.work24 * 1000);

      return jobDetail;

    } catch (error) {
      console.error('Work24 parseJobDetail error:', error);
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

  private extractJobId(onclick: string): string {
    // Extract job ID from onclick="fnJobDetail('12345')"
    const match = onclick.match(/fnJobDetail\('(\d+)'\)/);
    return match ? match[1] : '';
  }

  private parseSalaryRange(salaryText?: string): { min?: number; max?: number; currency: string } | null {
    if (!salaryText) return null;
    
    // Handle various salary formats (연봉, 월급, 시급)
    const cleanedText = salaryText.replace(/[\s,]/g, '');
    
    // Check for yearly salary (연봉)
    if (cleanedText.includes('연봉')) {
      const yearlyMatch = cleanedText.match(/(\d+)만원/);
      if (yearlyMatch) {
        return { min: parseInt(yearlyMatch[1]) * 10000, currency: 'KRW' };
      }
    }
    
    // Check for monthly salary (월급)
    if (cleanedText.includes('월급') || cleanedText.includes('월')) {
      const monthlyMatch = cleanedText.match(/(\d+)만원/);
      if (monthlyMatch) {
        const monthly = parseInt(monthlyMatch[1]) * 10000;
        return { min: monthly * 12, currency: 'KRW' }; // Convert to yearly
      }
    }
    
    // Check for hourly wage (시급)
    if (cleanedText.includes('시급')) {
      const hourlyMatch = cleanedText.match(/(\d+)원/);
      if (hourlyMatch) {
        const hourly = parseInt(hourlyMatch[1]);
        return { min: hourly * 8 * 20 * 12, currency: 'KRW' }; // Convert to yearly (8h/day, 20d/month)
      }
    }
    
    // Try generic parsing
    const min = parseKoreanCurrency(salaryText);
    if (min !== null) {
      return { min, currency: 'KRW' };
    }
    
    return null;
  }

  private parseDeadline(deadlineText?: string): Date | null {
    if (!deadlineText) return null;
    
    // Parse Korean date format (예: 2024.12.31 or 2024-12-31)
    const match = deadlineText.match(/(\d{4})[-.](\d{2})[-.](\d{2})/);
    if (match) {
      return new Date(`${match[1]}-${match[2]}-${match[3]}`);
    }
    
    // Check for "상시모집"
    if (deadlineText.includes('상시') || deadlineText.includes('채용시')) {
      // Set expiry to 6 months from now for ongoing recruitment
      const future = new Date();
      future.setMonth(future.getMonth() + 6);
      return future;
    }
    
    return null;
  }

  private parseRequirements(details: Record<string, string>): string[] {
    const requirements: string[] = [];
    
    const requirementFields = ['자격요건', '자격조건', '모집조건', '지원자격'];
    for (const field of requirementFields) {
      if (details[field]) {
        requirements.push(details[field]);
      }
    }
    
    if (details['우대사항'] || details['우대조건']) {
      requirements.push(`우대: ${details['우대사항'] || details['우대조건']}`);
    }
    
    return requirements;
  }

  private parseBenefits(details: Record<string, string>): string[] {
    const benefits: string[] = [];
    
    const benefitFields = ['복리후생', '복지', '혜택'];
    for (const field of benefitFields) {
      if (details[field]) {
        benefits.push(...details[field].split(/[,、·]/).map(b => b.trim()).filter(b => b));
      }
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