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

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');

  const sortedPosts = [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const filteredPosts =
    selectedCategory === 'all'
      ? sortedPosts
      : sortedPosts.filter((p) => p.category === selectedCategory);

  const rest = filteredPosts;

  return (
    <div style={{ background: '#080E1A', color: '#F0E4CC', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-14"
        style={{
          background: 'rgba(8,14,26,0.95)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center justify-between h-full" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1.25rem' }}>
          <div className="flex items-center" style={{ gap: '0.5rem' }}>
            <img src="/logo.png" width="34" height="34" alt="Rabbit Crypt" style={{ display: 'block', borderRadius: '5px' }} />
            <span
              style={{
                fontFamily: "var(--font-display), var(--font-serif), 'Noto Serif KR', Georgia, serif",
                fontWeight: 700,
                color: '#F0E4CC',
                fontSize: '1.0625rem',
                letterSpacing: '0.01em',
              }}
            >
              Rabbit Crypt
            </span>
            <span style={{ color: 'rgba(212,146,42,0.3)', fontSize: '0.75rem' }} className="hidden sm:inline">·</span>
            <span
              className="hidden sm:inline"
              style={{
                fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                color: '#8A7A5E',
                fontSize: '0.75rem',
                fontWeight: 300,
              }}
            >
              토끼굴
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="pt-14 min-h-screen" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Category filter */}
        <div
          className="fixed z-40"
          style={{
            top: '56px',
            left: 0,
            right: 0,
            background: 'rgba(8,14,26,0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(212,146,42,0.1)',
            padding: '0.75rem 0',
          }}
        >
          <div
            className="flex overflow-x-auto no-scrollbar"
            style={{ gap: '0.5rem', maxWidth: '1000px', margin: '0 auto', padding: '0 1.25rem' }}
          >
            <button
              onClick={() => setSelectedCategory('all')}
              className="flex-shrink-0 transition-all"
              style={{
                fontSize: '0.8125rem',
                padding: '0.375rem 1.125rem',
                borderRadius: '999px',
                fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                fontWeight: 400,
                border: '1px solid',
                cursor: 'pointer',
                ...(selectedCategory === 'all'
                  ? { color: '#080E1A', borderColor: '#D4922A', background: '#D4922A' }
                  : { color: 'rgba(240,228,204,0.5)', borderColor: 'rgba(212,146,42,0.2)', background: 'transparent' }),
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
                  fontSize: '0.8125rem',
                  padding: '0.375rem 1.125rem',
                  borderRadius: '999px',
                  fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                  fontWeight: 400,
                  border: '1px solid',
                  cursor: 'pointer',
                  ...(selectedCategory === cat
                    ? { color: '#080E1A', borderColor: '#D4922A', background: '#D4922A' }
                    : { color: 'rgba(240,228,204,0.5)', borderColor: 'rgba(212,146,42,0.2)', background: 'transparent' }),
                }}
              >
                {categoryShort[cat]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '7.5rem 1.25rem 5rem', width: '100%' }}>

          {/* ═══ POST GRID ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '1.5rem' }}>
            {rest.map((post, idx) => {
              const thumb = getThumb(post);
              const hasVideo = !thumb && post.videoUrls && post.videoUrls.length > 0;

              return (
                <Link
                  key={post.slug}
                  href={`/posts/${post.slug}`}
                  className="block rounded-xl transition-all duration-200 group"
                  style={{
                    background: '#0D1826',
                    border: '1px solid rgba(212,146,42,0.08)',
                    padding: '1.25rem 1.375rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,146,42,0.35)';
                    e.currentTarget.style.background = '#0F1D2E';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212,146,42,0.08)';
                    e.currentTarget.style.background = '#0D1826';
                  }}
                >
                  {/* Card with thumbnail */}
                  <div style={{ display: 'flex', gap: '1rem' }}>
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
                          fontFamily: "var(--font-serif), 'Noto Serif KR', Georgia, serif",
                          fontSize: '1.0625rem',
                          lineHeight: '1.45',
                          fontWeight: 600,
                        }}
                      >
                        {post.title}
                      </h2>

                      {/* Summary */}
                      <p
                        className="line-clamp-2"
                        style={{
                          color: 'rgba(240,228,204,0.4)',
                          marginBottom: '1rem',
                          fontFamily: "var(--font-serif), 'Noto Serif KR', Georgia, serif",
                          fontSize: '0.875rem',
                          lineHeight: '1.6',
                        }}
                      >
                        {post.summary}
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
                        <span>{post.date}</span>
                        <span>❤ {post.reactions}</span>
                      </div>
                    </div>

                    {/* Thumbnail — aligned to title top */}
                    {thumb && (
                      <img
                        src={thumb}
                        alt=""
                        className="group-hover:scale-[1.05] transition-transform duration-300"
                        style={{
                          width: '100px',
                          height: '100px',
                          objectFit: 'cover',
                          borderRadius: '0.375rem',
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
                          borderRadius: '0.375rem',
                          flexShrink: 0,
                          marginTop: '1.75rem',
                        }}
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {filteredPosts.length === 0 && (
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
              fontFamily: "var(--font-display), var(--font-serif), 'Noto Serif KR', serif",
              color: 'rgba(212,146,42,0.4)',
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
            }}
          >
            Rabbit Crypt · 토끼굴
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
    </div>
  );
}
