#!/usr/bin/env tsx
/**
 * generate-relations.ts
 * Claude API를 사용해서 포스트 간 연관도를 계산하고 data/relations.json에 저장
 *
 * 실행: npx tsx scripts/generate-relations.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

// posts.ts에서 포스트 데이터 직접 로드 (tsx가 TS 파일을 직접 실행)
interface Post {
  id: string;
  slug: string;
  title: string;
  category: string;
  depth: string;
  summary: string;
  content: string;
  date: string;
  reactions: number;
  tags: string[];
  relatedSlugs: string[];
}

// posts.ts 파일을 직접 읽어서 동적으로 로드
const postsFilePath = path.join(__dirname, '..', 'data', 'posts.ts');
const postsContent = fs.readFileSync(postsFilePath, 'utf-8');

// posts 배열 추출 (간단한 파싱)
// tsx 환경에서는 require나 import를 사용할 수 있지만,
// moduleResolution: bundler 때문에 직접 import 사용
const { posts } = await import('../data/posts.js').catch(() => {
  // fallback: posts.ts를 직접 파싱
  throw new Error('Could not import posts. Try running with tsx which handles TypeScript natively.');
});

async function generateRelations() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
    console.error('   export ANTHROPIC_API_KEY=sk-ant-... 후 다시 실행하세요.');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  console.log(`📚 포스트 ${posts.length}개 분석 중...`);

  const postSummaries = (posts as Post[]).map((p) =>
    `- slug: ${p.slug}, 제목: ${p.title}, 카테고리: ${p.category}, 태그: ${p.tags.join(', ')}, 요약: ${p.summary.slice(0, 80)}`
  ).join('\n');

  const prompt = `다음 블로그 포스트들 간의 주제/개념적 연관도를 0-100 점수로 평가해주세요.

포스트 목록:
${postSummaries}

각 포스트에 대해 가장 연관도 높은 상위 5개 포스트와 점수를 JSON으로 반환해주세요.
- 같은 카테고리라고 점수가 높은 게 아니라 주제/개념적 연관성으로 평가
- 90점+: 거의 같은 주제, 70-89점: 밀접 연관, 50-69점: 간접 연관

반드시 이 JSON 형식만 반환 (다른 텍스트 없이):
{
  "slug1": [{ "slug": "slug2", "score": 85 }, ...최대 5개],
  "slug2": [...],
  ...
}`;

  console.log('🤖 Claude에게 연관도 분석 요청 중...');

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  // JSON 추출 (```json ... ``` 블록 처리)
  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                    responseText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.error('❌ Claude 응답에서 JSON을 찾을 수 없습니다.');
    console.error('응답:', responseText);
    process.exit(1);
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];

  let relations: Record<string, Array<{ slug: string; score: number }>>;
  try {
    relations = JSON.parse(jsonStr);
  } catch (e) {
    console.error('❌ JSON 파싱 실패:', e);
    console.error('원본:', jsonStr);
    process.exit(1);
  }

  // 각 슬러그에 대해 상위 5개만 유지하고, 자기 자신 제외
  const cleanedRelations: Record<string, Array<{ slug: string; score: number }>> = {};
  const validSlugs = new Set((posts as Post[]).map((p) => p.slug));

  for (const [slug, related] of Object.entries(relations)) {
    if (!validSlugs.has(slug)) continue;

    const cleaned = related
      .filter((r) => r.slug !== slug && validSlugs.has(r.slug))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    cleanedRelations[slug] = cleaned;
  }

  // data/relations.json에 저장
  const outputPath = path.join(__dirname, '..', 'data', 'relations.json');
  fs.writeFileSync(outputPath, JSON.stringify(cleanedRelations, null, 2), 'utf-8');

  console.log(`✅ relations.json 생성 완료! (${outputPath})`);
  console.log(`   ${Object.keys(cleanedRelations).length}개 포스트의 연관도 데이터 저장됨`);

  // 샘플 출력
  const firstSlug = Object.keys(cleanedRelations)[0];
  if (firstSlug) {
    console.log(`\n📊 샘플 (${firstSlug}):`);
    cleanedRelations[firstSlug].forEach((r) => {
      const post = (posts as Post[]).find((p) => p.slug === r.slug);
      console.log(`   ${r.score}% - ${post?.title || r.slug}`);
    });
  }
}

generateRelations().catch(console.error);
