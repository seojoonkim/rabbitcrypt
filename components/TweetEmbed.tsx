'use client';

import { useEffect, useRef, useState } from 'react';

interface TweetData {
  author: string;
  handle: string;
  avatar: string;
  text: string;
  date: string;
  likes: number;
  retweets: number;
  media?: { url: string; type: string }[];
}

export default function TweetEmbed({ url }: { url: string }) {
  const [tweet, setTweet] = useState<TweetData | null>(null);
  const [error, setError] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const match = url.match(/(?:twitter\.com|x\.com)\/([^/]+)\/status\/(\d+)/);
    if (!match) { setError(true); return; }
    const [, user, id] = match;

    fetch(`https://api.fxtwitter.com/${user}/status/${id}`)
      .then(r => r.json())
      .then(data => {
        const t = data?.tweet;
        if (!t) { setError(true); return; }
        setTweet({
          author: t.author?.name || user,
          handle: t.author?.screen_name || user,
          avatar: t.author?.avatar_url || '',
          text: t.text || '',
          date: t.created_at || '',
          likes: t.likes || 0,
          retweets: t.retweets || 0,
          media: t.media?.all?.map((m: any) => ({
            url: m.url || m.thumbnail_url,
            type: m.type,
          })),
        });
      })
      .catch(() => setError(true));
  }, [url]);

  if (error) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#4A9EED',
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
        }}
      >
        {url}
      </a>
    );
  }

  if (!tweet) {
    return (
      <div style={{
        border: '1px solid rgba(212,146,42,0.15)',
        borderRadius: '12px',
        padding: '1rem',
        margin: '1rem 0',
        background: 'rgba(255,255,255,0.03)',
        color: 'rgba(240,228,204,0.4)',
        fontSize: '0.875rem',
      }}>
        Loading post...
      </div>
    );
  }

  const formatNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return d; }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <div style={{
        border: '1px solid rgba(212,146,42,0.15)',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        margin: '1rem 0',
        background: 'rgba(255,255,255,0.03)',
        transition: 'border-color 0.2s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,146,42,0.35)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(212,146,42,0.15)')}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
          {tweet.avatar && (
            <img
              src={tweet.avatar}
              alt=""
              width={36}
              height={36}
              style={{ borderRadius: '50%', flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#F0E4CC' }}>
              {tweet.author}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(240,228,204,0.45)' }}>
              @{tweet.handle}
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(240,228,204,0.4)" style={{ flexShrink: 0 }}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>

        {/* Text */}
        <div style={{
          fontSize: '0.9375rem',
          lineHeight: '1.5',
          color: 'rgba(240,228,204,0.8)',
          marginBottom: tweet.media?.length ? '0.75rem' : '0.5rem',
          whiteSpace: 'pre-wrap',
          display: '-webkit-box',
          WebkitLineClamp: 6,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {tweet.text}
        </div>

        {/* Media preview */}
        {tweet.media && tweet.media.length > 0 && tweet.media[0].url && (
          <div style={{
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '0.625rem',
            maxHeight: '280px',
          }}>
            <img
              src={tweet.media[0].url}
              alt=""
              style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: '1.25rem',
          fontSize: '0.8125rem',
          color: 'rgba(240,228,204,0.35)',
          alignItems: 'center',
        }}>
          <span>{formatDate(tweet.date)}</span>
          {tweet.retweets > 0 && <span>🔁 {formatNum(tweet.retweets)}</span>}
          {tweet.likes > 0 && <span>❤️ {formatNum(tweet.likes)}</span>}
        </div>
      </div>
    </a>
  );
}
