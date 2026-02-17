import { notFound } from 'next/navigation';
import Link from 'next/link';
import { posts, getPostBySlug, getRelatedPosts, Post } from '@/data/posts';
import DepthBadge from '@/components/DepthBadge';
import TimelineView from '@/components/TimelineView';
import KnowledgeGraphWrapper from '@/components/KnowledgeGraphWrapper';
import AutoPlayVideo from '@/components/AutoPlayVideo';
import TweetEmbed from '@/components/TweetEmbed';
import relationsData from '@/data/relations.json';

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

    // Twitter/X embed: standalone URL or markdown link on its own line
    const tweetUrlMatch = line.trim().match(/^(?:\[.*?\]\()?(https?:\/\/(?:twitter\.com|x\.com)\/[^/]+\/status\/\d+[^\s)]*)\)?$/);
    if (tweetUrlMatch) {
      return <TweetEmbed key={i} url={tweetUrlMatch[1].replace(/\)$/, '')} />;
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
        style={{ marginBottom: '1.25rem', lineHeight: '1.75', fontSize: '1.125rem', color: 'rgba(240,228,204,0.85)' }}
      >
        {renderInline(line)}
      </p>
    );
  });
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
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
    // Markdown link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#4A9EED', textDecoration: 'underline', textUnderlineOffset: '3px' }}
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#D4922A';
  if (score >= 70) return '#8A7A5E';
  return '#5A4A3E';
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) notFound();

  // AI 연관도 데이터 로드 (relations.json)
  const relationsMap = relationsData as Record<string, Array<{ slug: string; score: number }>>;
  const aiRelations = relationsMap[slug] || [];

  // AI 연관도 기반 related 포스트 (없으면 기존 태그 기반 fallback)
  const aiRelatedPosts = aiRelations
    .map((r) => {
      const p = posts.find((po) => po.slug === r.slug);
      return p ? { ...p, score: r.score } : null;
    })
    .filter(Boolean) as (Post & { score: number })[];

  const related = aiRelatedPosts.length > 0 ? aiRelatedPosts : getRelatedPosts(post).map((p) => ({ ...p, score: 0 }));

  // 그래프용 포스트 메타 목록
  const postsMeta = posts.map((p) => ({ slug: p.slug, title: p.title }));

  const sameTagPosts = posts.filter(
    (p) =>
      p.slug !== post.slug &&
      p.tags.some((t) => post.tags.includes(t))
  ).slice(0, 4);

  const categoryColors: Record<string, string> = {
    '🐇 탐험': '#D4922A',
    '🛠️ 빌딩': '#9BA8C0',
    
    '✍️ 낙서': '#C08888',
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
          className="flex items-center"
          style={{ maxWidth: '1000px', margin: '0 auto', padding: '0.75rem 1.25rem', gap: '0.75rem' }}
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

      <article style={{ maxWidth: '720px', margin: '0 auto', padding: '3.5rem 1.5rem 5rem' }}>
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
          className="text-[2rem] sm:text-[2.75rem] font-bold"
          style={{
            fontFamily: "var(--font-display), var(--font-serif), 'Noto Serif KR', Georgia, serif",
            color: '#F0E4CC',
            marginBottom: '1.25rem',
            lineHeight: '1.2',
            letterSpacing: '-0.02em',
          }}
        >
          {post.title}
        </h1>

        {/* Meta row */}
        <div
          className="flex flex-wrap items-center"
          style={{
            gap: '0.75rem',
            marginBottom: '2.5rem',
            paddingBottom: '1.75rem',
            borderBottom: '1px solid rgba(212,146,42,0.08)',
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

        {/* Media section — images (top, skip if video exists) */}
        {post.mediaUrls && post.mediaUrls.length > 0 && !(post.videoUrls && post.videoUrls.length > 0) && (
          <div
            style={{
              marginBottom: '2.5rem',
              marginLeft: '-2rem',
              marginRight: '-2rem',
              display: 'grid',
              gridTemplateColumns: post.mediaUrls.length === 1 ? '1fr' : 'repeat(2, 1fr)',
              gap: '0.75rem',
            }}
          >
            {post.mediaUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                style={{
                  width: '100%',
                  aspectRatio: post.mediaUrls!.length === 1 ? 'auto' : '1 / 1',
                  objectFit: 'cover',
                  borderRadius: '0.5rem',
                  display: 'block',
                }}
              />
            ))}
          </div>
        )}

        {/* Media section — videos (top) */}
        {post.videoUrls && post.videoUrls.length > 0 && (
          <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {post.videoUrls.map((url, i) => (
              url.startsWith('/') || (url.startsWith('http') && !url.includes('t.me')) ? (
                <AutoPlayVideo key={i} src={url} />
              ) : (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#D4922A',
                    fontSize: '0.875rem',
                  }}
                >
                  🎬 영상 보기 (텔레그램)
                </a>
              )
            ))}
          </div>
        )}

        {/* Summary removed — content speaks for itself */}

        {/* Content */}
        <div
          className="post-content"
          style={{ lineHeight: '1.75', fontSize: '1.125rem', fontFamily: "'Noto Serif KR', Georgia, serif", letterSpacing: '0.01em' }}
        >
          {renderContent(post.content, related)}
        </div>

        {/* videos rendered at top — see above */}

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

        {/* Related posts — AI 연관도 */}
        {related.length > 0 && (
          <div
            style={{
              marginTop: '2.5rem',
              paddingTop: '2rem',
              borderTop: '1px solid rgba(212,146,42,0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '1rem', gap: '0.5rem' }}>
              <h2
                className="text-sm flex items-center"
                style={{
                  gap: '0.5rem',
                  color: 'rgba(240,228,204,0.45)',
                  fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                  fontWeight: 300,
                }}
              >
                <span style={{ color: 'rgba(212,146,42,0.5)' }}>∿</span>
                연관 글
              </h2>
              {aiRelations.length > 0 && (
                <span
                  style={{
                    fontSize: '10px',
                    color: 'rgba(212,146,42,0.4)',
                    fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                    fontWeight: 300,
                  }}
                >
                  AI가 분석한 연관도
                </span>
              )}
            </div>
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
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                    </div>
                    {r.score > 0 && (
                      <div
                        style={{
                          flexShrink: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          border: `1px solid ${getScoreColor(r.score)}40`,
                          background: `${getScoreColor(r.score)}12`,
                          minWidth: '44px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: getScoreColor(r.score),
                            lineHeight: 1.2,
                            fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                          }}
                        >
                          {r.score}%
                        </span>
                        <span
                          style={{
                            fontSize: '9px',
                            color: `${getScoreColor(r.score)}99`,
                            fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
                            letterSpacing: '0.02em',
                          }}
                        >
                          연관도
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 지식 그래프 */}
        {aiRelations.length > 0 && (
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
              <span style={{ color: 'rgba(212,146,42,0.5)' }}>⬡</span>
              지식 그래프
            </h2>
            <div
              className="rounded-xl"
              style={{
                background: '#0D1826',
                border: '1px solid rgba(212,146,42,0.1)',
                padding: '0.5rem',
                overflow: 'hidden',
              }}
            >
              <KnowledgeGraphWrapper
                currentSlug={post.slug}
                relations={aiRelations}
                posts={postsMeta}
              />
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
            🐇 탐험로 돌아가기
          </Link>
        </div>
      </article>
    </div>
  );
}
