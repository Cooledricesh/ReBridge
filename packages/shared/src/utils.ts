export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+/g);
  return matches ? matches.map(Number) : [];
}

export function parseKoreanCurrency(text: string): number | null {
  const normalized = text.replace(/[^\d]/g, '');
  const num = parseInt(normalized, 10);
  
  if (isNaN(num)) return null;
  
  // Handle common Korean currency units
  if (text.includes('만원')) {
    return num * 10000;
  } else if (text.includes('천원')) {
    return num * 1000;
  } else if (text.includes('억원')) {
    return num * 100000000;
  }
  
  return num;
}

export function isExpired(date: Date | null | undefined): boolean {
  if (!date) return false;
  return new Date() > date;
}