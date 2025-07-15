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

export class KEADAdapter extends BaseCrawlerAdapter {
  source: JobSource = 'kead';
  private baseUrl = 'https://www.kead.or.kr';
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

      // Navigate to KEAD job list page
      // KEAD uses different URL structure for job listings
      const listUrl = `${this.baseUrl}/common/comm_board_list.jsp?board_code=B08&page=${page}`;
      
      await browserPage.goto(listUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: CRAWL_CONFIG.TIMEOUT.NAVIGATION 
      });
      
      // Wait for content to load
      await browserPage.waitForSelector('table.board_list, .board_list, .list_table', { 
        timeout: CRAWL_CONFIG.TIMEOUT.SELECTOR 
      });
      
      const html = await browserPage.content();
      const $ = cheerio.load(html);

      // Extract job listings - KEAD specific selectors
      $('.board_list tbody tr, table.board_list tbody tr').each((_, element) => {
        const $row = $(element);
        
        // Skip header or empty rows
        if ($row.hasClass('no_data') || $row.find('td').length === 0) {
          return;
        }
        
        const titleLink = $row.find('td.al_left a, td.left a, td a').first();
        const href = titleLink.attr('href');
        
        if (href) {
          const externalId = this.extractJobId(href);
          const title = normalizeWhitespace(titleLink.text());
          
          // KEAD specific column structure
          const $tds = $row.find('td');
          const company = normalizeWhitespace($tds.eq(2).text());
          const location = normalizeWhitespace($tds.eq(3).text());
          const deadline = normalizeWhitespace($tds.eq(4).text());

          results.push({
            source: this.source,
            externalId,
            url: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
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
      await sleep(CRAWL_CONFIG.REQUEST_DELAY.kead || 2000);

    } catch (error) {
      console.error('KEAD crawl error:', error);
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

      // KEAD detail page URL
      const detailUrl = `${this.baseUrl}/common/comm_board_view.jsp?board_code=B08&idx=${id}`;
      
      await page.goto(detailUrl, { 
        waitUntil: 'networkidle', 
        timeout: CRAWL_CONFIG.TIMEOUT.NAVIGATION 
      });
      
      const html = await page.content();
      const $ = cheerio.load(html);

      // Wait for detail content to load
      await page.waitForSelector('.board_view, .view_table, .content_view', { 
        timeout: CRAWL_CONFIG.TIMEOUT.SELECTOR 
      });
      
      // Extract detailed information
      const title = normalizeWhitespace(
        $('.board_view h3').text() ||
        $('.view_title').text() ||
        $('h2.title').text()
      );
      
      const company = normalizeWhitespace(
        $('.company_name').text() ||
        $('th:contains("기업명")').next('td').text()
      );
      
      const description = normalizeWhitespace(
        $('.view_content').text() ||
        $('.board_content').text()
      );
      
      // Extract structured data from detail table
      const details: Record<string, string> = {};
      $('.view_table tr, .board_view table tr').each((_, row) => {
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
        company: company || details['기업명'] || details['회사명'],
        location: {
          address: details['근무지'] || details['근무지역'] || undefined
        },
        salaryRange: this.parseSalaryRange(details['급여'] || details['임금']),
        employmentType: details['고용형태'] || null,
        description,
        isDisabilityFriendly: true, // KEAD는 장애인 고용 전문
        crawledAt: new Date(),
        expiresAt: this.parseDeadline(details['모집마감'] || details['마감일']),
        requirements: this.parseRequirements(details),
        benefits: this.parseBenefits(details),
        applicationDeadline: this.parseDeadline(details['모집마감'] || details['마감일']),
        contactInfo: {
          phone: details['연락처'] || details['전화번호'] || undefined,
          email: details['이메일'] || undefined
        }
      };

      await context.close();
      
      // Apply rate limiting
      await sleep(CRAWL_CONFIG.REQUEST_DELAY.kead || 2000);

      return jobDetail;

    } catch (error) {
      console.error('KEAD parseJobDetail error:', error);
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
      locationJson: data.location ? { address: data.location as string } : null,
      salaryRange: null,
      employmentType: null,
      description: null,
      isDisabilityFriendly: true,
      crawledAt: new Date(),
      expiresAt: this.parseDeadline(data.deadline as string),
      rawData: raw
    };
  }

  private extractJobId(href: string): string {
    // KEAD uses idx parameter
    const match = href.match(/idx=(\d+)/);
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
    
    // Parse Korean date format (예: 2024.12.31 or 2024-12-31)
    const match = deadlineText.match(/(\d{4})[-.](\d{2})[-.](\d{2})/);
    if (match) {
      return new Date(`${match[1]}-${match[2]}-${match[3]}`);
    }
    
    return null;
  }

  private parseRequirements(details: Record<string, string>): string[] {
    const requirements: string[] = [];
    
    if (details['자격요건'] || details['지원자격']) {
      requirements.push(details['자격요건'] || details['지원자격']);
    }
    if (details['우대사항']) {
      requirements.push(`우대: ${details['우대사항']}`);
    }
    
    return requirements;
  }

  private parseBenefits(details: Record<string, string>): string[] {
    const benefits: string[] = [];
    
    if (details['복리후생'] || details['복지']) {
      const benefitText = details['복리후생'] || details['복지'];
      benefits.push(...benefitText.split(',').map(b => b.trim()));
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