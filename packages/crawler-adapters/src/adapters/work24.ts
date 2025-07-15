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

      // Try GET request with query parameters
      console.log('Work24: Navigating to search results with "장애인" keyword...');
      const searchUrl = `${this.baseUrl}/wk/a/b/1200/retriveDtlEmpSrchList.do?srcKeyword=${encodeURIComponent('장애인')}&searchType=1`;
      
      await browserPage.goto(searchUrl, {
        waitUntil: 'networkidle',
        timeout: CRAWL_CONFIG.TIMEOUT.NAVIGATION
      });
      
      console.log('Work24: Waiting for search results...');
      await browserPage.waitForTimeout(5000);
      
      // Check current URL after search
      const currentUrl = browserPage.url();
      console.log('Work24: Current URL after search:', currentUrl);
      
      // Check if we have results using multiple selectors
      const resultSelectors = [
        'input[name="chkWantedAuthNo"]',
        '.cp_name',
        '.company_name',
        '.recruit_list',
        '.job_list',
        'table tbody tr'
      ];
      
      let hasResults = 0;
      for (const selector of resultSelectors) {
        const count = await browserPage.locator(selector).count();
        if (count > 0) {
          console.log(`Work24: Found ${count} elements with selector: ${selector}`);
          hasResults = count;
          break;
        }
      }
      
      if (hasResults === 0) {
        console.log('Work24: No results found with standard selectors');
        // Try to find any text containing "장애인" to verify we're on the right page
        const pageText = await browserPage.textContent('body');
        const matches = (pageText.match(/장애인/g) || []).length;
        console.log(`Work24: Found ${matches} occurrences of "장애인" on the page`);
        
        if (matches === 0) {
          throw new Error('Work24 search did not return any results');
        }
      }
      
      const html = await browserPage.content();
      const $ = cheerio.load(html);

      // Extract job listings - Work24 search result structure
      // First try the checkbox method
      const checkboxes = $('input[type="checkbox"][name="chkWantedAuthNo"]');
      
      if (checkboxes.length > 0) {
        console.log(`Work24: Found ${checkboxes.length} job listings via checkboxes`);
        
        checkboxes.each((_, element) => {
          const $checkbox = $(element);
          const externalId = $checkbox.val() as string;
          
          if (externalId) {
            // Navigate up to find the job container
            const $jobSection = $checkbox.parent().parent().parent();
            
            // Extract company name (첫 번째 줄에 있음)
            const company = normalizeWhitespace($jobSection.find('.cp_name').text());
            
            // Extract job title (회사명 다음 링크)
            const titleLink = $jobSection.find('a').eq(1); // 첫 번째는 회사 링크, 두 번째가 채용공고 제목
            const title = normalizeWhitespace(titleLink.text());
            
            // Extract location and other details from list items
            let location = '';
            let salary = '';
            let deadline = '';
            
            $jobSection.find('ul li').each((_, li) => {
              const text = $(li).text();
              if (text.includes('지역 :')) {
                location = normalizeWhitespace(text.split(':')[1]);
              } else if (text.includes('급여 :')) {
                salary = normalizeWhitespace(text.split(':')[1]);
              }
            });
            
            // Extract deadline from D-day badge
            const ddayElement = $jobSection.find('[class*="d-"]');
            if (ddayElement.length > 0) {
              deadline = normalizeWhitespace(ddayElement.text());
            }

            results.push({
              source: this.source,
              externalId,
              url: `${this.baseUrl}/wk/a/b/1200/retriveDtlEmpSrchDetail.do?wantedAuthNo=${externalId}`,
              data: {
                title,
                company,
                location,
                salary,
                deadline,
                listingHtml: $jobSection.html() || ''
              }
            });
          }
        });
      } else {
        // Fallback method: try to extract from .cp_name elements
        console.log('Work24: Trying alternative extraction method...');
        
        $('.cp_name').each((index, element) => {
          const $companyElement = $(element);
          const company = normalizeWhitespace($companyElement.text());
          
          // Find the parent container
          const $container = $companyElement.closest('li, div, tr');
          
          // Try to find title link
          const $titleLink = $container.find('a').not(':has(.cp_name)').first();
          const title = normalizeWhitespace($titleLink.text());
          
          // Try to extract ID from link or onclick
          let externalId = '';
          const href = $titleLink.attr('href') || '';
          const onclick = $titleLink.attr('onclick') || '';
          
          // Extract from href
          const hrefMatch = href.match(/wantedAuthNo=(\d+)/);
          if (hrefMatch) {
            externalId = hrefMatch[1];
          } else {
            // Extract from onclick
            const onclickMatch = onclick.match(/['"](\d+)['"]/);
            if (onclickMatch) {
              externalId = onclickMatch[1];
            } else {
              // Use index as fallback
              externalId = `work24_${Date.now()}_${index}`;
            }
          }
          
          if (company && title) {
            results.push({
              source: this.source,
              externalId,
              url: externalId.includes('work24_') 
                ? currentUrl 
                : `${this.baseUrl}/wk/a/b/1200/retriveDtlEmpSrchDetail.do?wantedAuthNo=${externalId}`,
              data: {
                title,
                company,
                location: '',
                salary: '',
                deadline: '',
                listingHtml: $container.html() || ''
              }
            });
          }
        });
      }
      
      console.log(`Work24: Extracted ${results.length} job listings`);

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

      const detailUrl = `${this.baseUrl}/wk/a/b/1200/retriveDtlEmpSrchDetail.do?wantedAuthNo=${id}`;
      await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: CRAWL_CONFIG.TIMEOUT.NAVIGATION });
      
      const html = await page.content();
      const $ = cheerio.load(html);

      // Wait for page to load - Work24 might have different structure
      await page.waitForTimeout(3000);
      
      // Check if page loaded properly
      const pageTitle = await page.title();
      console.log(`Work24: Detail page title: ${pageTitle}`);
      
      // Save screenshot for debugging
      await page.screenshot({ path: 'work24-detail-debug.png', fullPage: false });
      console.log('Work24: Screenshot saved as work24-detail-debug.png');
      
      // Extract detailed information - Work24 specific selectors
      // Try to find title in various ways
      const title = normalizeWhitespace(
        $('h2').first().text() || 
        $('h3').first().text() ||
        $('.title').first().text() ||
        $('[class*="title"]').first().text() ||
        ''
      );
      
      // Extract company name
      const company = normalizeWhitespace(
        $('.cp_name').text() || 
        $('[class*="company"]').first().text() ||
        $('[class*="corp"]').first().text() ||
        ''
      );
      
      // Extract all text content as description
      const contentAreas = [
        $('.content').text(),
        $('.detail').text(),
        $('[class*="content"]').text(),
        $('.tbl_type01').text(),
        $('table').text()
      ];
      const description = normalizeWhitespace(
        contentAreas.find(text => text && text.length > 50) || 
        $('body').text().substring(0, 1000)
      );
      
      // Extract structured data from tables
      const details: Record<string, string> = {};
      
      // Try multiple table selectors
      const tableSelectors = [
        'table.tbl_type01 tr',
        'table.tbl-type01 tr',
        'table tr',
        '.info_table tr',
        '.detail_table tr'
      ];
      
      for (const selector of tableSelectors) {
        $(selector).each((_, row) => {
          const $row = $(row);
          const cells = $row.find('th, td');
          
          if (cells.length >= 2) {
            const label = normalizeWhitespace($(cells[0]).text());
            const value = normalizeWhitespace($(cells[1]).text());
            if (label && value && !label.includes('체크박스')) {
              details[label] = value;
            }
          }
        });
      }
      
      console.log('Work24: Extracted details:', Object.keys(details).length, 'fields');

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
      externalUrl: raw.url,
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