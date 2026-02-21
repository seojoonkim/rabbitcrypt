#!/usr/bin/env node
/**
 * backfill-media.mjs
 * 
 * 이전에 미디어 없이 추가된 글들의 이미지/영상을 소급 다운로드하고
 * posts.ts를 업데이트한다.
 * 
 * Usage: node scripts/backfill-media.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, createWriteStream, statSync, copyFileSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POSTS_PATH = join(ROOT, 'data', 'posts.ts');
const SCRAPED_PATH = join(ROOT, 'data', 'scraped-posts.json');
const MEDIA_DIR = join(ROOT, 'public', 'media');
const MEDIA_MIN_SIZE = 5 * 1024; // 5KB
const MAX_RETRIES = 3;
const DELAY_MS = 800;

// slug → telegram msg ID 매핑 (이미 posts.ts에 있지만 telegramMsgId 없는 것들)
const BACKFILL_MAP = {
  'uncertainty-machine': 67,
  'counting-assistant': 68,
  'sano-intro': 69,
  'naming-the-universe': 70,
  'web4-write-access': 71,
  'transistor-moment': 72,
  '14-5-hours': 73,
  'sano-godaddy-war': 74,
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(m) { console.log(`[${new Date().toISOString()}] ${m}`); }
function warn(m) { console.warn(`[${new Date().toISOString()}] ⚠️  ${m}`); }

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
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function downloadMedia(url, msgId, index) {
  if (!existsSync(MEDIA_DIR)) mkdirSync(MEDIA_DIR, { recursive: true });
  
  // Infer extension from URL or default to .jpg
  const urlPath = url.split('?')[0];
  let ext = extname(urlPath);
  if (!ext || ext.length > 5) ext = '.jpg';
  
  const filename = `msg-${msgId}-${index}${ext}`;
  const destPath = join(MEDIA_DIR, filename);
  
  // Already downloaded?
  if (existsSync(destPath)) {
    const size = statSync(destPath).size;
    if (size >= MEDIA_MIN_SIZE) {
      log(`  ✅ Already exists: ${filename} (${(size/1024).toFixed(1)}KB)`);
      return `/media/${filename}`;
    }
  }
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    log(`  📥 Downloading (attempt ${attempt}): ${filename}`);
    try {
      await downloadFile(url, destPath);
      const size = statSync(destPath).size;
      if (size < MEDIA_MIN_SIZE) {
        warn(`  Too small (${size} bytes), retrying...`);
        await sleep(2000);
        continue;
      }
      log(`  ✅ Downloaded: ${filename} (${(size/1024).toFixed(1)}KB)`);
      return `/media/${filename}`;
    } catch (err) {
      warn(`  Failed: ${err.message}`);
      if (attempt < MAX_RETRIES) await sleep(3000);
    }
  }
  
  warn(`  ❌ Could not download: ${url}`);
  return null;
}

function addMediaToPost(src, slug, imageUrls, videoUrls) {
  // Find the post block start
  const slugMarker = `slug: '${slug}'`;
  const idx = src.indexOf(slugMarker);
  if (idx === -1) throw new Error(`Slug '${slug}' not found in posts.ts`);
  
  // Find the start of this post object (the opening {)
  const blockStart = src.lastIndexOf('\n  {', idx);
  
  // Find the end of this post object (next '},')
  const blockEnd = src.indexOf('\n  },', idx);
  if (blockEnd === -1) throw new Error(`Could not find end of post block for '${slug}'`);
  
  const blockContent = src.slice(blockStart, blockEnd + 4);
  
  // Check if mediaUrls already exists
  if (blockContent.includes('mediaUrls:') || blockContent.includes('videoUrls:')) {
    warn(`  '${slug}' already has media fields, skipping`);
    return src;
  }
  
  // Add telegramMsgId if not present
  let newBlock = blockContent;
  if (!newBlock.includes('telegramMsgId:')) {
    const msgId = BACKFILL_MAP[slug];
    if (msgId) {
      newBlock = newBlock.replace(
        `slug: '${slug}'`,
        `slug: '${slug}',\n    telegramMsgId: ${msgId}`
      );
    }
  }
  
  // Build media lines
  const mediaLines = [];
  if (imageUrls.length > 0) {
    mediaLines.push(`    mediaUrls: [${imageUrls.map(u => `'${u}'`).join(', ')}],`);
  }
  if (videoUrls.length > 0) {
    mediaLines.push(`    videoUrls: [${videoUrls.map(u => `'${u}'`).join(', ')}],`);
  }
  
  if (mediaLines.length === 0) return src;
  
  // Insert before the closing }
  const closingIdx = newBlock.lastIndexOf('\n  }');
  newBlock = newBlock.slice(0, closingIdx) + '\n' + mediaLines.join('\n') + newBlock.slice(closingIdx);
  
  return src.slice(0, blockStart) + newBlock + src.slice(blockEnd + 4);
}

async function main() {
  log('🖼️  Starting media backfill...');
  
  const scraped = JSON.parse(readFileSync(SCRAPED_PATH, 'utf8'));
  const scrapedMap = {};
  for (const msg of scraped) scrapedMap[msg.id] = msg;
  
  let src = readFileSync(POSTS_PATH, 'utf8');
  copyFileSync(POSTS_PATH, POSTS_PATH + '.bak');
  
  const updated = [];
  const failed = [];
  
  for (const [slug, msgId] of Object.entries(BACKFILL_MAP)) {
    log(`\n📝 Processing: ${slug} (msg #${msgId})`);
    
    const msg = scrapedMap[msgId];
    if (!msg) {
      warn(`  Msg #${msgId} not found in scraped-posts.json`);
      failed.push(slug);
      continue;
    }
    
    const rawImages = msg.mediaUrls || [];
    const rawVideos = msg.videoUrls || [];
    
    if (rawImages.length === 0 && rawVideos.length === 0) {
      log(`  No media in this message, skipping`);
      continue;
    }
    
    log(`  Media: ${rawImages.length} images, ${rawVideos.length} videos`);
    
    const localImages = [];
    const localVideos = [];
    
    for (let i = 0; i < rawImages.length; i++) {
      let url = rawImages[i];
      if (url.startsWith('//')) url = 'https:' + url;
      if (url.includes('/img/emoji/') || url.includes('/img/tg/')) continue;
      const local = await downloadMedia(url, msgId, i);
      if (local) localImages.push(local);
      await sleep(DELAY_MS);
    }
    
    for (let i = 0; i < rawVideos.length; i++) {
      let url = rawVideos[i];
      if (url.startsWith('//')) url = 'https:' + url;
      const local = await downloadMedia(url, msgId, `v${i}`);
      if (local) localVideos.push(local);
      await sleep(DELAY_MS);
    }
    
    if (localImages.length === 0 && localVideos.length === 0) {
      warn(`  All downloads failed for ${slug}`);
      failed.push(slug);
      continue;
    }
    
    try {
      src = addMediaToPost(src, slug, localImages, localVideos);
      updated.push({ slug, images: localImages.length, videos: localVideos.length });
      log(`  ✅ Added to posts.ts: ${localImages.length} images, ${localVideos.length} videos`);
    } catch (err) {
      warn(`  posts.ts update failed: ${err.message}`);
      failed.push(slug);
    }
  }
  
  // Write updated posts.ts
  if (updated.length > 0) {
    writeFileSync(POSTS_PATH, src, 'utf8');
    log('\n✅ posts.ts written');
    
    // Verify
    const freshSrc = readFileSync(POSTS_PATH, 'utf8');
    for (const { slug } of updated) {
      if (!freshSrc.includes(`/media/msg-${BACKFILL_MAP[slug]}`)) {
        warn(`Verification failed for '${slug}' — media path not found in posts.ts`);
      } else {
        log(`  ✅ Verified: ${slug}`);
      }
    }
    
    // Git commit + push
    try {
      execSync('git add -A', { cwd: ROOT, stdio: 'pipe' });
      const slugList = updated.map(u => u.slug).join(', ');
      execSync(`git commit -m "backfill-media: ${updated.length}개 글 이미지 추가 (${slugList})"`, { cwd: ROOT, stdio: 'pipe' });
      execSync('git push origin main', { cwd: ROOT, stdio: 'pipe' });
      log('✅ Git pushed');
    } catch (err) {
      warn('Git push failed: ' + err.message);
    }
  }
  
  // Summary
  log('\n─────────────────────────────────');
  log(`✅ Backfill complete`);
  log(`   Updated: ${updated.length} posts`);
  for (const u of updated) log(`   • ${u.slug}: ${u.images}img ${u.videos}vid`);
  if (failed.length > 0) {
    log(`   Failed: ${failed.join(', ')}`);
  }
}

main().catch(err => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
