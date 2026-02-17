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
      return <h3 key={i} className="text-white text-lg font-bold mt-6 mb-3">{line.slice(4)}</h3>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={i} className="text-white text-xl font-bold mt-8 mb-4">{line.slice(3)}</h2>;
    }
    if (line.startsWith('# ')) {
      return <h1 key={i} className="text-white text-2xl font-bold mt-8 mb-4">{line.slice(2)}</h1>;
    }
    
    // HR
    if (line.trim() === '---') {
      return <hr key={i} className="border-white/10 my-6" />;
    }
    
    // Code block (single backtick)
    if (line.startsWith('```')) {
      return null; // handled below
    }
    
    // List items
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.slice(2);
      return (
        <li key={i} className="ml-4 mb-2">
          {renderInline(text)}
        </li>
      );
    }
    
    // Italic lines (poem/quote style)
    if (line.startsWith('*') && line.endsWith('*') && line.length > 2) {
      return (
        <p key={i} className="italic text-white/60 my-2">
          {line.slice(1, -1)}
        </p>
      );
    }
    
    // Bold headers inside paragraphs
    return (
      <p key={i} className="mb-6 leading-8 text-white/80">
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
      return <code key={i} className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-amber-400 text-sm font-mono">{part.slice(1, -1)}</code>;
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
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="text-white/40 hover:text-white/70 transition-colors text-sm flex items-center gap-1"
          >
            ← 토끼굴
          </Link>
          <span className="text-white/20 text-sm flex-1 truncate hidden sm:block">
            {post.title}
          </span>
          <span className="text-white/30 text-xs flex items-center gap-1">
            ❤️ {post.reactions}
          </span>
        </div>
      </div>

      <article className="max-w-2xl mx-auto px-5 py-8">
        {/* Category */}
        <div className={`text-sm font-medium mb-3 ${categoryColors[post.category] || 'text-amber-400'}`}>
          {post.category}
        </div>

        {/* Title */}
        <h1
          className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-4"
          style={{ fontFamily: "var(--font-serif), 'Noto Serif KR', Georgia, serif" }}
        >
          {post.title}
        </h1>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-white/10">
          <DepthBadge depth={post.depth} />
          <span className="text-white/30 text-sm">
            {new Date(post.date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span className="text-white/30 text-sm ml-auto flex items-center gap-1">
            ❤️ {post.reactions}
          </span>
        </div>

        {/* Summary / Lede */}
        <div className="bg-amber-400/5 border-l-4 border-amber-400/60 rounded-r-xl p-4 mb-8">
          <p
            className="text-white/70 italic leading-relaxed text-sm"
            style={{ fontFamily: "var(--font-serif), 'Noto Serif KR', Georgia, serif" }}
          >
            {post.summary}
          </p>
        </div>

        {/* Content */}
        <div className="post-content">
          {renderContent(post.content, related)}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-white/10">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/50"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Telegram reactions */}
        <div className="mt-6 flex items-center gap-3 text-white/30 text-sm">
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
          <div className="mt-10 pt-8 border-t border-white/10">
            <TimelineView
              posts={[post, ...sameTagPosts]}
              tag={topTag}
            />
          </div>
        )}

        {/* Related posts */}
        {related.length > 0 && (
          <div className="mt-10 pt-8 border-t border-white/10">
            <h2 className="text-white/50 text-sm mb-4 flex items-center gap-2">
              <span className="text-amber-400/60 font-mono">{'// '}</span>
              연관 글
            </h2>
            <div className="space-y-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/posts/${r.slug}`}
                  className="block bg-[#131726] border border-white/8 rounded-xl p-4 hover:border-amber-400/30 transition-all group"
                >
                  <div className="text-white/80 text-sm font-medium mb-1 group-hover:text-white transition-colors">
                    {r.title}
                  </div>
                  <div className="text-white/40 text-xs line-clamp-2 mb-2">
                    {r.summary}
                  </div>
                  <div className="flex items-center gap-2">
                    <DepthBadge depth={r.depth} />
                    <span className="text-white/30 text-xs">{r.category}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back */}
        <div className="mt-10 text-center">
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
