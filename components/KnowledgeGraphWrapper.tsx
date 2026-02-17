'use client';

import dynamic from 'next/dynamic';

const KnowledgeGraphInner = dynamic(() => import('./KnowledgeGraph'), { ssr: false });

interface RelationItem {
  slug: string;
  score: number;
}

interface PostMeta {
  slug: string;
  title: string;
}

interface Props {
  currentSlug: string;
  relations: RelationItem[];
  posts: PostMeta[];
}

export default function KnowledgeGraphWrapper(props: Props) {
  return <KnowledgeGraphInner {...props} />;
}
