import type { Metadata, Viewport } from 'next';
import { Noto_Serif_KR, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const notoSerif = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Rabbit Crypt · 토끼굴',
  description: 'Simon(@simonkim_nft)의 토끼굴 블로그. 읽기 전과 읽은 후의 세계가 한 뼘 정도 어긋나 있는 글.',
  openGraph: {
    title: 'Rabbit Crypt · 토끼굴',
    description: '기술, 크립토, AI의 심층을 파고드는 블로그',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0D1117',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${notoSerif.variable} ${jetbrains.variable}`}>
      <body className="bg-[#0D1117] text-[#E6EDF3] antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
