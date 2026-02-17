'use client';

import { useState } from 'react';
import Link from 'next/link';
import { posts, Category } from '@/data/posts';
import DepthBadge from '@/components/DepthBadge';

const CATEGORIES: Category[] = [
  '🐇 탐험',
  '🛠️ 빌딩',
  '💭 단상',
  '📖 소설',
];

const categoryShort: Record<string, string> = {
  '🐇 탐험': '탐험',
  '🛠️ 빌딩': '빌딩',
  '💭 단상': '단상',
  '📖 소설': '소설',
};

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');

  const sortedPosts = [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const filteredPosts =
    selectedCategory === 'all'
      ? sortedPosts
      : sortedPosts.filter((p) => p.category === selectedCategory);

  return (
    <div style={{ background: '#080E1A', color: '#F0E4CC', minHeight: '100vh' }}>
      {/* ═══════════════════════════════════════════
          Fixed Header — always on top
      ═══════════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between"
        style={{
          background: 'rgba(8,14,26,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(212,146,42,0.15)',
          paddingLeft: '1.25rem',
          paddingRight: '1.25rem',
        }}
      >
        {/* Logo */}
        <div className="flex items-center" style={{ gap: '0.5rem' }}>
          <img src="/favicon.svg" width="28" height="28" alt="Rabbit Crypt" style={{ display: 'block' }} />
          <span
            style={{
              fontFamily: "var(--font-display), var(--font-serif), 'Noto Serif KR', Georgia, serif",
              fontWeight: 700,
              color: '#F0E4CC',
              fontSize: '0.9375rem',
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
      </header>

      {/* ═══════════════════════════════════════════
          LIST VIEW — scrollable
      ═══════════════════════════════════════════ */}
      <div className="pt-12 min-h-screen">
        {/* Category filter — fixed below header */}
        <div
          className="fixed z-40"
          style={{
            top: '48px',
            left: 0,
            right: 0,
            background: 'rgba(8,14,26,0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(212,146,42,0.1)',
            padding: '0.75rem 1.25rem',
          }}
        >
          <div
            className="flex overflow-x-auto no-scrollbar max-w-4xl mx-auto"
            style={{ gap: '0.5rem' }}
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
                  ? {
                      color: '#080E1A',
                      borderColor: '#D4922A',
                      background: '#D4922A',
                    }
                  : {
                      color: 'rgba(240,228,204,0.5)',
                      borderColor: 'rgba(212,146,42,0.2)',
                      background: 'transparent',
                    }),
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
                    ? {
                        color: '#080E1A',
                        borderColor: '#D4922A',
                        background: '#D4922A',
                      }
                    : {
                        color: 'rgba(240,228,204,0.5)',
                        borderColor: 'rgba(212,146,42,0.2)',
                        background: 'transparent',
                      }),
                }}
              >
                {categoryShort[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Post grid ── */}
        <div className="max-w-4xl mx-auto" style={{ padding: '7.5rem 1.25rem 7rem' }}>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '1.25rem' }}>
            {filteredPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/posts/${post.slug}`}
                className="block rounded-xl transition-all duration-200 group"
                style={{
                  background: '#0D1826',
                  border: '1px solid rgba(212,146,42,0.12)',
                  padding: '1.25rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,146,42,0.45)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(212,146,42,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,146,42,0.12)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Card inner: text left, thumbnail right */}
                <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                  {/* Text content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Category + depth row */}
                    <div className="flex items-center" style={{ gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <span
                        className="text-xs"
                        style={{
                          color: '#D4922A',
                          fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                          fontWeight: 400,
                          borderBottom: '1px solid rgba(212,146,42,0.4)',
                          paddingBottom: '1px',
                        }}
                      >
                        {categoryShort[post.category]}
                      </span>
                      <span style={{ color: 'rgba(212,146,42,0.3)', fontSize: '0.625rem' }}>·</span>
                      <DepthBadge depth={post.depth} />
                    </div>

                    {/* Title */}
                    <h2
                      className="text-[15px] leading-snug line-clamp-2 transition-colors"
                      style={{
                        color: '#F0E4CC',
                        marginBottom: '0.5rem',
                        fontFamily: "var(--font-serif), 'Noto Serif KR', Georgia, serif",
                      }}
                    >
                      {post.title}
                    </h2>

                    {/* Summary */}
                    <p
                      className="text-sm leading-relaxed line-clamp-2"
                      style={{
                        color: '#8A7A5E',
                        marginBottom: '1rem',
                        fontFamily: "var(--font-serif), 'Noto Serif KR', Georgia, serif",
                      }}
                    >
                      {post.summary}
                    </p>

                    {/* Meta */}
                    <div
                      className="flex items-center justify-between text-xs"
                      style={{
                        color: '#8A7A5E',
                        fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                        fontWeight: 300,
                      }}
                    >
                      <span>{post.date}</span>
                      <span>❤ {post.reactions}</span>
                    </div>
                  </div>

                  {/* Thumbnail (if post has media) */}
                  {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <img
                      src={post.mediaUrls[0]}
                      alt=""
                      style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(212,146,42,0.15)',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {(!post.mediaUrls || post.mediaUrls.length === 0) && post.videoUrls && post.videoUrls.length > 0 && (
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(212,146,42,0.15)',
                        background: 'rgba(212,146,42,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '1.5rem',
                      }}
                    >
                      🎬
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <p
              className="text-center text-sm"
              style={{
                color: '#8A7A5E',
                paddingTop: '4rem',
                paddingBottom: '4rem',
                fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                fontWeight: 300,
              }}
            >
              이 카테고리에 글이 없어요
            </p>
          )}
        </div>

        {/* Footer */}
        <footer
          className="text-center text-xs"
          style={{
            borderTop: '1px solid rgba(212,146,42,0.1)',
            paddingTop: '2rem',
            paddingBottom: '2rem',
            color: '#8A7A5E',
            fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
            fontWeight: 300,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display), var(--font-serif), 'Noto Serif KR', serif",
              color: 'rgba(212,146,42,0.5)',
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
