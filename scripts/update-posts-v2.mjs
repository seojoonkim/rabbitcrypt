#!/usr/bin/env node
/**
 * update-posts-v2.mjs
 * 
 * AST-free approach: parse posts.ts by finding content boundaries,
 * then replace content between backtick delimiters.
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_PATH = join(__dirname, '..', 'data', 'posts.ts');
const SCRAPED_PATH = join(__dirname, '..', 'data', 'scraped-posts.json');
const DRY_RUN = process.argv.includes('--dry-run');

const SLUG_TO_MSG_ID = {
  'vibe-founders-era': 5,
  'vibe-coding-tip': 7,
  'vibelabs-landing': 6,
  'moltbot-anthropic-moat': 10,
  'overnight-success': 11,
  'bitcoin-energy': 14,
  'thought-speed': 16,
  'gemini-snow-bunny': 17,
  'figma-last-manual': 18,
  'ai-unbundling': 19,
  'prompt-guard-dev': 21,
  'hvl-first-meetup': 30,
  'its-fun': 24,
  'click-theology': 26,
  'thank-you-mirror': 27,
  'ai-hires-ai': 28,
  'majlis': 29,
  'rabbit-crypt-name': 65,
  'agentlinter-dev-log': 44,
  'agentlinter-v040': 45,
  'claude-md-english': 46,
  'tail-stopped': 49,
  'zeon-moltbook-vol1': 51,
  'ip-tvw': 53,
  'quantum-pirates': 55,
  'china-ai-frontier': 56,
  'seedance-30': 57,
  'agent-siblings': 58,
  'matchhz': 59,
  'messenger-b2a': 62,
  'robot-goku-5000': 63,
  'hvl-fellows': 54,
};

function cleanContent(fullText, title) {
  let content = fullText;
  
  // Remove title (may be wrapped in **)
  const cleanTitle = title.replace(/\*\*/g, '').replace(/&#33;/g, '!').trim();
  const patterns = [
    new RegExp(`^\\*\\*${escapeRx(cleanTitle)}\\s*\\*\\*\\s*\\n*`),
    new RegExp(`^${escapeRx(cleanTitle)}\\s*\\n*`),
  ];
  for (const p of patterns) content = content.replace(p, '');
  
  // HTML entities
  content = content
    .replace(/&#33;/g, '!')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
  
  return content.trim();
}

function escapeRx(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function main() {
  const scraped = JSON.parse(readFileSync(SCRAPED_PATH, 'utf8'));
  const scrapedMap = {};
  for (const s of scraped) scrapedMap[s.id] = s;

  let src = readFileSync(POSTS_PATH, 'utf8');

  // Backup
  if (!DRY_RUN) {
    const bp = POSTS_PATH + '.bak-v2';
    copyFileSync(POSTS_PATH, bp);
    console.log('Backup:', bp);
  }

  const results = { updated: [], skipped: [], errors: [] };

  for (const [slug, msgId] of Object.entries(SLUG_TO_MSG_ID)) {
    if (!msgId) continue;
    const sp = scrapedMap[msgId];
    if (!sp) { results.errors.push({ slug, reason: 'no scraped data' }); continue; }

    // Find slug position
    const slugIdx = src.indexOf(`slug: '${slug}'`);
    if (slugIdx === -1) { results.errors.push({ slug, reason: 'slug not found' }); continue; }

    // Find "content: `" after slug
    const contentStart = src.indexOf("content: `", slugIdx);
    if (contentStart === -1) { results.errors.push({ slug, reason: 'content field not found' }); continue; }

    // Find the opening backtick position
    const openBt = contentStart + "content: `".length;

    // Find closing backtick: scan forward, skipping escaped backticks (\`)
    let closeBt = openBt;
    while (closeBt < src.length) {
      if (src[closeBt] === '`' && src[closeBt - 1] !== '\\') {
        break;
      }
      closeBt++;
    }

    const currentContent = src.substring(openBt, closeBt);
    const newContent = cleanContent(sp.fullText, sp.title);

    if (newContent.length <= currentContent.length) {
      results.skipped.push({ slug, cur: currentContent.length, new: newContent.length });
      continue;
    }

    // Escape for template literal: backtick and ${
    // Note: backslashes in the scraped content are literal, not escape sequences
    const escaped = newContent
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$\{/g, '\\${');

    src = src.substring(0, openBt) + escaped + src.substring(closeBt);

    const added = newContent.length - currentContent.length;
    results.updated.push({ slug, cur: currentContent.length, new: newContent.length, added });
  }

  // Report
  console.log('\n=== REPORT ===\n');
  console.log(`✅ UPDATED (${results.updated.length}):`);
  for (const u of results.updated) {
    console.log(`  ${u.slug}: ${u.cur}→${u.new} (+${u.added}자)`);
  }
  console.log(`\n⏭️ SKIPPED (${results.skipped.length}):`);
  for (const s of results.skipped) {
    console.log(`  ${s.slug}: ${s.cur}→${s.new}`);
  }
  if (results.errors.length) {
    console.log(`\n❌ ERRORS (${results.errors.length}):`);
    for (const e of results.errors) console.log(`  ${e.slug}: ${e.reason}`);
  }

  if (!DRY_RUN && results.updated.length > 0) {
    writeFileSync(POSTS_PATH, src, 'utf8');
    console.log(`\n💾 Saved ${results.updated.length} updates`);
  } else if (DRY_RUN) {
    console.log('\n🔍 DRY RUN');
  }
}

main();
