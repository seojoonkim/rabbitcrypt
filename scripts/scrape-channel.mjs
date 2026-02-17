#!/usr/bin/env node
/**
 * scrape-channel.mjs
 * 텔레그램 공개 채널에서 전체 글을 수집하여 JSON으로 저장
 * 
 * Usage: node scripts/scrape-channel.mjs
 * Output: data/scraped-posts.json
 */

import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHANNEL = 'simon_rabbit_hole';
const BASE_URL = `https://t.me/s/${CHANNEL}`;
const OUTPUT = join(__dirname, '..', 'data', 'scraped-posts.json');
const DELAY_MS = 1500; // polite delay between requests

async function fetchPage(beforeId = null) {
  const url = beforeId ? `${BASE_URL}?before=${beforeId}` : BASE_URL;
  console.log(`Fetching: ${url}`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseMessages(html) {
  const messages = [];
  
  // Split by message widget boundaries
  // Telegram web preview wraps each message in tgme_widget_message
  const msgBlocks = html.split('tgme_widget_message_wrap');
  
  for (const block of msgBlocks) {
    // Extract message ID from data-post attribute
    const postMatch = block.match(/data-post="([^"]+)"/);
    if (!postMatch) continue;
    
    const postId = postMatch[1]; // e.g. "simon_rabbit_hole/26"
    const msgNum = parseInt(postId.split('/')[1]);
    
    // Extract text content - look for tgme_widget_message_text
    const textMatch = block.match(/tgme_widget_message_text[^>]*>([\s\S]*?)(?:<\/div>\s*<\/div>|<div class="tgme_widget_message_)/);
    if (!textMatch) continue;
    
    let text = textMatch[1];
    
    // Clean HTML tags but preserve structure
    text = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
      .replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    if (!text || text.length < 50) continue;
    
    // Extract reactions
    const reactions = {};
    const reactionMatches = block.matchAll(/tgme_widget_message_reaction[^>]*>[\s\S]*?<span[^>]*>(\S+)<\/span>[\s\S]*?<span[^>]*class="[^"]*counter[^"]*"[^>]*>(\d+)<\/span>/g);
    for (const rm of reactionMatches) {
      reactions[rm[1]] = parseInt(rm[2]);
    }
    
    // Extract date
    const dateMatch = block.match(/datetime="([^"]+)"/);
    const date = dateMatch ? dateMatch[1] : null;
    
    // Extract media URLs
    const mediaUrls = [];
    const imgMatches = block.matchAll(/background-image:url\('([^']+)'\)/g);
    for (const im of imgMatches) {
      mediaUrls.push(im[1]);
    }
    
    const videoMatches = block.matchAll(/data-src="([^"]*\.mp4[^"]*)"/g);
    for (const vm of videoMatches) {
      mediaUrls.push(vm[1]);
    }
    
    // Extract title (first line or bold text)
    const lines = text.split('\n').filter(l => l.trim());
    const title = lines[0]?.replace(/\*\*/g, '').trim() || '';
    const content = lines.slice(1).join('\n').trim();
    
    messages.push({
      id: msgNum,
      postId,
      title,
      content: content || text,
      fullText: text,
      date,
      reactions,
      mediaUrls,
      charCount: text.length,
    });
  }
  
  return messages;
}

// Alternative: parse from the readable text version (simpler, more reliable)
function parseFromReadableText(html) {
  const messages = [];
  
  // The t.me/s/ page has a specific HTML structure
  // Let's extract using the message boundaries more carefully
  
  // Find all message IDs first
  const postIds = [...html.matchAll(/data-post="simon_rabbit_hole\/(\d+)"/g)].map(m => parseInt(m[1]));
  
  // Find all message text divs
  const textBlocks = [...html.matchAll(/<div class="tgme_widget_message_text js-message_text"[^>]*>([\s\S]*?)<\/div>/g)];
  
  // Find all dates
  const dates = [...html.matchAll(/<time[^>]*datetime="([^"]+)"[^>]*>/g)].map(m => m[1]);
  
  // Find all reaction counts  
  const reactionBlocks = [...html.matchAll(/<div class="tgme_widget_message_footer"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g)];
  
  for (let i = 0; i < textBlocks.length; i++) {
    let text = textBlocks[i][1];
    
    // Clean HTML
    text = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
      .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
      .replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*')
      .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    if (!text || text.length < 50) continue;
    
    const msgId = postIds[i] || i;
    const date = dates[i] || null;
    
    const lines = text.split('\n').filter(l => l.trim());
    const title = lines[0]?.replace(/\*\*/g, '').trim() || `Post ${msgId}`;
    
    messages.push({
      id: msgId,
      title,
      fullText: text,
      date,
      charCount: text.length,
    });
  }
  
  return messages;
}

async function scrapeAll() {
  const allMessages = new Map();
  let beforeId = null;
  let pageCount = 0;
  const MAX_PAGES = 20; // safety limit
  
  while (pageCount < MAX_PAGES) {
    const html = await fetchPage(beforeId);
    
    // Try both parsing methods
    const messages = parseMessages(html);
    
    if (messages.length === 0) {
      console.log('No more messages found, stopping.');
      break;
    }
    
    let newCount = 0;
    for (const msg of messages) {
      if (!allMessages.has(msg.id)) {
        allMessages.set(msg.id, msg);
        newCount++;
      }
    }
    
    console.log(`  Found ${messages.length} messages (${newCount} new). IDs: ${messages.map(m => m.id).join(', ')}`);
    
    if (newCount === 0) {
      console.log('No new messages, stopping.');
      break;
    }
    
    // Get the smallest ID for pagination
    const minId = Math.min(...messages.map(m => m.id));
    if (beforeId !== null && minId >= beforeId) {
      console.log('No progress in pagination, stopping.');
      break;
    }
    beforeId = minId;
    
    pageCount++;
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  
  const sorted = [...allMessages.values()].sort((a, b) => a.id - b.id);
  console.log(`\nTotal: ${sorted.length} messages collected.`);
  
  // Summary
  for (const msg of sorted) {
    console.log(`  #${msg.id}: ${msg.title.substring(0, 50)}... (${msg.charCount}자)`);
  }
  
  writeFileSync(OUTPUT, JSON.stringify(sorted, null, 2), 'utf-8');
  console.log(`\nSaved to: ${OUTPUT}`);
}

scrapeAll().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
