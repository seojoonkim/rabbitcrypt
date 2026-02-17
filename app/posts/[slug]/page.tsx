import { notFound } from 'next/navigation';
import Link from 'next/link';
import { posts, getPostBySlug, getRelatedPosts, Post } from '@/data/posts';
import DepthBadge from '@/components/DepthBadge';
import TimelineView from '@/components/TimelineView';

export async function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

function renderContent(content: string, relatedPosts: Post[]) {
  const lines = content.split('\n');

  return lines.map((line, i) => {
    if (!line.trim()) return <br key={i} />;

    if (line.startsWith('### ')) {
      return (
        <h3
          key={i}
          className="text-lg font-bold"
          style={{
            marginTop: '1.5rem',
            marginBottom: '0.75rem',
            fontFamily: "var(--font-display), var(--font-serif), 'Noto Serif KR', serif",
            color: '#F0E4CC',
          }}
        >
          {line.slice(4)}
        </h3>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h2
          key={i}
          className="text-xl font-bold"
          style={{
            marginTop: '2rem',
            marginBottom: '1rem',
            fontFamily: "var(--font-display), var(--font-serif), 'Noto Serif KR', serif",
            color: '#F0E4CC',
          }}
        >
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith('# ')) {
      return (
        <h1
          key={i}
          className="text-2xl font-bold"
          style={{
            marginTop: '2rem',
            marginBottom: '1rem',
            fontFamily: "var(--font-display), var(--font-serif), 'Noto Serif KR', serif",
            color: '#F0E4CC',
          }}
        >
          {line.slice(2)}
        </h1>
      );
    }

    if (line.trim() === '---') {
      return <hr key={i} style={{ borderColor: 'rgba(212,146,42,0.15)', margin: '1.5rem 0' }} />;
    }

    if (line.startsWith('```')) {
      return null;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.slice(2);
      return (
        <li key={i} style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>
          {renderInline(text)}
        </li>
      );
    }

    if (line.startsWith('*') && line.endsWith('*') && line.length > 2) {
      return (
        <p key={i} className="italic" style={{ margin: '0.5rem 0', color: 'rgba(240,228,204,0.55)' }}>
          {line.slice(1, -1)}
        </p>
      );
    }

    return (
      <p
        key={i}
        style={{ marginBottom: '1.5rem', lineHeight: '1.9', color: 'rgba(240,228,204,0.82)' }}
      >
        {renderInline(line)}
      </p>
    );
  });
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: '#E8A830', fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="rounded text-sm font-mono"
          style={{
            background: 'rgba(212,146,42,0.08)',
            border: '1px solid rgba(212,146,42,0.2)',
            color: '#E8A830',
            padding: '0.125rem 0.375rem',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) notFound();

  const related = getRelatedPosts(post);

  const sameTagPosts = posts.filter(
    (p) =>
      p.slug !== post.slug &&
      p.tags.some((t) => post.tags.includes(t))
  ).slice(0, 4);

  const categoryColors: Record<string, string> = {
    '🐇 토끼굴': '#D4922A',
    '🛠️ 빌더 일지': '#9BA8C0',
    '📡 시그널': '#A88CC0',
    '💭 단상': '#C08888',
  };

  const topTag = post.tags[0] || '';

  return (
    <div className="min-h-screen" style={{ background: '#080E1A', color: '#F0E4CC' }}>
      {/* Header bar */}
      <div
        className="sticky top-0 z-30"
        style={{
          background: 'rgba(8,14,26,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(212,146,42,0.12)',
        }}
      >
        <div
          className="max-w-2xl mx-auto flex items-center"
          style={{ padding: '0.75rem 1.5rem', gap: '0.75rem' }}
        >
          <Link
            href="/"
            className="hover-amber text-sm flex items-center"
            style={{ color: 'rgba(240,228,204,0.35)', gap: '0.25rem' }}
          >
            ← 토끼굴
          </Link>
          <span
            className="text-sm flex-1 truncate hidden sm:block"
            style={{ color: 'rgba(240,228,204,0.2)' }}
          >
            {post.title}
          </span>
          <span
            className="text-xs flex items-center"
            style={{ color: 'rgba(240,228,204,0.25)', gap: '0.25rem' }}
          >
            ❤️ {post.reactions}
          </span>
        </div>
      </div>

      <article style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        {/* Category */}
        <div
          className="text-sm font-medium"
          style={{
            color: categoryColors[post.category] || '#D4922A',
            marginBottom: '0.75rem',
            fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
            fontWeight: 300,
          }}
        >
          {post.category}
        </div>

        {/* Title */}
        <h1
          className="text-2xl sm:text-3xl font-bold leading-tight"
          style={{
            fontFamily: "var(--font-display), var(--font-serif), 'Noto Serif KR', Georgia, serif",
            color: '#F0E4CC',
            marginBottom: '1rem',
          }}
        >
          {post.title}
        </h1>

        {/* Meta row */}
        <div
          className="flex flex-wrap items-center"
          style={{
            gap: '0.75rem',
            marginBottom: '1.5rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid rgba(212,146,42,0.12)',
          }}
        >
          <DepthBadge depth={post.depth} />
          <span
            className="text-sm"
            style={{
              color: 'rgba(240,228,204,0.3)',
              fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
              fontWeight: 300,
            }}
          >
            {new Date(post.date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span
            className="text-sm ml-auto flex items-center"
            style={{ color: 'rgba(240,228,204,0.3)', gap: '0.25rem' }}
          >
            ❤️ {post.reactions}
          </span>
        </div>

        {/* Summary / Lede */}
        <div
          className="rounded-r-xl"
          style={{
            borderLeft: '2px solid rgba(212,146,42,0.5)',
            background: 'rgba(212,146,42,0.04)',
            padding: '1rem',
            marginBottom: '2rem',
          }}
        >
          <p
            className="italic leading-relaxed text-sm"
            style={{
              color: 'rgba(240,228,204,0.65)',
              fontFamily: "var(--font-serif), 'Noto Serif KR', Georgia, serif",
            }}
          >
            {post.summary}
          </p>
        </div>

        {/* Content */}
        <div
          className="post-content"
          style={{ lineHeight: '1.9', fontFamily: "'Noto Serif KR', Georgia, serif" }}
        >
          {renderContent(post.content, related)}
        </div>

        {/* Tags */}
        <div
          className="flex flex-wrap"
          style={{
            gap: '0.5rem',
            marginTop: '2rem',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(212,146,42,0.12)',
          }}
        >
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full text-xs"
              style={{
                background: 'rgba(212,146,42,0.05)',
                border: '1px solid rgba(212,146,42,0.15)',
                color: 'rgba(240,228,204,0.45)',
                padding: '0.25rem 0.625rem',
              }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Telegram reactions */}
        <div
          className="flex items-center text-sm"
          style={{ marginTop: '1.5rem', gap: '0.75rem', color: 'rgba(240,228,204,0.3)' }}
        >
          <span>텔레그램 반응</span>
          <span className="flex items-center" style={{ gap: '0.25rem', color: '#C08888' }}>
            ❤️ <strong style={{ color: 'rgba(240,228,204,0.55)' }}>{post.reactions}</strong>
          </span>
          <a
            href="https://t.me/simon_rabbit_hole"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs hover-amber"
            style={{ color: 'rgba(212,146,42,0.55)' }}
          >
            채널에서 보기 →
          </a>
        </div>

        {/* Timeline */}
        {sameTagPosts.length > 1 && (
          <div
            style={{
              marginTop: '2.5rem',
              paddingTop: '2rem',
              borderTop: '1px solid rgba(212,146,42,0.12)',
            }}
          >
            <TimelineView
              posts={[post, ...sameTagPosts]}
              tag={topTag}
            />
          </div>
        )}

        {/* Related posts */}
        {related.length > 0 && (
          <div
            style={{
              marginTop: '2.5rem',
              paddingTop: '2rem',
              borderTop: '1px solid rgba(212,146,42,0.12)',
            }}
          >
            <h2
              className="text-sm flex items-center"
              style={{
                marginBottom: '1rem',
                gap: '0.5rem',
                color: 'rgba(240,228,204,0.45)',
                fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                fontWeight: 300,
              }}
            >
              <span style={{ color: 'rgba(212,146,42,0.5)' }}>∿</span>
              연관 글
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/posts/${r.slug}`}
                  className="block rounded-xl card-hover-border"
                  style={{
                    background: '#0D1826',
                    border: '1px solid rgba(212,146,42,0.1)',
                    padding: '1rem',
                  }}
                >
                  <div
                    className="text-sm font-medium"
                    style={{
                      color: 'rgba(240,228,204,0.8)',
                      marginBottom: '0.25rem',
                      fontFamily: "var(--font-serif), 'Noto Serif KR', serif",
                    }}
                  >
                    {r.title}
                  </div>
                  <div
                    className="text-xs line-clamp-2"
                    style={{ color: 'rgba(240,228,204,0.38)', marginBottom: '0.5rem' }}
                  >
                    {r.summary}
                  </div>
                  <div className="flex items-center" style={{ gap: '0.5rem' }}>
                    <DepthBadge depth={r.depth} />
                    <span
                      className="text-xs"
                      style={{
                        color: 'rgba(240,228,204,0.28)',
                        fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                        fontWeight: 300,
                      }}
                    >
                      {r.category}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back */}
        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <Link
            href="/"
            className="inline-flex items-center text-sm hover-amber"
            style={{ color: 'rgba(212,146,42,0.55)', gap: '0.5rem' }}
          >
            🐇 토끼굴로 돌아가기
          </Link>
        </div>
      </article>
    </div>
  );
}
