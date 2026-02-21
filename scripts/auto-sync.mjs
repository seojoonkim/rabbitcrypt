#!/usr/bin/env node
/**
 * auto-sync.mjs
 * 
 * 토끼굴 Telegram 채널 → Rabbit Crypt 웹사이트 자동 동기화
 * 
 * 기능:
 *   1. t.me/s/simon_rabbit_hole 전체 스크래핑 (페이지네이션)
 *   2. 새 글 감지 (sync-state.json 기반)
 *   3. 텍스트 2중 검증 (재요청 비교)
 *   4. 이미지/영상 다운로드 + 2중 검증
 *   5. Claude API로 메타데이터 자동 생성 (slug, category, summary, tags)
 *   6. 기존 글 reactions 업데이트
 *   7. posts.ts 업데이트
 *   8. Git commit + push → Vercel 자동 배포
 *   9. Telegram DM 결과 보고
 * 
 * Usage: node scripts/auto-sync.mjs [--dry-run] [--force-all]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, statSync, createWriteStream } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const CHANNEL = 'simon_rabbit_hole';
const BASE_URL = `https://t.me/s/${CHANNEL}`;
const POSTS_PATH = join(ROOT, 'data', 'posts.ts');
const SCRAPED_PATH = join(ROOT, 'data', 'scraped-posts.json');
const SYNC_STATE_PATH = join(ROOT, 'data', 'sync-state.json');
const MEDIA_DIR = join(ROOT, 'public', 'media');
const DELAY_MS = 1200;
const MIN_TEXT_LENGTH = 150; // 이보다 짧으면 이미지/공지로 간주
const TEXT_MISMATCH_THRESHOLD = 0.1; // 10% 이상 차이나면 재시도
const MEDIA_MIN_SIZE = 5 * 1024; // 5KB 미만이면 다운로드 실패로 간주
const MAX_RETRIES = 3;

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE_ALL = process.argv.includes('--force-all');

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function warn(msg) {
  console.warn(`[${new Date().toISOString()}] ⚠️  ${msg}`);
}

function escapeBacktick(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 60);
}

// ─────────────────────────────────────────────
// State management
// ─────────────────────────────────────────────
function loadState() {
  if (!existsSync(SYNC_STATE_PATH)) {
    return {
      lastSyncedAt: null,
      lastMsgId: 0,
      processedMsgIds: [],
      skippedMsgIds: [],
      slugToMsgId: {},
    };
  }
  return JSON.parse(readFileSync(SYNC_STATE_PATH, 'utf8'));
}

function saveState(state) {
  state.lastSyncedAt = new Date().toISOString();
  if (!DRY_RUN) {
    writeFileSync(SYNC_STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
  }
  log('✅ sync-state.json saved');
}

// ─────────────────────────────────────────────
// Telegram scraping
// ─────────────────────────────────────────────
async function fetchPage(beforeId = null) {
  const url = beforeId ? `${BASE_URL}?before=${beforeId}` : BASE_URL;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseMessages(html) {
  const messages = [];
  const msgBlocks = html.split('tgme_widget_message_wrap');

  for (const block of msgBlocks) {
    const postMatch = block.match(/data-post="([^"]+)"/);
    if (!postMatch) continue;

    const postId = postMatch[1];
    const msgNum = parseInt(postId.split('/')[1]);
    if (!msgNum) continue;

    // Extract text
    const textMatch = block.match(
      /class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<div class="tgme_widget_message_footer)/
    );
    let fullText = '';
    if (textMatch) {
      let raw = textMatch[1];
      raw = raw
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<b>([\s\S]*?)<\/b>/gi, '$1')
        .replace(/<strong>([\s\S]*?)<\/strong>/gi, '$1')
        .replace(/<i>([\s\S]*?)<\/i>/gi, '$1')
        .replace(/<em>([\s\S]*?)<\/em>/gi, '$1')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      fullText = raw;
    }

    // Date
    const dateMatch = block.match(/datetime="([^"]+)"/);
    const date = dateMatch ? dateMatch[1].split('T')[0] : null;

    // Reactions
    const reactions = {};
    let totalReactions = 0;
    const emojiMatches = [...block.matchAll(/class="[^"]*tgme_widget_message_reaction[^"]*"[\s\S]*?(?:<\/div>){3}/g)];
    for (const em of emojiMatches) {
      const counterMatch = em[0].match(/class="[^"]*counter[^"]*"[^>]*>(\d+)</);
      if (counterMatch) {
        totalReactions += parseInt(counterMatch[1]);
      }
    }
    // Simpler fallback: sum all counter spans
    const counterSpans = [...block.matchAll(/class="[^"]*counter[^"]*"[^>]*>(\d+)</g)];
    const countSum = counterSpans.reduce((s, m) => s + parseInt(m[1]), 0);
    totalReactions = Math.max(totalReactions, countSum);

    // Views
    const viewsMatch = block.match(/class="[^"]*tgme_widget_message_views[^"]*"[^>]*>([\d.,K]+)</);
    let views = 0;
    if (viewsMatch) {
      const v = viewsMatch[1].replace(/,/g, '');
      views = v.endsWith('K') ? Math.round(parseFloat(v) * 1000) : parseInt(v) || 0;
    }

    // Media
    const mediaUrls = [];
    const imgBg = [...block.matchAll(/background-image:url\('([^']+)'\)/g)];
    for (const im of imgBg) {
      let url = im[1];
      // Fix protocol-relative URLs
      if (url.startsWith('//')) url = 'https:' + url;
      // Skip emoji and telegram UI images (too small, not real media)
      if (url.includes('/img/emoji/') || url.includes('/img/tg/')) continue;
      if (!mediaUrls.includes(url)) mediaUrls.push(url);
    }
    const imgSrc = [...block.matchAll(/src="([^"]*(?:cdn-telegram|cdn1\.telegram|cdn2\.telegram)[^"]*(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/gi)];
    for (const im of imgSrc) {
      let url = im[1];
      if (url.startsWith('//')) url = 'https:' + url;
      if (!mediaUrls.includes(url)) mediaUrls.push(url);
    }

    const videoUrls = [];
    const videoMatches = [...block.matchAll(/data-src="([^"]*\.mp4[^"]*)"/g)];
    for (const vm of videoMatches) {
      let url = vm[1];
      if (url.startsWith('//')) url = 'https:' + url;
      videoUrls.push(url);
    }

    const lines = fullText.split('\n').filter(l => l.trim());
    const title = lines[0]?.trim() || `Post ${msgNum}`;
    const content = lines.slice(1).join('\n').trim();

    messages.push({
      id: msgNum,
      postId,
      title,
      content: content || fullText,
      fullText,
      date,
      reactions: totalReactions,
      views,
      mediaUrls,
      videoUrls,
      charCount: fullText.length,
    });
  }

  return messages;
}

async function scrapeAll() {
  log('📡 Scraping Telegram channel...');
  const allMessages = new Map();
  let beforeId = null;
  let pageCount = 0;
  const MAX_PAGES = 25;

  while (pageCount < MAX_PAGES) {
    let html;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        html = await fetchPage(beforeId);
        break;
      } catch (err) {
        if (attempt === MAX_RETRIES - 1) throw err;
        await sleep(3000);
      }
    }

    const messages = parseMessages(html);
    if (messages.length === 0) {
      log('No more messages found.');
      break;
    }

    let newCount = 0;
    for (const msg of messages) {
      if (!allMessages.has(msg.id)) {
        allMessages.set(msg.id, msg);
        newCount++;
      }
    }

    const minId = Math.min(...messages.map(m => m.id));
    log(`  Page ${pageCount + 1}: ${messages.length} messages (${newCount} new), min ID: ${minId}`);

    if (newCount === 0) break;
    if (beforeId !== null && minId >= beforeId) break;
    beforeId = minId;
    pageCount++;

    await sleep(DELAY_MS);
  }

  const sorted = [...allMessages.values()].sort((a, b) => a.id - b.id);
  log(`✅ Total scraped: ${sorted.length} messages`);
  return sorted;
}

// ─────────────────────────────────────────────
// Text double-check: re-fetch and compare
// ─────────────────────────────────────────────
async function doubleCheckText(msg) {
  log(`  🔍 Double-checking text for msg #${msg.id}...`);
  await sleep(DELAY_MS);

  // Re-fetch the same page window
  const html = await fetchPage(msg.id + 1);
  const reMsgs = parseMessages(html);
  const reMsg = reMsgs.find(m => m.id === msg.id);

  if (!reMsg) {
    warn(`  Could not find msg #${msg.id} in re-fetch. Using original.`);
    return msg;
  }

  const origLen = msg.fullText.length;
  const reLen = reMsg.fullText.length;
  const diff = Math.abs(origLen - reLen) / Math.max(origLen, reLen);

  if (diff > TEXT_MISMATCH_THRESHOLD) {
    warn(`  Text mismatch for #${msg.id}: orig ${origLen}자 vs re-fetch ${reLen}자 (${(diff*100).toFixed(1)}% diff). Using longer.`);
    return reLen > origLen ? reMsg : msg;
  }

  log(`  ✅ Text verified: ${origLen}자 (diff: ${(diff*100).toFixed(1)}%)`);
  return msg;
}

// ─────────────────────────────────────────────
// Media download + double-check
// ─────────────────────────────────────────────
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = createWriteStream(destPath);
    
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://t.me/',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.destroy();
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.destroy();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Download timeout')); });
  });
}

async function downloadAndVerifyMedia(url, msgId, index, isVideo) {
  if (!existsSync(MEDIA_DIR)) mkdirSync(MEDIA_DIR, { recursive: true });
  
  const ext = extname(url.split('?')[0]) || (isVideo ? '.mp4' : '.jpg');
  const filename = `msg-${msgId}-${index}${ext}`;
  const destPath = join(MEDIA_DIR, filename);
  const publicPath = `/media/${filename}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    log(`    📥 Downloading ${isVideo ? 'video' : 'image'} (attempt ${attempt}): ${filename}`);
    try {
      await downloadFile(url, destPath);
      const size = statSync(destPath).size;
      if (size < MEDIA_MIN_SIZE) {
        warn(`    File too small (${size} bytes), retrying...`);
        await sleep(2000);
        continue;
      }
      log(`    ✅ Downloaded: ${filename} (${(size/1024).toFixed(1)}KB)`);
      return { url: publicPath, filename, size };
    } catch (err) {
      warn(`    Download failed: ${err.message}`);
      if (attempt < MAX_RETRIES) await sleep(3000);
    }
  }
  
  warn(`    ❌ Failed to download after ${MAX_RETRIES} attempts: ${url}`);
  return null;
}

async function downloadAllMedia(msg) {
  const localImageUrls = [];
  const localVideoUrls = [];

  // Images
  for (let i = 0; i < msg.mediaUrls.length; i++) {
    const result = await downloadAndVerifyMedia(msg.mediaUrls[i], msg.id, i, false);
    localImageUrls.push(result ? result.url : msg.mediaUrls[i]);
    await sleep(500);
  }

  // Videos
  for (let i = 0; i < msg.videoUrls.length; i++) {
    const result = await downloadAndVerifyMedia(msg.videoUrls[i], msg.id, `v${i}`, true);
    localVideoUrls.push(result ? result.url : msg.videoUrls[i]);
    await sleep(500);
  }

  return { localImageUrls, localVideoUrls };
}

// ─────────────────────────────────────────────
// GPT-4o: generate metadata
// ─────────────────────────────────────────────
async function generateMetadata(msg) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    warn('OPENAI_API_KEY not set. Using fallback metadata.');
    return generateFallbackMetadata(msg);
  }

  const prompt = `다음은 토끼굴(Rabbit Crypt) 블로그 채널에 올라온 글이다. 이 글에 대한 메타데이터를 JSON으로 생성해줘.

글 내용:
---
${msg.fullText.substring(0, 2000)}
---

다음 JSON 형식으로 응답해. 다른 내용 없이 JSON만:
{
  "slug": "영어-소문자-하이픈-only (최대 50자, 내용을 잘 반영하는 영어 키워드)",
  "title": "한국어 제목 (원문 첫줄 그대로, 최대 40자)",
  "category": "🐇 탐험|🛠️ 빌딩|✍️ 낙서|📖 소설 중 하나",
  "depth": "entry|mid|deep 중 하나",
  "summary": "한국어 1-2문장 요약 (최대 80자)",
  "tags": ["태그1", "태그2", "태그3"]
}

카테고리 기준:
- 🐇 탐험: AI/기술/사회 분석, 인사이트, 관찰
- 🛠️ 빌딩: 개발, 제품 만들기, 빌딩 과정
- ✍️ 낙서: 짧은 생각, 일상, 감상
- 📖 소설: 픽션, 실험적 글쓰기

depth 기준:
- entry: 가벼운 글 (500자 미만)
- mid: 중간 깊이 (500-2000자)
- deep: 깊은 분석 (2000자 이상)

slug 작성 원칙:
- 반드시 영어 소문자 + 하이픈만 사용
- 한국어/특수문자 절대 금지
- 내용을 잘 요약하는 3-6개 영어 단어로`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 512,
          temperature: 0.3,
          messages: [
            { role: 'system', content: 'You are a metadata generator. Respond ONLY with valid JSON, no markdown, no explanation.' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`OpenAI API ${res.status}: ${errBody.slice(0, 100)}`);
      }
      const data = await res.json();
      const jsonText = data.choices[0].message.content.trim();
      
      // Extract JSON from response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      
      const metadata = JSON.parse(jsonMatch[0]);
      
      // Validate and sanitize slug (must be ASCII only)
      if (metadata.slug) {
        metadata.slug = metadata.slug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 60);
      }
      
      log(`  ✅ Metadata generated: slug="${metadata.slug}", category="${metadata.category}"`);
      return metadata;
    } catch (err) {
      warn(`  Metadata generation attempt ${attempt} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) await sleep(2000);
    }
  }

  return generateFallbackMetadata(msg);
}

function generateFallbackMetadata(msg) {
  const charCount = msg.fullText.length;
  const depth = charCount < 500 ? 'entry' : charCount < 2000 ? 'mid' : 'deep';
  // Use post ID as slug to ensure ASCII-only
  const slug = `post-${msg.id}`;
  
  return {
    slug,
    title: msg.title.substring(0, 40),
    category: '🐇 탐험',
    depth,
    summary: msg.content.substring(0, 80).trim() + '...',
    tags: [],
  };
}

// ─────────────────────────────────────────────
// posts.ts: load existing posts
// ─────────────────────────────────────────────
function loadExistingPosts() {
  const src = readFileSync(POSTS_PATH, 'utf8');
  // Extract post IDs (slugs) from posts.ts
  const slugs = [...src.matchAll(/^\s+id:\s*'([^']+)'/gm)].map(m => m[1]);
  const reactions = [...src.matchAll(/reactions:\s*(\d+)/g)].map(m => parseInt(m[1]));
  return { src, slugs };
}

// ─────────────────────────────────────────────
// posts.ts: add new post
// ─────────────────────────────────────────────
function buildPostObject(msg, metadata, localImageUrls, localVideoUrls) {
  const { slug, title, category, depth, summary, tags } = metadata;
  const date = msg.date || new Date().toISOString().split('T')[0];
  const content = escapeBacktick(msg.content || msg.fullText.split('\n').slice(1).join('\n').trim());
  const reactions = msg.reactions || 0;
  
  const mediaLine = localImageUrls.length > 0
    ? `    mediaUrls: [${localImageUrls.map(u => `'${u}'`).join(', ')}],`
    : '';
  const videoLine = localVideoUrls.length > 0
    ? `    videoUrls: [${localVideoUrls.map(u => `'${u}'`).join(', ')}],`
    : '';
  const tagsLine = `    tags: [${tags.map(t => `'${t}'`).join(', ')}],`;

  return `  {
    id: '${slug}',
    slug: '${slug}',
    telegramMsgId: ${msg.id},
    title: '${title.replace(/'/g, "\\'")}',
    category: '${category}',
    depth: '${depth}',
    summary: '${summary.replace(/'/g, "\\'")}',
    content: \`${content}\`,
    date: '${date}',
    reactions: ${reactions},
${tagsLine}
    relatedSlugs: [],${mediaLine ? '\n' + mediaLine : ''}${videoLine ? '\n' + videoLine : ''}
  }`;
}

function addPostToFile(src, postObj) {
  // Insert after the opening of posts array
  const insertMarker = 'export const posts: Post[] = [';
  const idx = src.indexOf(insertMarker);
  if (idx === -1) throw new Error('Could not find posts array in posts.ts');
  
  const insertAt = idx + insertMarker.length;
  const newSrc = src.slice(0, insertAt) + '\n' + postObj + ',\n' + src.slice(insertAt);
  return newSrc;
}

function updateReactions(src, msgId, newReactions, slugToMsgId) {
  // Find the slug for this msgId
  const slug = Object.entries(slugToMsgId).find(([, id]) => id === msgId)?.[0];
  if (!slug) return src;

  // Find the post block and update reactions
  const postRegex = new RegExp(
    `(id:\\s*'${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[\\s\\S]*?reactions:\\s*)\\d+`,
    'm'
  );
  return src.replace(postRegex, `$1${newReactions}`);
}

// ─────────────────────────────────────────────
// Post type: add telegramMsgId field
// ─────────────────────────────────────────────
function ensureTypeHasTelegramMsgId(src) {
  if (src.includes('telegramMsgId')) return src;
  return src.replace(
    'relatedSlugs: string[];',
    'relatedSlugs: string[];\n  telegramMsgId?: number;'
  );
}

// ─────────────────────────────────────────────
// Git: commit + push
// ─────────────────────────────────────────────
function gitCommitAndPush(newPostSlugs, updatedReactions) {
  if (DRY_RUN) {
    log('DRY_RUN: Skipping git commit');
    return;
  }
  
  try {
    execSync('git add -A', { cwd: ROOT, stdio: 'pipe' });
    
    const date = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
    let message = `auto-sync: ${date}`;
    if (newPostSlugs.length > 0) {
      message += ` | +${newPostSlugs.length}편: ${newPostSlugs.join(', ')}`;
    }
    if (updatedReactions > 0) {
      message += ` | reactions ${updatedReactions}개 업데이트`;
    }
    
    execSync(`git commit -m "${message}"`, { cwd: ROOT, stdio: 'pipe' });
    execSync('git push origin main', { cwd: ROOT, stdio: 'pipe' });
    log(`✅ Git pushed: ${message}`);
  } catch (err) {
    // Check if nothing to commit
    if (err.message.includes('nothing to commit')) {
      log('Nothing to commit (no changes).');
    } else {
      throw err;
    }
  }
}

// ─────────────────────────────────────────────
// Telegram notification
// ─────────────────────────────────────────────
async function sendTelegramNotification(newPosts, reactionsUpdated, errors) {
  // Use openclaw's built-in message system via env if available
  // This is called via the cron, so just log for now
  // The cron wrapper will handle notification
  if (newPosts.length === 0 && reactionsUpdated === 0) {
    log('📭 Nothing new to report.');
    return;
  }

  const lines = ['🐇 **토끼굴 싱크 완료**'];
  if (newPosts.length > 0) {
    lines.push(`\n➕ **새 글 ${newPosts.length}편 추가:**`);
    for (const p of newPosts) {
      lines.push(`  • ${p.title} (#${p.msgId})`);
    }
  }
  if (reactionsUpdated > 0) {
    lines.push(`\n💫 좋아요 ${reactionsUpdated}건 업데이트`);
  }
  if (errors.length > 0) {
    lines.push(`\n⚠️ 오류 ${errors.length}건: ${errors.join(', ')}`);
  }

  // Write report to a temp file for the cron to pick up
  const reportPath = join(ROOT, 'data', 'last-sync-report.json');
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    newPosts,
    reactionsUpdated,
    errors,
    message: lines.join('\n'),
  }, null, 2), 'utf8');

  console.log('\n' + lines.join('\n'));
}

// ─────────────────────────────────────────────
// Verification pass
// ─────────────────────────────────────────────
function verifySync(src, newSlugs) {
  const errors = [];
  
  for (const slug of newSlugs) {
    if (!src.includes(`id: '${slug}'`)) {
      errors.push(`Slug '${slug}' not found in posts.ts after sync!`);
    }
    // Check content is not empty
    const contentMatch = src.match(new RegExp(`id: '${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[\\s\\S]*?content: \`([^\`]*)\``));
    if (contentMatch && contentMatch[1].trim().length < 50) {
      errors.push(`Content for '${slug}' seems too short!`);
    }
  }
  
  return errors;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  log('🚀 Starting Rabbit Crypt auto-sync...');
  if (DRY_RUN) log('🔍 DRY_RUN mode — no files will be written');

  const state = loadState();
  const processedSet = new Set(state.processedMsgIds);
  const skippedSet = new Set(state.skippedMsgIds);

  // 1. Scrape channel
  const allMessages = await scrapeAll();
  
  // Save updated scraped data
  if (!DRY_RUN) {
    writeFileSync(SCRAPED_PATH, JSON.stringify(allMessages, null, 2), 'utf8');
  }

  // 2. Find new messages
  let newMessages = allMessages.filter(msg => {
    if (processedSet.has(msg.id)) return false;
    if (skippedSet.has(msg.id)) return false;
    if (FORCE_ALL) return true;
    return true;
  });

  log(`\n📋 New messages to process: ${newMessages.length}`);

  // 3. Load existing posts.ts
  let { src, slugs: existingSlugs } = loadExistingPosts();
  src = ensureTypeHasTelegramMsgId(src);

  const newPostsAdded = [];
  const errors = [];
  let reactionsUpdated = 0;

  // 4. Process each new message
  for (const msg of newMessages) {
    log(`\n📝 Processing msg #${msg.id}: "${msg.title.substring(0, 50)}"`);
    log(`   Length: ${msg.charCount}자`);

    // Skip very short messages (channel notices, image-only)
    if (msg.charCount < MIN_TEXT_LENGTH) {
      log(`   ⏭️  Skipping: too short (${msg.charCount}자 < ${MIN_TEXT_LENGTH}자 threshold)`);
      skippedSet.add(msg.id);
      processedSet.add(msg.id);
      continue;
    }

    try {
      // 4a. Text double-check
      const verifiedMsg = await doubleCheckText(msg);
      
      // 4b. Generate metadata
      const metadata = await generateMetadata(verifiedMsg);
      
      // Ensure slug is unique
      let slug = metadata.slug;
      let slugSuffix = 1;
      while (existingSlugs.includes(slug) || newPostsAdded.some(p => p.slug === slug)) {
        slug = `${metadata.slug}-${slugSuffix++}`;
      }
      metadata.slug = slug;

      // 4c. Download media
      let localImageUrls = verifiedMsg.mediaUrls;
      let localVideoUrls = verifiedMsg.videoUrls;
      
      if (verifiedMsg.mediaUrls.length > 0 || verifiedMsg.videoUrls.length > 0) {
        log(`   📸 Downloading media (${verifiedMsg.mediaUrls.length} images, ${verifiedMsg.videoUrls.length} videos)...`);
        const media = await downloadAllMedia(verifiedMsg);
        localImageUrls = media.localImageUrls;
        localVideoUrls = media.localVideoUrls;
      }

      // 4d. Build and add post
      const postObj = buildPostObject(verifiedMsg, metadata, localImageUrls, localVideoUrls);
      log(`   📄 Built post object: slug="${slug}"`);

      if (!DRY_RUN) {
        src = addPostToFile(src, postObj);
      } else {
        log(`   DRY_RUN: Would add post:\n${postObj.substring(0, 200)}...`);
      }

      processedSet.add(msg.id);
      state.slugToMsgId[slug] = msg.id;
      existingSlugs.push(slug);
      newPostsAdded.push({ slug, title: metadata.title, msgId: msg.id });

      if (msg.id > state.lastMsgId) {
        state.lastMsgId = msg.id;
      }

    } catch (err) {
      warn(`   ❌ Error processing msg #${msg.id}: ${err.message}`);
      errors.push(`#${msg.id}: ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  // 5. Update reactions for recent posts (last 20)
  log('\n💫 Updating reactions...');
  const recentMessages = allMessages.filter(msg => processedSet.has(msg.id));
  const recentSorted = recentMessages.sort((a, b) => b.id - a.id).slice(0, 20);
  
  for (const msg of recentSorted) {
    const slug = Object.entries(state.slugToMsgId).find(([, id]) => id === msg.id)?.[0];
    if (!slug) continue;
    if (!src.includes(`id: '${slug}'`)) continue;
    
    const before = src;
    src = updateReactions(src, msg.id, msg.reactions, state.slugToMsgId);
    if (src !== before) reactionsUpdated++;
  }
  log(`   Updated ${reactionsUpdated} reaction counts`);

  // 6. Write posts.ts
  if (!DRY_RUN && (newPostsAdded.length > 0 || reactionsUpdated > 0)) {
    copyFileSync(POSTS_PATH, POSTS_PATH + '.bak');
    writeFileSync(POSTS_PATH, src, 'utf8');
    log('✅ posts.ts written');
  }

  // 7. Verification pass
  if (newPostsAdded.length > 0 && !DRY_RUN) {
    log('\n🔎 Running verification pass...');
    const freshSrc = readFileSync(POSTS_PATH, 'utf8');
    const verifyErrors = verifySync(freshSrc, newPostsAdded.map(p => p.slug));
    if (verifyErrors.length > 0) {
      for (const ve of verifyErrors) warn(`  ❌ Verify: ${ve}`);
      errors.push(...verifyErrors);
    } else {
      log('  ✅ All new posts verified in posts.ts');
    }
  }

  // 8. Update state
  state.processedMsgIds = [...processedSet].sort((a, b) => a - b);
  state.skippedMsgIds = [...skippedSet].sort((a, b) => a - b);
  saveState(state);

  // 9. Git commit + push
  if (newPostsAdded.length > 0 || reactionsUpdated > 0) {
    try {
      gitCommitAndPush(newPostsAdded.map(p => p.slug), reactionsUpdated);
    } catch (err) {
      warn(`Git push failed: ${err.message}`);
      errors.push(`git push: ${err.message}`);
    }
  } else {
    log('No changes to commit.');
  }

  // 10. Report
  await sendTelegramNotification(newPostsAdded, reactionsUpdated, errors);

  // Summary
  log('\n─────────────────────────────────');
  log(`✅ Sync complete`);
  log(`   New posts: ${newPostsAdded.length}`);
  log(`   Reactions updated: ${reactionsUpdated}`);
  log(`   Errors: ${errors.length}`);
  if (errors.length > 0) {
    for (const e of errors) log(`   ⚠️  ${e}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
