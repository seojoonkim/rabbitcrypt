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

type View = 'swipe' | 'list';

export default function Home() {
  const [view, setView] = useState<View>('swipe');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');

  const filteredPosts =
    selectedCategory === 'all'
      ? posts
      : posts.filter((p) => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#0B0E1A] flex flex-col">
      {/* Header */}
      <header className="pt-8 pb-4 px-5 flex flex-col items-center border-b border-white/5">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl rabbit-glow">🐇</span>
          <h1 className="text-2xl font-bold text-white tracking-tight rabbit-glow">
            Rabbit Crypt
          </h1>
        </div>
        <p className="text-white/40 text-sm">토끼굴</p>

        {/* View toggle */}
        <div className="flex gap-1 mt-5 bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setView('swipe')}
            className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
              view === 'swipe'
                ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            ✦ 인사이트 카드
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-4 py-1.5 rounded-lg text-sm transition-all ${
              view === 'list'
                ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            ≡ 전체 글
          </button>
        </div>
      </header>

      {/* Swipe View */}
      {view === 'swipe' && (
        <div className="flex-1" style={{ minHeight: '60vh' }}>
          <CardSwipe posts={filteredPosts} />
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm border transition-all ${
                selectedCategory === 'all'
                  ? 'bg-amber-400/20 text-amber-400 border-amber-400/40'
                  : 'border-white/10 text-white/40 hover:text-white/60'
              }`}
            >
              전체
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm border transition-all ${
                  selectedCategory === cat
                    ? 'bg-amber-400/20 text-amber-400 border-amber-400/40'
                    : 'border-white/10 text-white/40 hover:text-white/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Post list */}
          <div className="space-y-3">
            {filteredPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/posts/${post.slug}`}
                className="block bg-[#131726] border border-white/8 rounded-2xl p-5 hover:border-amber-400/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="text-white font-medium text-[15px] leading-snug group-hover:text-amber-100 transition-colors">
                    {post.title}
                  </h2>
                  <span className="text-white/30 text-xs flex-shrink-0 mt-0.5">
                    {new Date(post.date).toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <p className="text-white/50 text-sm leading-relaxed mb-3 line-clamp-2">
                  {post.summary}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/30">{post.category}</span>
                  <DepthBadge depth={post.depth} />
                  <span className="text-white/30 text-xs ml-auto">❤️ {post.reactions}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-white/20 text-xs py-6 border-t border-white/5">
        <p>Rabbit Crypt · 토끼굴</p>
        <p className="mt-1">
          <a
            href="https://t.me/simon_rabbit_hole"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-400/60 transition-colors"
          >
            @simon_rabbit_hole
          </a>
        </p>
      </footer>
    </div>
  );
}
