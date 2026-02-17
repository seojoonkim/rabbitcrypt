'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Post } from '@/data/posts';
import DepthBadge from './DepthBadge';

interface CardSwipeProps {
  posts: Post[];
}

export default function CardSwipe({ posts }: CardSwipeProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [exitDir, setExitDir] = useState<'up' | 'down' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const goNext = useCallback(() => {
    if (isAnimating || currentIndex >= posts.length - 1) return;
    setExitDir('up');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setExitDir(null);
      setIsAnimating(false);
      setDragDelta(0);
    }, 300);
  }, [isAnimating, currentIndex, posts.length]);

  const goPrev = useCallback(() => {
    if (isAnimating || currentIndex <= 0) return;
    setExitDir('down');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((i) => i - 1);
      setExitDir(null);
      setIsAnimating(false);
      setDragDelta(0);
    }, 300);
  }, [isAnimating, currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY === null) return;
    const delta = dragStartY - e.touches[0].clientY;
    setDragDelta(delta);
  };

  const handleTouchEnd = () => {
    if (Math.abs(dragDelta) > 60) {
      if (dragDelta > 0) goNext();
      else goPrev();
    } else {
      setDragDelta(0);
    }
    setDragStartY(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStartY(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStartY === null) return;
    const delta = dragStartY - e.clientY;
    setDragDelta(delta);
  };

  const handleMouseUp = () => {
    if (Math.abs(dragDelta) > 60) {
      if (dragDelta > 0) goNext();
      else goPrev();
    } else {
      setDragDelta(0);
    }
    setDragStartY(null);
  };

  const post = posts[currentIndex];
  if (!post) return null;

  const cardStyle: React.CSSProperties = {
    transform: exitDir === 'up'
      ? 'translateY(-120%)'
      : exitDir === 'down'
      ? 'translateY(120%)'
      : `translateY(${-dragDelta * 0.3}px)`,
    transition: exitDir ? 'transform 0.3s ease' : 'none',
    opacity: exitDir ? 0 : 1,
  };

  const categoryColors: Record<string, string> = {
    '🐇 토끼굴': 'text-amber-400',
    '🛠️ 빌더 일지': 'text-blue-400',
    '📡 시그널': 'text-purple-400',
    '💭 단상': 'text-rose-400',
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none">
      {/* Progress dots */}
      <div className="absolute top-4 left-0 right-0 flex justify-center gap-1 z-10">
        {posts.slice(0, Math.min(posts.length, 7)).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              i === currentIndex % 7
                ? 'bg-amber-400 w-3'
                : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Card */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center px-4 cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={dragStartY !== null ? handleMouseMove : undefined}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={cardStyle}
          className="w-full max-w-sm mx-auto"
        >
          {/* Category */}
          <div className={`text-sm font-medium mb-3 ${categoryColors[post.category] || 'text-amber-400'}`}>
            {post.category}
          </div>

          {/* Main card */}
          <div
            className="bg-[#131726] border border-white/10 rounded-2xl p-6 shadow-2xl cursor-pointer hover:border-amber-400/30 transition-colors"
            onClick={() => router.push(`/posts/${post.slug}`)}
          >
            {/* Quote mark */}
            <div className="text-amber-400/40 text-5xl font-serif leading-none mb-2">&ldquo;</div>

            {/* Summary as insight card */}
            <p className="text-white text-lg font-medium leading-relaxed mb-6">
              {post.summary}
            </p>

            {/* Title */}
            <p className="text-white/50 text-sm mb-4 border-t border-white/10 pt-4">
              {post.title}
            </p>

            {/* Meta */}
            <div className="flex items-center justify-between">
              <DepthBadge depth={post.depth} />
              <div className="flex items-center gap-3 text-sm text-white/40">
                <span>❤️ {post.reactions}</span>
                <span>{new Date(post.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Tap hint */}
          <p className="text-center text-white/30 text-xs mt-4">
            탭해서 전체 글 읽기 · 스와이프로 탐색
          </p>
        </div>
      </div>

      {/* Nav arrows */}
      <button
        onClick={goPrev}
        disabled={currentIndex === 0}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors text-2xl p-2"
      >
        ‹
      </button>
      <button
        onClick={goNext}
        disabled={currentIndex >= posts.length - 1}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors text-2xl p-2"
      >
        ›
      </button>

      {/* Counter */}
      <div className="absolute bottom-4 text-white/30 text-xs">
        {currentIndex + 1} / {posts.length}
      </div>
    </div>
  );
}
