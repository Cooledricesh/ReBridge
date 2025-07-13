import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Work24Adapter } from '../work24';
import { normalizeWhitespace } from '@rebridge/shared';

describe('Work24Adapter', () => {
  let adapter: Work24Adapter;

  beforeEach(() => {
    adapter = new Work24Adapter();
  });

  afterEach(async () => {
    await adapter.cleanup();
  });

  describe('normalizeData', () => {
    it('should normalize raw job data correctly', () => {
      const rawData = {
        source: 'work24' as const,
        externalId: '12345',
        url: 'https://www.work24.go.kr/wk/a/c/CA0301.do?jobId=12345',
        data: {
          title: '사무 보조원 모집',
          company: '(주)테스트기업',
          location: '서울특별시 강남구',
          deadline: '2024.12.31',
          listingHtml: '<tr>...</tr>'
        }
      };

      const normalized = adapter.normalizeData(rawData);

      expect(normalized.source).toBe('work24');
      expect(normalized.externalId).toBe('12345');
      expect(normalized.title).toBe('사무 보조원 모집');
      expect(normalized.company).toBe('(주)테스트기업');
      expect(normalized.locationJson).toEqual({ address: '서울특별시 강남구' });
      expect(normalized.isDisabilityFriendly).toBe(true);
      expect(normalized.expiresAt).toEqual(new Date('2024-12-31'));
      expect(normalized.rawData).toEqual(rawData);
    });

    it('should handle missing optional fields', () => {
      const rawData = {
        source: 'work24' as const,
        externalId: '12345',
        url: 'https://www.work24.go.kr/wk/a/c/CA0301.do?jobId=12345',
        data: {
          title: '사무 보조원 모집',
          listingHtml: '<tr>...</tr>'
        }
      };

      const normalized = adapter.normalizeData(rawData);

      expect(normalized.title).toBe('사무 보조원 모집');
      expect(normalized.company).toBeNull();
      expect(normalized.locationJson).toBeNull();
      expect(normalized.expiresAt).toBeNull();
    });
  });

  describe('salary parsing', () => {
    it('should parse yearly salary correctly', () => {
      const parsed = adapter['parseSalaryRange']('연봉 3000만원');
      expect(parsed).toEqual({ min: 30000000, currency: 'KRW' });
    });

    it('should parse monthly salary and convert to yearly', () => {
      const parsed = adapter['parseSalaryRange']('월급 200만원');
      expect(parsed).toEqual({ min: 24000000, currency: 'KRW' }); // 200만원 * 12
    });

    it('should parse hourly wage and convert to yearly', () => {
      const parsed = adapter['parseSalaryRange']('시급 10000원');
      expect(parsed).toEqual({ min: 19200000, currency: 'KRW' }); // 10000 * 8 * 20 * 12
    });

    it('should return null for unparseable salary', () => {
      const parsed = adapter['parseSalaryRange']('협의 후 결정');
      expect(parsed).toBeNull();
    });
  });

  describe('deadline parsing', () => {
    it('should parse Korean date format correctly', () => {
      const parsed = adapter['parseDeadline']('2024.12.31');
      expect(parsed).toEqual(new Date('2024-12-31'));
    });

    it('should parse dash-separated date format', () => {
      const parsed = adapter['parseDeadline']('2024-12-31');
      expect(parsed).toEqual(new Date('2024-12-31'));
    });

    it('should handle ongoing recruitment', () => {
      const parsed = adapter['parseDeadline']('상시모집');
      expect(parsed).toBeDefined();
      expect(parsed!.getTime()).toBeGreaterThan(new Date().getTime());
    });

    it('should return null for unparseable deadline', () => {
      const parsed = adapter['parseDeadline']('추후 공지');
      expect(parsed).toBeNull();
    });
  });

  describe('job ID extraction', () => {
    it('should extract job ID from onclick attribute', () => {
      const id = adapter['extractJobId']("fnJobDetail('12345')");
      expect(id).toBe('12345');
    });

    it('should return empty string for invalid onclick', () => {
      const id = adapter['extractJobId']('invalid');
      expect(id).toBe('');
    });
  });
});