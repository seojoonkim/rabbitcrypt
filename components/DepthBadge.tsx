'use client';

import { DepthLevel, depthLabel, depthColor } from '@/data/posts';

interface DepthBadgeProps {
  depth: DepthLevel;
  className?: string;
}

export default function DepthBadge({ depth, className = '' }: DepthBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${depthColor(depth)} ${className}`}
    >
      {depth === 'entry' && '🟢'}
      {depth === 'mid' && '🟡'}
      {depth === 'deep' && '🔴'}
      {depthLabel(depth)}
    </span>
  );
}
