'use client';

import { useRef, useEffect } from 'react';

interface AutoPlayVideoProps {
  src: string;
}

export default function AutoPlayVideo({ src }: AutoPlayVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      playsInline
      muted
      loop
      preload="metadata"
      style={{
        width: '100%',
        borderRadius: '0.75rem',
        border: '1px solid rgba(212,146,42,0.15)',
        background: '#000',
        display: 'block',
      }}
    />
  );
}
