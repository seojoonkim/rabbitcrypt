'use client';

import { DepthLevel, depthLabel } from '@/data/posts';

interface DepthBadgeProps {
  depth: DepthLevel;
  className?: string;
}

const depthStyle: Record<DepthLevel, { color: string; border: string; bg: string }> = {
  entry: {
    color: '#3FB950',
    border: 'rgba(63, 185, 80, 0.35)',
    bg: 'rgba(63, 185, 80, 0.08)',
  },
  mid: {
    color: '#D29922',
    border: 'rgba(210, 153, 34, 0.35)',
    bg: 'rgba(210, 153, 34, 0.08)',
  },
  deep: {
    color: '#F85149',
    border: 'rgba(248, 81, 73, 0.35)',
    bg: 'rgba(248, 81, 73, 0.08)',
  },
};

export default function DepthBadge({ depth, className = '' }: DepthBadgeProps) {
  const s = depthStyle[depth];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-mono rounded ${className}`}
      style={{
        color: s.color,
        border: `1px solid ${s.border}`,
        background: s.bg,
      }}
    >
      [{depthLabel(depth)}]
    </span>
  );
}
