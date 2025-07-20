import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getCrawlerKeywords(): Promise<string[]> {
  try {
    // 크롤러 설정 가져오기
    let config = await prisma.crawlerConfig.findFirst();
    
    // 설정이 없으면 기본값으로 생성
    if (!config) {
      config = await prisma.crawlerConfig.create({
        data: {
          keywords: ['장애인']
        }
      });
    }
    
    return config.keywords;
  } catch (error) {
    console.error('Error fetching crawler keywords:', error);
    // 에러 발생 시 기본값 반환
    return ['장애인'];
  }
}

export async function buildSearchQuery(keywords: string[]): Promise<string> {
  // 키워드들을 OR 조건으로 연결
  return keywords.join(' OR ');
}

export async function checkKeywordsInText(text: string, keywords: string[]): Promise<boolean> {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}