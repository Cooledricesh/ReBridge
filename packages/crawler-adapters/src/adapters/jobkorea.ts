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
import { getCrawlerKeywords } from '../utils/keywords';

export class JobKoreaAdapter extends BaseCrawlerAdapter {
  source: JobSource = 'jobkorea';
  private baseUrl = 'https://www.jobkorea.co.kr';
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

      // Get keywords from database
      const keywords = await getCrawlerKeywords();
      const searchKeyword = keywords[0] || '장애인'; // Use first keyword for search
      
      // Navigate to job list page with disability-friendly filter
      const listUrl = `${this.baseUrl}/Search/?stext=${encodeURIComponent(searchKeyword)}&Page_No=${page}`;
      await browserPage.goto(listUrl, { waitUntil: 'networkidle', timeout: CRAWL_CONFIG.TIMEOUT.NAVIGATION });
      
      // Wait for content to load with increased timeout
      await browserPage.waitForSelector('.list-post, .recruit-list, .job-list', { timeout: CRAWL_CONFIG.TIMEOUT.SELECTOR });
      
      const html = await browserPage.content();
      const $ = cheerio.load(html);

      // Extract job listings - use multiple possible selectors
      $('.list-post .post, .recruit-list .list-item, .job-list .item').each((_, element) => {
        const $item = $(element);
        const titleLink = $item.find('.title a, .job-title a, a.title').first();
        const href = titleLink.attr('href');
        
        if (href) {
          const externalId = this.extractJobId(href);
          const title = normalizeWhitespace(titleLink.attr('title') || titleLink.text());
          const company = normalizeWhitespace(
            $item.find('.name, .company, .corp-name').first().text()
          );
          const location = normalizeWhitespace(
            $item.find('.loc, .location, .area').first().text()
          );
          const deadline = normalizeWhitespace(
            $item.find('.date, .deadline, .d-day').first().text()
          );

          results.push({
            source: this.source,
            externalId,
            url: `${this.baseUrl}${href}`,
            data: {
              title,
              company,
              location,
              deadline,
              listingHtml: $item.html() || ''
            }
          });
        }
      });

      await context.close();
      
