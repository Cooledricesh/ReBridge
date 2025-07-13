import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import { Toaster } from 'sonner';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: 'ReBridge - 정신장애인을 위한 채용 플랫폼',
  description: '정신장애인을 위한 맞춤형 채용정보를 한 곳에서 확인하세요. 워크투게더, 사람인, 고용24, 잡코리아의 장애인 채용공고를 통합 제공합니다.',
  keywords: '정신장애인 채용, 장애인 취업, 채용정보, 워크투게더, 사람인, 고용24, 장애인 일자리',
  authors: [{ name: 'ReBridge Team' }],
  openGraph: {
    title: 'ReBridge - 정신장애인을 위한 채용 플랫폼',
    description: '정신장애인을 위한 맞춤형 채용정보를 한 곳에서 확인하세요',
    url: 'https://rebridge.kr',
    siteName: 'ReBridge',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReBridge - 정신장애인을 위한 채용 플랫폼',
    description: '정신장애인을 위한 맞춤형 채용정보를 한 곳에서 확인하세요',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <Header />
          <main className="min-h-screen">{children}</main>
        </Providers>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}