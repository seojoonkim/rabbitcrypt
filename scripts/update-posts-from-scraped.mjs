#!/usr/bin/env node
/**
 * update-posts-from-scraped.mjs
 * 
 * 스크래핑한 텔레그램 원본으로 posts.ts의 content를 업데이트
 * - scraped-posts.json → posts.ts content 교체
 * - 매핑 테이블 기반 (slug ↔ telegram message ID)
 * - 백업 자동 생성
 * 
 * Usage: node scripts/update-posts-from-scraped.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_PATH = join(__dirname, '..', 'data', 'posts.ts');
const SCRAPED_PATH = join(__dirname, '..', 'data', 'scraped-posts.json');
const DRY_RUN = process.argv.includes('--dry-run');

// === Slug ↔ Telegram Message ID Mapping ===
const SLUG_TO_MSG_ID = {
  'vibe-founders-era': 5,       // "역삼각형 인재의 시대" (3주 전에 쓴 글...)
  'vibe-coding-tip': 7,         // "바이브 코딩의 숨겨진 장점"
  'vibelabs-landing': 6,        // "vibelabs.hashed.com을 만든 이야기"
  'moltbot-anthropic-moat': 10, // Clawdbot에서 Moltbot으로
  'overnight-success': 11,      // "하룻밤의 성공은 없다"
  'bitcoin-energy': 14,         // "에너지의 화폐화"
  'thought-speed': 16,          // "생각의 속도로"
  'gemini-snow-bunny': 17,      // Gemini 3.5 Snow Bunny
  'figma-last-manual': 18,      // "마지막 수동변속기"
  'ai-unbundling': 19,          // "삼키고, 쪼개고"
  'prompt-guard-dev': 21,       // "Prompt Guard 개발기"
  'hvl-first-meetup': 30,       // "Hashed Vibe Labs 참가팀 모집"
  'its-fun': 24,                // "아, 재밌다!!!"
  'click-theology': 26,         // "딸깍의 신학"
  'thank-you-mirror': 27,       // "고마워요"
  'ai-hires-ai': 28,            // "AI가 AI를 고용하는 날"
  'majlis': 29,                 // "느림과 공동체의 미학"
  'rabbit-crypt-name': 65,      // "Rabbit Crypt"
  'agentlinter-dev-log': 44,    // "AgentLinter 개발기"
  'agentlinter-v040': 45,       // "AgentLinter v0.4.0"
  'claude-md-english': 46,      // "CLAUDE.md, 영어로"
  'mrinank-anthropic': null,    // NOT in scraped (separate messages? or between 46-49)
  'tail-stopped': 49,           // "꼬리가 멈춘 뒤에"
  'zeon-moltbook-vol1': 51,     // "Zeon on Moltbook vol.1"
  'ip-tvw': 53,                 // "창작의 비용이 제로가 된 세상에서"
  'quantum-pirates': 55,        // "690만 BTC를 노리는 양자 해적들"
  'china-ai-frontier': 56,      // "중국 프론티어 모델들"
  'seedance-30': 57,            // "Seedance 3.0 스펙 루머"
  'agent-siblings': 58,         // "에이전트 삼남매"
  'matchhz': 59,                // "MatchHz" 소설
  'dollar-two-faces': null,     // NOT found in scraped (might be in a gap)
  'messenger-b2a': 62,          // "메신저의 새로운 전쟁터"
  'robot-goku-5000': 63,        // "5천 달러짜리 손오공"
  'hvl-fellows': 54,            // "Hashed Vibe Labs Fellows 소개"
};

// Posts in scraped but NOT in posts.ts (potential new additions)
const SCRAPED_ONLY = {
  4: '토끼굴 소개 (짧은 글)',
  12: 'AI가 당신의 일자리를 가져간 후',
  13: '아이디어 경쟁 (짧은 글)',
  15: '서울신문 기사 소개 (짧은 글)',
  20: 'Moltbook 소개 (짧은 글)',
  25: 'Prompt Guard v2.5.0',
  31: 'openclaw와의 소통',
  32: 'AI 에이전트와 함께 20명이 1000명처럼',
  42: '블록체인 위에 새겨진 에이전트의 여권',
  43: '"크립토는 죽었다"에 대한 생각',
  64: '채널명 변경 알림',
};

function cleanScrapedContent(fullText, title) {
  let content = fullText;
  
  // Remove title from content (it's stored separately)
  // Title might be wrapped in ** or at the start
  const titlePatterns = [
    new RegExp(`^\\*\\*${escapeRegex(title)}\\s*\\*\\*\\s*\\n*`, 'i'),
    new RegExp(`^${escapeRegex(title)}\\s*\\n*`, 'i'),
  ];
  for (const p of titlePatterns) {
    content = content.replace(p, '');
  }
  
  // Clean up HTML entities
  content = content
    .replace(/&#33;/g, '!')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
  
  // Remove leading/trailing empty lines
  content = content.replace(/^\n+/, '').replace(/\n+$/, '');
  
  return content;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeForTemplateLiteral(str) {
  // Must escape: backslash first, then backtick, then ${
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function cleanMarkdownForContent(str) {
  // Remove markdown code blocks (```) — they break template literals
  // Convert to plain text representation
  let result = str;
  // Replace ``` code blocks with indented text
  result = result.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => {
    return code.trim();
  });
  return result;
}

function main() {
  const scraped = JSON.parse(readFileSync(SCRAPED_PATH, 'utf8'));
  const scrapedMap = {};
  for (const s of scraped) scrapedMap[s.id] = s;
  
  let postsTs = readFileSync(POSTS_PATH, 'utf8');
  
  // Backup
  if (!DRY_RUN) {
    const backupPath = POSTS_PATH + '.backup-' + new Date().toISOString().replace(/[:.]/g, '-');
    copyFileSync(POSTS_PATH, backupPath);
    console.log(`Backup: ${backupPath}`);
  }
  
  const results = { updated: [], skipped: [], missing: [], errors: [] };
  
  for (const [slug, msgId] of Object.entries(SLUG_TO_MSG_ID)) {
    if (!msgId) {
      results.missing.push({ slug, reason: 'no message ID mapped' });
      continue;
    }
    
    const scrapedPost = scrapedMap[msgId];
    if (!scrapedPost) {
      results.missing.push({ slug, msgId, reason: 'message not in scraped data' });
      continue;
    }
    
    // Extract current content from posts.ts
    const slugPattern = new RegExp(
      `(slug: '${escapeRegex(slug)}'[\\s\\S]*?content: \`)([\\s\\S]*?)(\`)`
    );
    const match = postsTs.match(slugPattern);
    
    if (!match) {
      results.errors.push({ slug, reason: 'slug not found in posts.ts' });
      continue;
    }
    
    const currentContent = match[2];
    const scrapedTitle = scrapedPost.title
      .replace(/&#33;/g, '!')
      .replace(/\*\*/g, '')
      .trim();
    
    let newContent = cleanScrapedContent(scrapedPost.fullText, scrapedTitle);
    
    // Check if update is needed
    const currentLen = currentContent.length;
    const newLen = newContent.length;
    
    if (newLen <= currentLen) {
      results.skipped.push({ slug, currentLen, newLen, reason: 'scraped not longer' });
      continue;
    }
    
    // Clean markdown code blocks and escape for template literal
    newContent = cleanMarkdownForContent(newContent);
    const escapedContent = escapeForTemplateLiteral(newContent);
    
    // Replace in posts.ts
    const before = postsTs;
    postsTs = postsTs.replace(slugPattern, `$1${escapedContent}$3`);
    
    if (postsTs === before) {
      results.errors.push({ slug, reason: 'replacement failed' });
      continue;
    }
    
    const diff = newLen - currentLen;
    const pct = Math.round((diff / newLen) * 100);
    results.updated.push({ slug, currentLen, newLen, added: diff, pct });
  }
  
  // Report
  console.log('\n=== UPDATE REPORT ===\n');
  
  console.log(`✅ UPDATED (${results.updated.length}):`);
  for (const u of results.updated) {
    console.log(`  ${u.slug}: ${u.currentLen}자 → ${u.newLen}자 (+${u.added}자, ${u.pct}% was missing)`);
  }
  
  console.log(`\n⏭️  SKIPPED (${results.skipped.length}):`);
  for (const s of results.skipped) {
    console.log(`  ${s.slug}: ${s.currentLen}자 vs ${s.newLen}자 — ${s.reason}`);
  }
  
  console.log(`\n⚠️  MISSING (${results.missing.length}):`);
  for (const m of results.missing) {
    console.log(`  ${m.slug}: ${m.reason}`);
  }
  
  if (results.errors.length) {
    console.log(`\n❌ ERRORS (${results.errors.length}):`);
    for (const e of results.errors) {
      console.log(`  ${e.slug}: ${e.reason}`);
    }
  }
  
  // Save
  if (!DRY_RUN && results.updated.length > 0) {
    writeFileSync(POSTS_PATH, postsTs, 'utf8');
    console.log(`\n💾 Saved ${results.updated.length} updates to posts.ts`);
  } else if (DRY_RUN) {
    console.log('\n🔍 DRY RUN — no changes written');
  }
  
  // Summary of posts in scraped but not in posts.ts
  console.log('\n📋 SCRAPED BUT NOT IN POSTS.TS:');
  for (const [id, desc] of Object.entries(SCRAPED_ONLY)) {
    const s = scrapedMap[parseInt(id)];
    if (s) console.log(`  #${id}: ${desc} (${s.charCount}자)`);
  }
}

main();
