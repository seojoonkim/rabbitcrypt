#!/usr/bin/env node
/**
 * update-reactions.mjs
 * 
 * 텔레그램 채널 전체 스크래핑 → 모든 글의 reactions 업데이트
 * 
 * Usage: node scripts/update-reactions.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POSTS_PATH = join(ROOT, 'data', 'posts.ts');
const SYNC_STATE_PATH = join(ROOT, 'data', 'sync-state.json');
const CHANNEL = 'simon_rabbit_hole';
const BASE_URL = `https://t.me/s/${CHANNEL}`;
const DELAY_MS = 1200;
const DRY_RUN = process.argv.includes('--dry-run');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(m) { console.log(`[${new Date().toISOString()}] ${m}`); }

// ─── Scrape all messages ───
async function fetchPage(beforeId = null) {
  const url = beforeId ? `${BASE_URL}?before=${beforeId}` : BASE_URL;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function parseReactions(html) {
  const result = new Map(); // msgId → totalReactions
  const blocks = html.split('tgme_widget_message_wrap');

  for (const block of blocks) {
    const postMatch = block.match(/data-post="[^"]+\/(\d+)"/);
    if (!postMatch) continue;
    const msgId = parseInt(postMatch[1]);

    // Reactions: sum all numbers after </i> in the reactions div
    const rxnDiv = block.match(/tgme_widget_message_reactions[^>]*>([\s\S]*?)<\/div>/);
    let total = 0;
    if (rxnDiv) {
      const counts = [...rxnDiv[1].matchAll(/<\/i>(\d+)/g)];
      total = counts.reduce((s, m) => s + parseInt(m[1]), 0);
    }
    result.set(msgId, total);
  }
  return result;
}

async function scrapeAllReactions() {
  log('📡 Scraping reactions from all pages...');
  const allReactions = new Map();
  let beforeId = null;
  let pageCount = 0;
  const MAX_PAGES = 25;

  while (pageCount < MAX_PAGES) {
    const html = await fetchPage(beforeId);
    const pageReactions = parseReactions(html);

    if (pageReactions.size === 0) { log('No messages found, stopping.'); break; }

    let newCount = 0;
    for (const [id, rxn] of pageReactions) {
      if (!allReactions.has(id)) { allReactions.set(id, rxn); newCount++; }
    }

    const minId = Math.min(...pageReactions.keys());
    log(`  Page ${pageCount + 1}: ${pageReactions.size} messages, min ID ${minId}`);

    if (newCount === 0) break;
    if (beforeId !== null && minId >= beforeId) break;
    beforeId = minId;
    pageCount++;
    await sleep(DELAY_MS);
  }

  log(`✅ Total reactions scraped: ${allReactions.size} messages`);
  return allReactions;
}

// ─── Update posts.ts ───
function updateAllReactions(src, reactionMap, slugToMsgId) {
  let updated = 0;
  const changes = [];

  for (const [slug, msgId] of Object.entries(slugToMsgId)) {
    if (!reactionMap.has(msgId)) continue;
    const newCount = reactionMap.get(msgId);

    // Find this post's reactions field
    const slugIdx = src.indexOf(`slug: '${slug}'`);
    if (slugIdx === -1) continue;

    const blockEnd = src.indexOf('\n  },', slugIdx);
    if (blockEnd === -1) continue;

    const block = src.slice(slugIdx, blockEnd);
    const rxnMatch = block.match(/reactions:\s*(\d+)/);
    if (!rxnMatch) continue;

    const oldCount = parseInt(rxnMatch[1]);
    if (oldCount === newCount) continue;

    // Replace in src
    const before = src;
    src = src.slice(0, slugIdx) +
      block.replace(/reactions:\s*\d+/, `reactions: ${newCount}`) +
      src.slice(blockEnd);

    if (src !== before) {
      changes.push({ slug, msgId, old: oldCount, new: newCount });
      updated++;
    }
  }

  return { src, updated, changes };
}

async function main() {
  log('💫 Starting reactions update...');
  if (DRY_RUN) log('🔍 DRY_RUN mode');

  const state = JSON.parse(readFileSync(SYNC_STATE_PATH, 'utf8'));
  const slugToMsgId = state.slugToMsgId;

  // Scrape all reactions
  const reactionMap = await scrapeAllReactions();

  // Load posts.ts
  let src = readFileSync(POSTS_PATH, 'utf8');

  // Update
  const { src: newSrc, updated, changes } = updateAllReactions(src, reactionMap, slugToMsgId);

  log(`\n📊 Changes: ${updated} posts updated`);
  for (const c of changes) {
    log(`  ${c.slug} (#${c.msgId}): ${c.old} → ${c.new}`);
  }

  if (updated === 0) {
    log('Nothing to update.');
    return;
  }

  if (!DRY_RUN) {
    copyFileSync(POSTS_PATH, POSTS_PATH + '.bak');
    writeFileSync(POSTS_PATH, newSrc, 'utf8');
    log('✅ posts.ts written');

    // TypeScript check
    try {
      execSync('npx tsc --noEmit', { cwd: ROOT, stdio: 'pipe' });
      log('✅ TypeScript OK');
    } catch (e) {
      log('❌ TypeScript error — reverting');
      copyFileSync(POSTS_PATH + '.bak', POSTS_PATH);
      process.exit(1);
    }

    // Git commit + push
    execSync('git add -A', { cwd: ROOT, stdio: 'pipe' });
    execSync(`git commit -m "reactions: ${updated}개 글 좋아요 업데이트"`, { cwd: ROOT, stdio: 'pipe' });
    execSync('git push origin main', { cwd: ROOT, stdio: 'pipe' });
    log('✅ Git pushed');

    // Vercel check
    await sleep(25000);
    const vercelOut = execSync('vercel ls --yes 2>&1 | head -6', { cwd: ROOT }).toString();
    const latestLine = vercelOut.split('\n').find(l => l.includes('seojoonkims'));
    const status = latestLine?.includes('● Ready') ? '✅ Ready' : '❌ ' + (latestLine || 'unknown');
    log('Vercel: ' + status);
  }
}

main().catch(err => { console.error('💥', err); process.exit(1); });
