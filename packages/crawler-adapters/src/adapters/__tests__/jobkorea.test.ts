import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JobKoreaAdapter } from '../jobkorea';
import * as cheerio from 'cheerio';

describe('JobKoreaAdapter', () => {
  let adapter: JobKoreaAdapter;

  beforeEach(() => {
    adapter = new JobKoreaAdapter();
  });

  afterEach(async () => {
    await adapter.cleanup();
  });

  describe('normalizeData', () => {
    it('should normalize raw job data correctly', async () => {
      const rawData = {
        source: 'jobkorea' as const,
        externalId: '12345678',
        url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/12345678',
        data: {
          title: '[장애인채용] 사무직 직원 모집',
          company: '테스트기업(주)',
          location: '서울 강남구',
          deadline: '~12/31(월)',
          listingHtml: '<div>...</div>'
        }
      };

      const normalized = await adapter.normalizeData(rawData);

      expect(normalized.source).toBe('jobkorea');
      expect(normalized.externalId).toBe('12345678');
      expect(normalized.title).toBe('[장애인채용] 사무직 직원 모집');
      expect(normalized.company).toBe('테스트기업(주)');
      expect(normalized.locationJson).toEqual({ address: '서울 강남구' });
      expect(normalized.isDisabilityFriendly).toBe(true); // 제목에 '장애인' 포함
      expect(normalized.rawData).toEqual(rawData);
    });

    it('should detect disability-friendly by title keywords', async () => {
      const testCases = [
        { title: '장애인 우대 채용', expected: true },
        { title: '장애우 환영', expected: true },
        { title: '일반 사무직 모집', expected: false }
      ];

      for (const { title, expected } of testCases) {
        const rawData = {
          source: 'jobkorea' as const,
          externalId: '12345',
          url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/12345',
          data: { title, listingHtml: '' }
        };

        const normalized = await adapter.normalizeData(rawData);
        expect(normalized.isDisabilityFriendly).toBe(expected);
      }
    });
  });

  describe('salary parsing', () => {
    it('should parse salary range correctly', () => {
      const parsed = adapter['parseSalaryRange']('3000만원~4000만원');
      expect(parsed).toEqual({ 
        min: 30000000, 
        max: 40000000, 
        currency: 'KRW' 
      });
    });

    it('should parse yearly salary', () => {
      const parsed = adapter['parseSalaryRange']('연봉 3500만원');
      expect(parsed).toEqual({ min: 35000000, currency: 'KRW' });
    });

    it('should parse monthly salary and convert to yearly', () => {
      const parsed = adapter['parseSalaryRange']('월 250만원');
      expect(parsed).toEqual({ min: 30000000, currency: 'KRW' });
    });

    it('should return null for unparseable salary', () => {
      const parsed = adapter['parseSalaryRange']('회사내규에 따름');
      expect(parsed).toBeNull();
    });
  });

  describe('deadline parsing', () => {
    it('should parse full date format', () => {
      const parsed = adapter['parseDeadline']('2024.12.31');
      expect(parsed).toEqual(new Date('2024-12-31'));
    });

    it('should parse short date format with current year', () => {
      const currentYear = new Date().getFullYear();
      const parsed = adapter['parseDeadline']('12/31(월)');
      expect(parsed).toEqual(new Date(`${currentYear}-12-31`));
    });

    it('should handle ongoing recruitment keywords', () => {
      const keywords = ['상시채용', '채용시까지', '수시모집'];
      keywords.forEach(keyword => {
        const parsed = adapter['parseDeadline'](keyword);
        expect(parsed).toBeDefined();
        expect(parsed!.getTime()).toBeGreaterThan(new Date().getTime());
      });
    });
  });

  describe('job ID extraction', () => {
    it('should extract job ID from standard URL pattern', () => {
      const id = adapter['extractJobId']('/Recruit/GI_Read/12345678');
      expect(id).toBe('12345678');
    });

    it('should extract job ID from query parameter', () => {
      const id = adapter['extractJobId']('/Recruit/View?Gicode=98765432');
      expect(id).toBe('98765432');
    });

    it('should return empty string for invalid URL', () => {
      const id = adapter['extractJobId']('/some/other/path');
      expect(id).toBe('');
    });
  });

  describe('checkDisabilityFriendly', () => {
    it('should detect disability keywords in HTML content', () => {
      const testHtml = `
        <div>
          <h1>채용공고</h1>
          <p>장애인 우대 채용합니다.</p>
        </div>
      `;
      const $ = cheerio.load(testHtml);
      const result = adapter['checkDisabilityFriendly']($);
      expect(result).toBe(true);
    });

    it('should return false when no disability keywords found', () => {
      const testHtml = `
        <div>
          <h1>일반 채용공고</h1>
          <p>경력직 개발자를 모집합니다.</p>
        </div>
      `;
      const $ = cheerio.load(testHtml);
      const result = adapter['checkDisabilityFriendly']($);
      expect(result).toBe(false);
    });
  });
});