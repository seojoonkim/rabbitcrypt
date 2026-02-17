import { notFound } from 'next/navigation';
import Link from 'next/link';
import { posts, getPostBySlug, getRelatedPosts, Post } from '@/data/posts';
import DepthBadge from '@/components/DepthBadge';
import TimelineView from '@/components/TimelineView';

export async function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

function renderContent(content: string, relatedPosts: Post[]) {
  // Split content into paragraphs and render with basic markdown
  const lines = content.split('\n');
  
  return lines.map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    
    // Headers
    if (line.startsWith('### ')) {
      return (
        <h3
          key={i}
          className="text-white text-lg font-bold"
          style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}
        >
          {line.slice(4)}
        </h3>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h2
          key={i}
          className="text-white text-xl font-bold"
          style={{ marginTop: '2rem', marginBottom: '1rem' }}
        >
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith('# ')) {
      return (
        <h1
          key={i}
          className="text-white text-2xl font-bold"
          style={{ marginTop: '2rem', marginBottom: '1rem' }}
        >
          {line.slice(2)}
        </h1>
      );
    }
    
    // HR
    if (line.trim() === '---') {
      return <hr key={i} className="border-white/10" style={{ margin: '1.5rem 0' }} />;
    }
    
    // Code block (single backtick)
    if (line.startsWith('```')) {
      return null; // handled below
    }
    
    // List items
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.slice(2);
      return (
        <li key={i} style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>
          {renderInline(text)}
        </li>
      );
    }
    
    // Italic lines (poem/quote style)
    if (line.startsWith('*') && line.endsWith('*') && line.length > 2) {
      return (
        <p key={i} className="italic text-white/60" style={{ margin: '0.5rem 0' }}>
          {line.slice(1, -1)}
        </p>
      );
    }
    
    // Bold headers inside paragraphs
    return (
      <p
        key={i}
        className="text-white/80"
        style={{ marginBottom: '1.5rem', lineHeight: '1.9' }}
      >
        {renderInline(line)}
      </p>
    );
  });
}

function renderInline(text: string) {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-amber-400 font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-white/5 border border-white/10 rounded text-amber-400 text-sm font-mono" style={{ padding: '0.125rem 0.375rem' }}>{part.slice(1, -1)}</code>;
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
  
  // Find posts with same tags for timeline
  const sameTagPosts = posts.filter(
    (p) =>
      p.slug !== post.slug &&
      p.tags.some((t) => post.tags.includes(t))
  ).slice(0, 4);

  const categoryColors: Record<string, string> = {
    '🐇 토끼굴': 'text-amber-400',
    '🛠️ 빌더 일지': 'text-blue-400',
    '📡 시그널': 'text-purple-400',
    '💭 단상': 'text-rose-400',
  };

  const topTag = post.tags[0] || '';

  return (
    <div className="min-h-screen bg-[#0B0E1A]">
      {/* Header bar */}
      <div className="sticky top-0 z-30 bg-[#0B0E1A]/90 backdrop-blur-md border-b border-white/5">
        <div
          className="max-w-2xl mx-auto flex items-center"
          style={{ padding: '0.75rem 1.5rem', gap: '0.75rem' }}
        >
          <Link
            href="/"
            className="text-white/40 hover:text-white/70 transition-colors text-sm flex items-center"
            style={{ gap: '0.25rem' }}
          >
            ← 토끼굴
          </Link>
          <span className="text-white/20 text-sm flex-1 truncate hidden sm:block">
            {post.title}
          </span>
          <span className="text-white/30 text-xs flex items-center" style={{ gap: '0.25rem' }}>
            ❤️ {post.reactions}
          </span>
        </div>
      </div>

      <article style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        {/* Category */}
        <div
          className={`text-sm font-medium ${categoryColors[post.category] || 'text-amber-400'}`}
          style={{ marginBottom: '0.75rem' }}
        >
          {post.category}
        </div>

        {/* Title */}
        <h1
          className="text-2xl sm:text-3xl font-bold text-white leading-tight"
          style={{
            fontFamily: "var(--font-serif), 'Noto Serif KR', Georgia, serif",
            marginBottom: '1rem',
          }}
        >
          {post.title}
        </h1>

        {/* Meta row */}
        <div
          className="flex flex-wrap items-center border-b border-white/10"
          style={{ gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1.5rem' }}
        >
          <DepthBadge depth={post.depth} />
          <span className="text-white/30 text-sm">
            {new Date(post.date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span className="text-white/30 text-sm ml-auto flex items-center" style={{ gap: '0.25rem' }}>
            ❤️ {post.reactions}
          </span>
        </div>

        {/* Summary / Lede */}
        <div
          className="bg-amber-400/5 border-l-4 border-amber-400/60 rounded-r-xl"
          style={{ padding: '1rem', marginBottom: '2rem' }}
        >
          <p
            className="text-white/70 italic leading-relaxed text-sm"
            style={{ fontFamily: "var(--font-serif), 'Noto Serif KR', Georgia, serif" }}
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
          className="flex flex-wrap border-t border-white/10"
          style={{ gap: '0.5rem', marginTop: '2rem', paddingTop: '2rem' }}
        >
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="bg-white/5 border border-white/10 rounded-full text-xs text-white/50"
              style={{ padding: '0.25rem 0.625rem' }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Telegram reactions */}
        <div
          className="flex items-center text-white/30 text-sm"
          style={{ marginTop: '1.5rem', gap: '0.75rem' }}
        >
          <span>텔레그램 반응</span>
          <span className="flex items-center gap-1 text-rose-400">
            ❤️ <strong className="text-white/60">{post.reactions}</strong>
          </span>
          <a
            href="https://t.me/simon_rabbit_hole"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-amber-400/60 hover:text-amber-400 transition-colors"
          >
            채널에서 보기 →
          </a>
        </div>

        {/* Timeline */}
        {sameTagPosts.length > 1 && (
          <div
            className="border-t border-white/10"
            style={{ marginTop: '2.5rem', paddingTop: '2rem' }}
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
            className="border-t border-white/10"
            style={{ marginTop: '2.5rem', paddingTop: '2rem' }}
          >
            <h2
              className="text-white/50 text-sm flex items-center"
              style={{ marginBottom: '1rem', gap: '0.5rem' }}
            >
              <span className="text-amber-400/60 font-mono">{'// '}</span>
              연관 글
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/posts/${r.slug}`}
                  className="block bg-[#131726] border border-white/8 rounded-xl hover:border-amber-400/30 transition-all group"
                  style={{ padding: '1rem' }}
                >
                  <div
                    className="text-white/80 text-sm font-medium group-hover:text-white transition-colors"
                    style={{ marginBottom: '0.25rem' }}
                  >
                    {r.title}
                  </div>
                  <div
                    className="text-white/40 text-xs line-clamp-2"
                    style={{ marginBottom: '0.5rem' }}
                  >
                    {r.summary}
                  </div>
                  <div className="flex items-center" style={{ gap: '0.5rem' }}>
                    <DepthBadge depth={r.depth} />
                    <span className="text-white/30 text-xs">{r.category}</span>
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
            className="inline-flex items-center gap-2 text-amber-400/60 hover:text-amber-400 transition-colors text-sm"
          >
            🐇 토끼굴로 돌아가기
          </Link>
        </div>
      </article>
    </div>
  );
}
