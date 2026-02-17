'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Post } from '@/data/posts';
import DepthBadge from './DepthBadge';

interface CardSwipeProps {
  posts: Post[];
}

const categoryShort: Record<string, string> = {
  '🐇 토끼굴': '토끼굴',
  '🛠️ 빌더 일지': '빌더일지',
  '📡 시그널': '시그널',
  '💭 단상': '단상',
};

export default function CardSwipe({ posts }: CardSwipeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [enterDir, setEnterDir] = useState<'left' | 'right' | null>(null);

  const goNext = useCallback(() => {
    if (isAnimating || currentIndex >= posts.length - 1) return;
    setIsAnimating(true);
    setEnterDir('left');
    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setIsAnimating(false);
      setDragDelta(0);
    }, 220);
  }, [isAnimating, currentIndex, posts.length]);

  const goPrev = useCallback(() => {
    if (isAnimating || currentIndex <= 0) return;
    setIsAnimating(true);
    setEnterDir('right');
    setTimeout(() => {
      setCurrentIndex((i) => i - 1);
      setIsAnimating(false);
      setDragDelta(0);
    }, 220);
  }, [isAnimating, currentIndex]);

  /* ─── Touch handlers ─── */
  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartX(e.touches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartX === null) return;
    setDragDelta(e.touches[0].clientX - dragStartX);
  };
  const handleTouchEnd = () => {
    if (Math.abs(dragDelta) > 55) {
      dragDelta < 0 ? goNext() : goPrev();
    } else {
      setDragDelta(0);
    }
    setDragStartX(null);
  };

  /* ─── Mouse handlers ─── */
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStartX(e.clientX);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStartX === null) return;
    setDragDelta(e.clientX - dragStartX);
  };
  const handleMouseUp = () => {
    if (Math.abs(dragDelta) > 55) {
      dragDelta < 0 ? goNext() : goPrev();
    } else {
      setDragDelta(0);
    }
    setDragStartX(null);
  };

  const post = posts[currentIndex];
  if (!post) {
    return (
      <div className="h-full flex items-center justify-center text-[#8B949E] font-mono text-sm">
        // no posts found
      </div>
    );
  }

  const liveTransform =
    dragStartX !== null && !isAnimating
      ? `translateX(${dragDelta * 0.12}px)`
      : 'translateX(0)';

  const progress = ((currentIndex + 1) / posts.length) * 100;
  const catLabel = categoryShort[post.category] ?? post.category;

  return (
    <div className="h-full flex flex-col select-none">
      {/* ─── Main card area ─── */}
      <div
        className="flex-1 relative overflow-hidden card-bg-glow cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={dragStartX !== null ? handleMouseMove : undefined}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Subtle radial teal glow — decorative */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 50% 40% at 15% 55%, rgba(0,180,216,0.06) 0%, transparent 70%)',
          }}
        />

        {/* Card content */}
        <div
          key={currentIndex}
          className={`h-full flex flex-col px-6 md:px-12 py-6 ${
            enterDir === 'left'
              ? 'card-enter-left'
              : enterDir === 'right'
              ? 'card-enter-right'
              : ''
          }`}
          style={{ transform: liveTransform, transition: dragStartX !== null ? 'none' : undefined }}
        >
          {/* ── Top row: category badge + counter ── */}
          <div className="flex items-center justify-between mb-6">
            <span
              className="font-mono text-xs px-2.5 py-1 rounded"
              style={{
                color: '#00B4D8',
                border: '1px solid rgba(0,180,216,0.35)',
                background: 'rgba(0,180,216,0.08)',
              }}
            >
              [{catLabel}]
            </span>
            <span className="font-mono text-xs text-[#8B949E]">
              {String(currentIndex + 1).padStart(2, '0')}&nbsp;/&nbsp;{String(posts.length).padStart(2, '0')}
            </span>
          </div>

          {/* ── Center: quote block ── */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Terminal prompt decoration */}
            <div
              className="font-mono text-3xl leading-none mb-5 select-none"
              style={{ color: 'rgba(0,180,216,0.25)' }}
            >
              &gt;_
            </div>

            {/* Main summary — serif for Korean readability */}
            <p
              className="text-[#E6EDF3] leading-relaxed mb-6 max-w-2xl"
              style={{
                fontFamily: 'var(--font-serif), "Noto Serif KR", Georgia, serif',
                fontSize: 'clamp(1.15rem, 2.5vw, 1.6rem)',
              }}
            >
              {post.summary}
            </p>
          </div>

          {/* ── Bottom: meta row ── */}
          <div
            className="pt-5 mt-auto"
            style={{ borderTop: '1px solid #30363D' }}
          >
            {/* Title */}
            <p className="font-mono text-[#8B949E] text-sm mb-4 line-clamp-1">
              <span style={{ color: 'rgba(0,180,216,0.5)' }}>// </span>
              {post.title}
            </p>

            {/* Badges + CTA */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <DepthBadge depth={post.depth} />
                <span className="font-mono text-[#8B949E] text-xs">{post.date}</span>
                <span className="font-mono text-[#8B949E] text-xs">❤ {post.reactions}</span>
              </div>
              <Link
                href={`/posts/${post.slug}`}
                className="font-mono text-sm transition-colors group flex items-center gap-1"
                style={{ color: '#00B4D8' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#E6EDF3')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#00B4D8')}
                onClick={(e) => e.stopPropagation()}
              >
                전체 읽기
                <span className="group-hover:translate-x-0.5 inline-block transition-transform">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Progress bar ─── */}
      <div className="h-[2px] bg-[#161B22]">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, background: '#00B4D8' }}
        />
      </div>

      {/* ─── Bottom nav ─── */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ borderTop: '1px solid #161B22' }}
      >
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="font-mono text-xs transition-colors disabled:opacity-20"
          style={{ color: '#8B949E' }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) e.currentTarget.style.color = '#00B4D8';
          }}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#8B949E')}
        >
          ← prev
        </button>

        {/* Progress dots (max 9 shown) */}
        <div className="flex items-center gap-1">
          {posts.slice(0, Math.min(posts.length, 9)).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className="transition-all rounded-full"
              style={{
                width: i === currentIndex % 9 ? '16px' : '5px',
                height: '5px',
                background: i === currentIndex % 9 ? '#00B4D8' : '#30363D',
              }}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={currentIndex >= posts.length - 1}
          className="font-mono text-xs transition-colors disabled:opacity-20"
          style={{ color: '#8B949E' }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) e.currentTarget.style.color = '#00B4D8';
          }}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#8B949E')}
        >
          next →
        </button>
      </div>
    </div>
  );
}
