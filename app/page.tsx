'use client';

import { useState } from 'react';
import Link from 'next/link';
import { posts, Category } from '@/data/posts';
import CardSwipe from '@/components/CardSwipe';
import DepthBadge from '@/components/DepthBadge';

const CATEGORIES: Category[] = [
  '🐇 토끼굴',
  '🛠️ 빌더 일지',
  '📡 시그널',
  '💭 단상',
];

const categoryShort: Record<string, string> = {
  '🐇 토끼굴': '토끼굴',
  '🛠️ 빌더 일지': '빌더일지',
  '📡 시그널': '시그널',
  '💭 단상': '단상',
};

type View = 'swipe' | 'list';

export default function Home() {
  const [view, setView] = useState<View>('swipe');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');

  const filteredPosts =
    selectedCategory === 'all'
      ? posts
      : posts.filter((p) => p.category === selectedCategory);

  return (
    <div className="bg-[#0D1117] text-[#E6EDF3]">
      {/* ═══════════════════════════════════════════
          Fixed Header — always on top
      ═══════════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-5"
        style={{
          background: 'rgba(13,17,23,0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #30363D',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-base select-none">🐇</span>
          <span className="font-mono font-bold text-[#E6EDF3] text-sm terminal-cursor">
            Rabbit Crypt
          </span>
          <span className="font-mono text-[#30363D] text-xs hidden sm:inline">·</span>
          <span className="font-mono text-[#8B949E] text-xs hidden sm:inline">토끼굴</span>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('swipe')}
            className="font-mono text-xs px-3 py-1 rounded border transition-all"
            style={
              view === 'swipe'
                ? {
                    color: '#00B4D8',
                    borderColor: 'rgba(0,180,216,0.5)',
                    background: 'rgba(0,180,216,0.1)',
                  }
                : {
                    color: '#8B949E',
                    borderColor: '#30363D',
                    background: 'transparent',
                  }
            }
          >
            [카드]
          </button>
          <button
            onClick={() => setView('list')}
            className="font-mono text-xs px-3 py-1 rounded border transition-all"
            style={
              view === 'list'
                ? {
                    color: '#00B4D8',
                    borderColor: 'rgba(0,180,216,0.5)',
                    background: 'rgba(0,180,216,0.1)',
                  }
                : {
                    color: '#8B949E',
                    borderColor: '#30363D',
                    background: 'transparent',
                  }
            }
          >
            [목록]
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          SWIPE VIEW — fullscreen fixed overlay
      ═══════════════════════════════════════════ */}
      {view === 'swipe' && (
        <div
          className="fixed left-0 right-0 bottom-0"
          style={{ top: '48px' }}
        >
          <CardSwipe posts={filteredPosts} />
        </div>
      )}

      {/* ═══════════════════════════════════════════
          LIST VIEW — scrollable
      ═══════════════════════════════════════════ */}
      {view === 'list' && (
        <div className="pt-12 min-h-screen">
          {/* Category filter — sticky below header */}
          <div
            className="sticky z-40 px-4 py-3"
            style={{
              top: '48px',
              background: 'rgba(13,17,23,0.95)',
              backdropFilter: 'blur(8px)',
              borderBottom: '1px solid #30363D',
            }}
          >
            <div className="flex overflow-x-auto no-scrollbar max-w-4xl mx-auto" style={{ gap: '0.5rem' }}>
              <button
                onClick={() => setSelectedCategory('all')}
                className="flex-shrink-0 font-mono text-xs px-3 py-1 rounded border transition-all"
                style={
                  selectedCategory === 'all'
                    ? {
                        color: '#00B4D8',
                        borderColor: 'rgba(0,180,216,0.5)',
                        background: 'rgba(0,180,216,0.1)',
                      }
                    : { color: '#8B949E', borderColor: '#30363D' }
                }
              >
                [전체]
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="flex-shrink-0 font-mono text-xs px-3 py-1 rounded border transition-all"
                  style={
                    selectedCategory === cat
                      ? {
                          color: '#00B4D8',
                          borderColor: 'rgba(0,180,216,0.5)',
                          background: 'rgba(0,180,216,0.1)',
                        }
                      : { color: '#8B949E', borderColor: '#30363D' }
                  }
                >
                  [{categoryShort[cat]}]
                </button>
              ))}
            </div>
          </div>

          {/* ── Post grid ── */}
          <div className="max-w-4xl mx-auto" style={{ padding: '1.5rem 1.25rem 4rem' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/posts/${post.slug}`}
                  className="block rounded-lg transition-all duration-200 group"
                  style={{
                    background: '#161B22',
                    border: '1px solid #30363D',
                    padding: '1.25rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0,180,216,0.5)';
                    e.currentTarget.style.boxShadow = '0 0 16px rgba(0,180,216,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#30363D';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Category + depth row */}
                  <div className="flex items-center" style={{ gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span
                      className="font-mono text-xs px-2 py-0.5 rounded"
                      style={{
                        color: '#00B4D8',
                        border: '1px solid rgba(0,180,216,0.3)',
                        background: 'rgba(0,180,216,0.07)',
                      }}
                    >
                      [{categoryShort[post.category]}]
                    </span>
                    <DepthBadge depth={post.depth} />
                  </div>

                  {/* Title */}
                  <h2
                    className="text-[#E6EDF3] text-[15px] leading-snug line-clamp-2 transition-colors"
                    style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-serif), "Noto Serif KR", Georgia, serif' }}
                  >
                    {post.title}
                  </h2>

                  {/* Summary */}
                  <p className="text-[#8B949E] text-sm leading-relaxed line-clamp-2" style={{ marginBottom: '1rem' }}>
                    {post.summary}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between font-mono text-xs text-[#8B949E]">
                    <span>{post.date}</span>
                    <span>❤ {post.reactions}</span>
                  </div>
                </Link>
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <p className="text-center font-mono text-[#8B949E] text-sm py-16">
                // no posts in this category
              </p>
            )}
          </div>

          {/* Footer */}
          <footer
            className="text-center font-mono text-xs text-[#8B949E] py-8"
            style={{ borderTop: '1px solid #30363D' }}
          >
            <p>// Rabbit Crypt · 토끼굴</p>
            <p className="mt-2">
              <a
                href="https://t.me/simon_rabbit_hole"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: '#8B949E' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#00B4D8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#8B949E')}
              >
                @simon_rabbit_hole
              </a>
            </p>
          </footer>
        </div>
      )}
    </div>
  );
}
