'use client';

import { DepthLevel, depthLabel } from '@/data/posts';

interface DepthBadgeProps {
  depth: DepthLevel;
  className?: string;
}

const depthStyle: Record<DepthLevel, { color: string }> = {
  entry: {
    color: '#D4922A',
  },
  mid: {
    color: '#C86428',
  },
  deep: {
    color: '#B85020',
  },
};

export default function DepthBadge({ depth, className = '' }: DepthBadgeProps) {
  const s = depthStyle[depth];
  return (
    <span
      className={`inline-flex items-center text-xs ${className}`}
      style={{
        color: s.color,
        fontFamily: "var(--font-sans), 'Noto Sans KR', sans-serif",
        fontWeight: 300,
        letterSpacing: '0.02em',
      }}
    >
      {depthLabel(depth)}
    </span>
  );
}
