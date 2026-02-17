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
      {/* Header */}
      <div
        className="text-white/50 text-sm flex items-center"
        style={{ marginBottom: '1.5rem', gap: '0.5rem' }}
      >
        <span className="text-amber-400">⏳</span>
        <span>생각의 진화 타임라인</span>
        <span
          className="text-amber-400/80 border border-amber-400/20 rounded-full text-xs"
          style={{ background: 'rgba(251,191,36,0.07)', padding: '0.125rem 0.625rem' }}
        >
          #{tag}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Vertical line */}
        <div
          style={{
            position: 'absolute',
            left: '1rem',
            top: 0,
            bottom: 0,
            width: '1px',
            background: 'rgba(251,191,36,0.2)',
          }}
        />

        {/* Items */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.75rem',
            marginLeft: '2.5rem',
          }}
        >
          {sorted.map((post, i) => (
            <div key={post.slug} style={{ position: 'relative' }}>
              {/* Dot */}
              <div
                style={{
                  position: 'absolute',
                  left: '-2.75rem',
                  top: '1.25rem',
                  width: '0.75rem',
                  height: '0.75rem',
                  borderRadius: '50%',
                  border: '2px solid #F59E0B',
                  background: '#0B0E1A',
                }}
              />

              {/* Date */}
              <div
                className="text-xs text-white/30"
                style={{ marginBottom: '0.5rem' }}
              >
                {new Date(post.date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>

              {/* Card */}
              <div
                onClick={() => router.push(`/posts/${post.slug}`)}
                className="bg-[#131726] border border-white/10 rounded-xl cursor-pointer hover:border-amber-400/30 transition-colors"
                style={{ padding: '1rem 1.125rem' }}
              >
                <div
                  className="text-white/80 text-sm font-medium"
                  style={{ marginBottom: '0.4rem' }}
                >
                  {post.title}
                </div>
                <div
                  className="text-white/40 text-xs line-clamp-2"
                  style={{ marginBottom: '0.75rem', lineHeight: '1.6' }}
                >
                  {post.summary}
                </div>
                <div className="flex items-center" style={{ gap: '0.5rem' }}>
                  <DepthBadge depth={post.depth} />
                  <span className="text-white/30 text-xs">{post.category}</span>
                </div>
              </div>

              {/* Connector arrow */}
              {i < sorted.length - 1 && (
                <div
                  className="text-amber-400/30 text-xs"
                  style={{
                    position: 'absolute',
                    left: '-2.25rem',
                    top: '3.75rem',
                  }}
                >
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
