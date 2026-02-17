import type { Metadata, Viewport } from 'next';
import { Noto_Serif_KR, JetBrains_Mono, Playfair_Display, Noto_Sans_KR, Inter, Cinzel } from 'next/font/google';
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

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const notoSans = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-sans',
  display: 'swap',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-logo',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-title',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Rabbit Crypt · 토끼굴',
  description: 'Simon(@simonkim_nft)의 토끼굴 블로그. 읽기 전과 읽은 후의 세계가 한 뼘 정도 어긋나 있는 글.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Rabbit Crypt · 토끼굴',
    description: '기술, 크립토, AI의 심층을 파고드는 블로그',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#080E1A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${notoSerif.variable} ${jetbrains.variable} ${playfairDisplay.variable} ${notoSans.variable} ${inter.variable} ${cinzel.variable}`}>
      <body
        className="antialiased min-h-screen"
        style={{ background: '#080E1A', color: '#F0E4CC' }}
      >
        {children}
      </body>
    </html>
  );
}
