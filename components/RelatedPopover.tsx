'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Post } from '@/data/posts';
import DepthBadge from './DepthBadge';

interface RelatedPopoverProps {
  keyword: string;
  relatedPosts: Post[];
  children: React.ReactNode;
}

export default function RelatedPopover({
  keyword,
  relatedPosts,
  children,
}: RelatedPopoverProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!relatedPosts.length) return <>{children}</>;

  return (
    <span className="relative inline-block">
      <span
        ref={ref}
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer border-b border-dashed border-amber-400/60 text-amber-400/90 hover:text-amber-400 transition-colors"
        title={`"${keyword}" 관련 글 보기`}
      >
        {children}
      </span>

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 left-0 mt-2 w-72 bg-[#131726] border border-amber-400/20 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ minWidth: '18rem' }}
        >
          <div className="text-amber-400/60 text-xs mb-3 font-medium">
            🔗 연관 글
          </div>
          <div className="space-y-3">
            {relatedPosts.map((post) => (
              <div
                key={post.slug}
                onClick={() => {
                  setOpen(false);
                  router.push(`/posts/${post.slug}`);
                }}
                className="cursor-pointer group"
              >
                <div className="text-sm text-white/80 group-hover:text-white transition-colors leading-snug mb-1">
                  {post.title}
                </div>
                <div className="flex items-center gap-2">
                  <DepthBadge depth={post.depth} />
                  <span className="text-white/30 text-xs">{post.category}</span>
                </div>
                <div className="text-white/40 text-xs mt-1 line-clamp-2">
                  {post.summary}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}
