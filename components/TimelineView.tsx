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
        className="text-sm flex items-center"
        style={{ marginBottom: '1.5rem', gap: '0.5rem', color: 'rgba(240,228,204,0.45)' }}
      >
        <span style={{ color: '#D4922A' }}>⏳</span>
        <span>생각의 진화 타임라인</span>
        <span
          className="text-xs rounded-full"
          style={{
            color: '#D4922A',
            border: '1px solid rgba(212,146,42,0.2)',
            background: 'rgba(212,146,42,0.06)',
            padding: '0.125rem 0.625rem',
          }}
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
            background: 'rgba(212,146,42,0.2)',
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
                  border: '2px solid #D4922A',
                  background: '#080E1A',
                }}
              />

              {/* Date */}
              <div
                className="text-xs"
                style={{
                  marginBottom: '0.5rem',
                  color: 'rgba(240,228,204,0.28)',
                  fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                  fontWeight: 300,
                }}
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
                className="rounded-xl cursor-pointer transition-colors"
                style={{
                  background: '#0D1826',
                  border: '1px solid rgba(212,146,42,0.1)',
                  padding: '1rem 1.125rem',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,146,42,0.35)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,146,42,0.1)')}
              >
                <div
                  className="text-sm font-medium"
                  style={{
                    color: 'rgba(240,228,204,0.8)',
                    marginBottom: '0.4rem',
                    fontFamily: "var(--font-serif), 'Noto Serif KR', serif",
                  }}
                >
                  {post.title}
                </div>
                <div
                  className="text-xs line-clamp-2"
                  style={{
                    color: 'rgba(240,228,204,0.38)',
                    marginBottom: '0.75rem',
                    lineHeight: '1.6',
                  }}
                >
                  {post.summary}
                </div>
                <div className="flex items-center" style={{ gap: '0.5rem' }}>
                  <DepthBadge depth={post.depth} />
                  <span
                    className="text-xs"
                    style={{
                      color: 'rgba(240,228,204,0.28)',
                      fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                      fontWeight: 300,
                    }}
                  >
                    {post.category}
                  </span>
                </div>
              </div>

              {/* Connector arrow */}
              {i < sorted.length - 1 && (
                <div
                  className="text-xs"
                  style={{
                    position: 'absolute',
                    left: '-2.25rem',
                    top: '3.75rem',
                    color: 'rgba(212,146,42,0.3)',
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