      // Apply rate limiting
      await sleep(CRAWL_CONFIG.REQUEST_DELAY.jobkorea * 1000);

    } catch (error) {
      console.error('JobKorea crawl error:', error);
      throw error;
    } finally {
      // Clean up browser to prevent memory leak
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
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

      const detailUrl = `${this.baseUrl}/Recruit/GI_Read/${id}`;
      await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: CRAWL_CONFIG.TIMEOUT.NAVIGATION });
      
      const html = await page.content();
      const $ = cheerio.load(html);

      // Wait for detail content to load
      await page.waitForSelector('.tit-area, .detail-header, .job-header', { timeout: CRAWL_CONFIG.TIMEOUT.SELECTOR });
      
      // Extract detailed information - use multiple possible selectors
      const title = normalizeWhitespace(
        $('.tit-area .tit').text() ||
        $('.detail-header h2').text() ||
        $('.job-header .title').text() ||
        $('h2.title').first().text()
      );
      const company = normalizeWhitespace(
        $('.co-name').text() ||
        $('.company-name').text() ||
        $('.corp-info .name').text()
      );
      const description = normalizeWhitespace(
        $('.cont').text() ||
        $('.detail-content').text() ||
        $('.job-description').text()
      );
      
      // Extract structured data from info sections
      const details: Record<string, string> = {};
      
      // Parse job information table - use multiple possible selectors
      $('.tbRow tr, .info-table tr, .detail-table tr, table.table-info tr').each((_, row) => {
        const $row = $(row);
        $row.find('th').each((index, th) => {
          const label = normalizeWhitespace($(th).text());
          const value = normalizeWhitespace($row.find('td').eq(index).text());
          if (label && value) {
            details[label] = value;
          }
        });
      });

      // Parse summary information
      $('.summary li').each((_, item) => {
        const $item = $(item);
        const strongText = $item.find('strong').text();
        const fullText = $item.text();
        if (strongText) {
          const value = fullText.replace(strongText, '').trim();
          details[strongText] = value;
        }
      });

      const jobDetail: JobDetail = {
        id: '',
        source: this.source,
        externalId: id,
        title,
        company,
        location: {
          address: details['근무지역'] || details['근무지'] || details['지역'] || undefined
        },
        salaryRange: this.parseSalaryRange(details['급여'] || details['연봉']),
        employmentType: details['고용형태'] || details['근무형태'] || null,
        description,
        isDisabilityFriendly: await this.checkDisabilityFriendly($),
        crawledAt: new Date(),
        expiresAt: this.parseDeadline(details['모집마감일'] || details['접수마감'] || details['마감일']),
        requirements: this.parseRequirements($, details),
        benefits: this.parseBenefits($, details),
        applicationDeadline: this.parseDeadline(details['모집마감일'] || details['접수마감'] || details['마감일']),
        contactInfo: {
          phone: details['연락처'] || details['담당자 연락처'] || undefined,
          email: details['이메일'] || details['담당자 이메일'] || undefined,
          website: details['홈페이지'] || undefined
        }
      };

      await context.close();
      
      // Apply rate limiting
      await sleep(CRAWL_CONFIG.REQUEST_DELAY.jobkorea * 1000);

      return jobDetail;

    } catch (error) {
      console.error('JobKorea parseJobDetail error:', error);
      throw error;
    } finally {
      // Clean up browser to prevent memory leak
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  async normalizeData(raw: RawJobData): Promise<NormalizedJob> {
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
      isDisabilityFriendly: await this.checkDisabilityInTitle(data.title as string),
      crawledAt: new Date(),
      expiresAt: this.parseDeadline(data.deadline as string),
      externalUrl: raw.url,
      rawData: raw
    };
  }

  private extractJobId(href: string): string {
    // Extract job ID from URL patterns like /Recruit/GI_Read/12345678
    const match = href.match(/\/Recruit\/GI_Read\/(\d+)/);
    if (match) return match[1];
    
    // Alternative pattern: ?Gicode=12345678
    const gicodeMatch = href.match(/[?&]Gicode=(\d+)/);
    if (gicodeMatch) return gicodeMatch[1];
    
    return '';
  }

  private async checkDisabilityFriendly($: cheerio.CheerioAPI): Promise<boolean> {
    const fullText = $('body').text().toLowerCase();
    const keywords = await getCrawlerKeywords();
    const extendedKeywords = [...keywords];
    
    // Add common variations for each keyword
    keywords.forEach(keyword => {
      extendedKeywords.push(`${keyword}채용`, `${keyword}우대`, `${keyword}전형`);
    });
    
    return extendedKeywords.some(keyword => fullText.toLowerCase().includes(keyword.toLowerCase()));
  }

  private async checkDisabilityInTitle(title: string): Promise<boolean> {
    const keywords = await getCrawlerKeywords();
    return keywords.some(keyword => title.toLowerCase().includes(keyword.toLowerCase()));
  }

  private parseSalaryRange(salaryText?: string): { min?: number; max?: number; currency: string } | null {
    if (!salaryText) return null;
    
    const cleanedText = salaryText.replace(/[\s,]/g, '');
    
    // Handle range format (예: 3000만원~4000만원)
    const rangeMatch = cleanedText.match(/(\d+)만원~(\d+)만원/);
    if (rangeMatch) {
      return {
        min: parseInt(rangeMatch[1]) * 10000,
        max: parseInt(rangeMatch[2]) * 10000,
        currency: 'KRW'
      };
    }
    
    // Handle yearly salary
    const yearlyMatch = cleanedText.match(/연봉(\d+)만원/);
    if (yearlyMatch) {
      return { min: parseInt(yearlyMatch[1]) * 10000, currency: 'KRW' };
    }
    
    // Handle monthly salary
    const monthlyMatch = cleanedText.match(/월(\d+)만원/);
    if (monthlyMatch) {
      const monthly = parseInt(monthlyMatch[1]) * 10000;
      return { min: monthly * 12, currency: 'KRW' };
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
    
    // Clean the text
    const cleaned = deadlineText.replace(/\s+/g, ' ').trim();
    
    // Parse various date formats
    // Format: 2024.12.31 or 2024-12-31
    const dateMatch = cleaned.match(/(\d{4})[-.](\d{1,2})[-.](\d{1,2})/);
    if (dateMatch) {
      return new Date(`${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`);
    }
    
    // Format: 12/31(월)
    const shortMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})/);
    if (shortMatch) {
      const currentYear = new Date().getFullYear();
      return new Date(`${currentYear}-${shortMatch[1].padStart(2, '0')}-${shortMatch[2].padStart(2, '0')}`);
    }
    
    // Check for ongoing recruitment
    if (cleaned.includes('상시') || cleaned.includes('채용시') || cleaned.includes('수시')) {
      const future = new Date();
      future.setMonth(future.getMonth() + 6);
      return future;
    }
    
    return null;
  }

  private parseRequirements($: cheerio.CheerioAPI, details: Record<string, string>): string[] {
    const requirements: string[] = [];
    
    // From structured data
    const requirementFields = ['자격요건', '자격조건', '지원자격', '응시자격'];
    for (const field of requirementFields) {
      if (details[field]) {
        requirements.push(details[field]);
      }
    }
    
    // From specific sections
    $('.requirement li, .qualify li').each((_, item) => {
      const text = normalizeWhitespace($(item).text());
      if (text) requirements.push(text);
    });
    
    // Preferred qualifications
    if (details['우대사항'] || details['우대조건']) {
      requirements.push(`우대: ${details['우대사항'] || details['우대조건']}`);
    }
    
    return [...new Set(requirements)]; // Remove duplicates
  }

  private parseBenefits($: cheerio.CheerioAPI, details: Record<string, string>): string[] {
    const benefits: string[] = [];
    
    // From structured data
    const benefitFields = ['복리후생', '복지', '혜택', '근무환경'];
    for (const field of benefitFields) {
      if (details[field]) {
        const items = details[field].split(/[,、·]/).map(b => b.trim()).filter(b => b);
        benefits.push(...items);
      }
    }
    
    // From specific sections
    $('.benefit li, .welfare li').each((_, item) => {
      const text = normalizeWhitespace($(item).text());
      if (text) benefits.push(text);
    });
    
    return [...new Set(benefits)]; // Remove duplicates
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}