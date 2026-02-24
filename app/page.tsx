'use client';

import { useState } from 'react';
import Link from 'next/link';
import { posts, Category } from '@/data/posts';
import DepthBadge from '@/components/DepthBadge';

const CATEGORIES: Category[] = [
  '🐇 탐험',
  '📖 소설',
  '🛠️ 빌딩',
  '✍️ 낙서',
];

const categoryShort: Record<string, string> = {
  '🐇 탐험': '탐험',
  '🛠️ 빌딩': '빌딩',
  '✍️ 낙서': '낙서',
  '📖 소설': '소설',
};

function getThumb(post: (typeof posts)[number]) {
  if (post.mediaUrls && post.mediaUrls.length > 0) return post.mediaUrls[0];
  return null;
}

function getExcerpt(content: string, maxLen: number) {
  const first = content.split('\n')[0].trim();
  if (first.length <= maxLen) return first;
  return first.slice(0, maxLen) + '…';
}

/* ─── Date formatter ─── */
function formatDate(dateStr: string) {
  const parts = dateStr.split('-');
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${months[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}`;
}

/* ─── Category color map ─── */
const categoryColors: Record<string, string> = {
  '🐇 탐험': '#D4922A',
  '✍️ 낙서': '#8B7CF6',
  '🛠️ 빌딩': '#2DD4BF',
  '📖 소설': '#F472B6',
};

/* ─── PostCard component ─── */
function PostCard({ post }: { post: (typeof posts)[number] }) {
  const thumb = getThumb(post);
  const hasVideo = !thumb && post.videoUrls && post.videoUrls.length > 0;
  const catColor = categoryColors[post.category] ?? '#D4922A';

  return (
    <Link
      href={`/posts/${post.slug}`}
      className="block group"
      style={{
        background: '#0D1826',
        border: '1px solid rgba(212,146,42,0.06)',
        borderLeft: `3px solid ${catColor}55`,
        padding: '1.25rem 1.375rem',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background 0.2s ease, border-left-color 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#0F1D2E';
        e.currentTarget.style.borderLeftColor = catColor;
        e.currentTarget.style.boxShadow = `inset 4px 0 20px ${catColor}18`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#0D1826';
        e.currentTarget.style.borderLeftColor = `${catColor}55`;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Card content row */}
      <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Category */}
          <div style={{ marginBottom: '0.625rem' }}>
            <span
              style={{
                color: '#D4922A',
                fontSize: '0.6875rem',
                fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                fontWeight: 400,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {categoryShort[post.category]}
            </span>
          </div>

          {/* Title */}
          <h2
            className="line-clamp-2"
            style={{
              color: '#F0E4CC',
              marginBottom: '0.5rem',
              fontFamily: "var(--font-title), Inter, 'Noto Sans KR', -apple-system, sans-serif",
              fontSize: '1.25rem',
              lineHeight: '1.35',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            {post.title}
          </h2>

          {/* Excerpt */}
          <p
            className="line-clamp-3"
            style={{
              color: 'rgba(240,228,204,0.4)',
              marginBottom: '1rem',
              fontFamily: "var(--font-serif), 'Noto Serif KR', Georgia, serif",
              fontSize: '0.8125rem',
              lineHeight: '1.65',
            }}
          >
            {getExcerpt(post.content, 300)}
          </p>
        </div>

        {/* Thumbnail */}
        {thumb && (
          <img
            src={thumb}
            alt=""
            className="group-hover:scale-[1.05] transition-transform duration-300"
            style={{
              width: '100px',
              height: '100px',
              objectFit: 'cover',
              
              flexShrink: 0,
              marginTop: '1.75rem',
            }}
          />
        )}
        {hasVideo && (
          <img
            src={post.videoUrls![0].replace(/\.mp4$/, '-thumb.jpg')}
            alt=""
            className="group-hover:scale-[1.05] transition-transform duration-300"
            style={{
              width: '100px',
              height: '100px',
              objectFit: 'cover',
              
              flexShrink: 0,
              marginTop: '1.75rem',
            }}
          />
        )}
      </div>

      {/* Meta — pinned to bottom */}
      <div
        className="flex items-center justify-between"
        style={{
          color: 'rgba(240,228,204,0.25)',
          fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
          fontWeight: 300,
          fontSize: '0.75rem',
          marginTop: 'auto',
          paddingTop: '0.75rem',
        }}
      >
        <span>{formatDate(post.date)}</span>
        <span>❤ {post.reactions}</span>
      </div>
    </Link>
  );
}

/* ─── FeaturedCard component ─── */
function FeaturedCard({ post }: { post: (typeof posts)[number] }) {
  const thumb = getThumb(post);

  return (
    <Link
      href={`/posts/${post.slug}`}
      className="block transition-all duration-200 group"
      style={{
        background: 'transparent',
        borderTop: '1px solid rgba(212,146,42,0.35)',
        borderBottom: '1px solid rgba(212,146,42,0.08)',
        padding: '2.5rem 0',
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '2.5rem',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderTopColor = 'rgba(212,146,42,0.7)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderTopColor = 'rgba(212,146,42,0.35)';
      }}
    >
      <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Category + LATEST badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span
              style={{
                color: '#D4922A',
                fontSize: '0.625rem',
                fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {categoryShort[post.category]}
            </span>
            <span style={{
              color: 'rgba(212,146,42,0.5)',
              fontSize: '0.5625rem',
              fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}>· LATEST</span>
          </div>

          {/* Title — bold and commanding */}
          <h2
            className="line-clamp-2"
            style={{
              color: '#F0E4CC',
              marginBottom: '1rem',
              fontFamily: "var(--font-title), Inter, 'Noto Sans KR', -apple-system, sans-serif",
              fontSize: '1.875rem',
              lineHeight: '1.25',
              fontWeight: 800,
              letterSpacing: '-0.035em',
            }}
          >
            {post.title}
          </h2>

          {/* Excerpt — 4 lines */}
          <p
            className="line-clamp-4"
            style={{
              color: 'rgba(240,228,204,0.5)',
              fontFamily: "var(--font-serif), 'Noto Serif KR', Georgia, serif",
              fontSize: '0.9375rem',
              lineHeight: '1.75',
              marginBottom: '1.5rem',
            }}
          >
            {getExcerpt(post.content, 400)}
          </p>

          {/* Meta */}
          <div
            className="flex items-center justify-between"
            style={{
              color: 'rgba(240,228,204,0.25)',
              fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
              fontWeight: 300,
              fontSize: '0.75rem',
            }}
          >
            <span>{formatDate(post.date)}</span>
            <span>❤ {post.reactions}</span>
          </div>
        </div>

        {/* Thumbnail — 4:3, cinematic */}
        {thumb && (
          <img
            src={thumb}
            alt=""
            className="group-hover:scale-[1.03] transition-transform duration-500"
            style={{
              width: '220px',
              height: '165px',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </Link>
  );
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');

  const sortedPosts = [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const filteredPosts =
    selectedCategory === 'all'
      ? sortedPosts
      : sortedPosts.filter((p) => p.category === selectedCategory);

  // Featured = first post; rest split into two masonry columns
  const featured = filteredPosts[0];
  const gridPosts = filteredPosts.slice(1);
  const leftCol = gridPosts.filter((_, i) => i % 2 === 0);
  const rightCol = gridPosts.filter((_, i) => i % 2 === 1);

  return (
    <div style={{ background: 'linear-gradient(180deg, #060A14 0%, #080E1A 15%, #0A1220 50%, #080E1A 100%)', color: '#F0E4CC', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Header — 로고 왼쪽, 메뉴 오른쪽, 한 줄 */}
      <header
        className="fixed top-0 left-0 right-[8px] z-50 h-14"
        style={{
          background: 'rgba(4,7,14,0.98)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(212,146,42,0.06)',
        }}
      >
        <div className="flex items-center justify-between h-full" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1.25rem' }}>
          {/* Logo */}
          <span
            style={{
              fontFamily: "var(--font-logo), 'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              color: '#F0E4CC',
              fontSize: '1.35rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase' as const,
              flexShrink: 0,
            }}
          >
            Rabbit Crypt
          </span>

          {/* Category nav */}
          <nav className="flex items-center overflow-x-auto no-scrollbar" style={{ gap: '1.25rem' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              className="flex-shrink-0 transition-all"
              style={{
                fontSize: '0.8rem',
                padding: '0.25rem 0',
                fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderBottom: '1.5px solid',
                ...(selectedCategory === 'all'
                  ? { color: '#D4922A', fontWeight: 700, borderBottomColor: '#D4922A' }
                  : { color: 'rgba(240,228,204,0.45)', fontWeight: 400, borderBottomColor: 'transparent' }),
              }}
            >
              전체
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="flex-shrink-0 transition-all"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.25rem 0',
                  fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: '1.5px solid',
                  ...(selectedCategory === cat
                    ? { color: '#D4922A', fontWeight: 700, borderBottomColor: '#D4922A' }
                    : { color: 'rgba(240,228,204,0.45)', fontWeight: 400, borderBottomColor: 'transparent' }),
                }}
              >
                {categoryShort[cat]}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '5rem 1.25rem 5rem', width: '100%' }}>

        {filteredPosts.length === 0 ? (
          <p
            className="text-center"
            style={{
              color: '#8A7A5E',
              paddingTop: '4rem',
              paddingBottom: '4rem',
              fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
              fontWeight: 300,
              fontSize: '0.875rem',
            }}
          >
            이 카테고리에 글이 없어요
          </p>
        ) : (
          <>
            {/* ═══ FEATURED — 최신 글 풀위스 ═══ */}
            {featured && <FeaturedCard post={featured} />}

            {/* ═══ MASONRY GRID — 데스크탑: 두 컬럼 flex, 모바일: 단일 컬럼 ═══ */}

            {/* 모바일: 단일 컬럼 (순서 유지) */}
            <div className="flex flex-col md:hidden" style={{ gap: '1.5rem' }}>
              {gridPosts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>

            {/* 데스크탑: 두 컬럼 masonry — 오른쪽 컬럼 2.5rem 아래서 시작 */}
            <div className="hidden md:flex" style={{ gap: '1.5rem', alignItems: 'flex-start' }}>
              {/* 왼쪽 컬럼 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {leftCol.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>

              {/* 오른쪽 컬럼 — 살짝 아래서 시작해서 처음부터 지그재그 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '2.5rem' }}>
                {rightCol.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer
        className="text-center"
        style={{
          borderTop: '1px solid rgba(212,146,42,0.08)',
          paddingTop: '2.5rem',
          paddingBottom: '2.5rem',
          color: '#8A7A5E',
          fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
          fontWeight: 300,
          fontSize: '0.75rem',
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-logo), 'Cormorant Garamond', Georgia, serif",
            color: 'rgba(212,146,42,0.4)',
            fontSize: '0.9rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase' as const,
            marginBottom: '0.5rem',
          }}
        >
          Rabbit Crypt
        </p>
        <p>
          <a
            href="https://t.me/simon_rabbit_hole"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
            style={{ color: '#8A7A5E' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#D4922A')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8A7A5E')}
          >
            @simon_rabbit_hole
          </a>
        </p>
      </footer>
    </div>
  );
}
