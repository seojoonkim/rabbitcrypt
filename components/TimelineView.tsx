'use client';

import { useRouter } from 'next/navigation';
import { Post } from '@/data/posts';
import DepthBadge from './DepthBadge';

interface TimelineViewProps {
  posts: Post[];
  tag: string;
}

export default function TimelineView({ posts, tag }: TimelineViewProps) {
  const router = useRouter();

  if (!posts.length) return null;

  const sorted = [...posts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="w-full">
      <div className="text-white/50 text-sm mb-4 flex items-center gap-2">
        <span className="text-amber-400">⏳</span>
        <span>생각의 진화 타임라인</span>
        <span className="bg-amber-400/10 text-amber-400/80 border border-amber-400/20 rounded-full px-2 py-0.5 text-xs">
          #{tag}
        </span>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-amber-400/20" />

        <div className="space-y-6 ml-10">
          {sorted.map((post, i) => (
            <div key={post.slug} className="relative">
              {/* Dot */}
              <div className="absolute -left-[2.65rem] top-1.5 w-3 h-3 rounded-full border-2 border-amber-400 bg-[#0B0E1A]" />

              {/* Date */}
              <div className="text-xs text-white/30 mb-1">
                {new Date(post.date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>

              {/* Card */}
              <div
                onClick={() => router.push(`/posts/${post.slug}`)}
                className="bg-[#131726] border border-white/10 rounded-xl p-4 cursor-pointer hover:border-amber-400/30 transition-colors"
              >
                <div className="text-white/80 text-sm font-medium mb-1">
                  {post.title}
                </div>
                <div className="text-white/40 text-xs line-clamp-2 mb-2">
                  {post.summary}
                </div>
                <div className="flex items-center gap-2">
                  <DepthBadge depth={post.depth} />
                  <span className="text-white/30 text-xs">{post.category}</span>
                </div>
              </div>

              {/* Connector label */}
              {i < sorted.length - 1 && (
                <div className="absolute -left-[2.1rem] top-[3.5rem] text-amber-400/30 text-xs">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
