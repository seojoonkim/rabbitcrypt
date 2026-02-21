#!/usr/bin/env node
/**
 * sync-api-server.mjs
 * 
 * 토끼굴 싱크 로컬 API 서버
 * Port: 4747
 * 
 * Endpoints:
 *   GET  /status        — 마지막 싱크 상태 조회
 *   GET  /report        — 마지막 싱크 리포트
 *   POST /sync          — 즉시 싱크 실행
 *   POST /sync/dry-run  — dry-run 싱크 (파일 미수정)
 *   POST /sync/force    — 모든 글 강제 재처리
 *   GET  /health        — 헬스 체크
 * 
 * Usage: node scripts/sync-api-server.mjs
 * PM2:   pm2 start scripts/sync-api-server.mjs --name rabbit-sync-api
 */

import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = 4747;
const SYNC_STATE_PATH = join(ROOT, 'data', 'sync-state.json');
const REPORT_PATH = join(ROOT, 'data', 'last-sync-report.json');
const SYNC_SCRIPT = join(__dirname, 'auto-sync.mjs');

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
let isSyncing = false;
let lastSyncPid = null;

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function loadState() {
  if (!existsSync(SYNC_STATE_PATH)) return { error: 'sync-state.json not found' };
  return JSON.parse(readFileSync(SYNC_STATE_PATH, 'utf8'));
}

function loadReport() {
  if (!existsSync(REPORT_PATH)) return { error: 'No sync report yet' };
  return JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
}

// ─────────────────────────────────────────────
// Sync runner
// ─────────────────────────────────────────────
function runSync(args = []) {
  return new Promise((resolve, reject) => {
    if (isSyncing) {
      reject(new Error('Sync already in progress'));
      return;
    }

    isSyncing = true;
    console.log(`[${new Date().toISOString()}] Starting sync with args: ${args.join(' ')}`);

    const proc = spawn('node', [SYNC_SCRIPT, ...args], {
      cwd: ROOT,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    lastSyncPid = proc.pid;
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
    });

    proc.stderr.on('data', d => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(s);
    });

    proc.on('close', code => {
      isSyncing = false;
      lastSyncPid = null;
      if (code === 0) {
        resolve({ success: true, stdout: stdout.slice(-2000) });
      } else {
        reject(new Error(`Sync exited with code ${code}. stderr: ${stderr.slice(-500)}`));
      }
    });

    proc.on('error', err => {
      isSyncing = false;
      lastSyncPid = null;
      reject(err);
    });
  });
}

// ─────────────────────────────────────────────
// Server
// ─────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  console.log(`[${new Date().toISOString()}] ${method} ${path}`);

  try {
    // GET /health
    if (method === 'GET' && path === '/health') {
      return json(res, 200, {
        status: 'ok',
        isSyncing,
        lastSyncPid,
        timestamp: new Date().toISOString(),
      });
    }

    // GET /status
    if (method === 'GET' && path === '/status') {
      const state = loadState();
      return json(res, 200, {
        ...state,
        isSyncing,
        processedCount: state.processedMsgIds?.length ?? 0,
        skippedCount: state.skippedMsgIds?.length ?? 0,
      });
    }

    // GET /report
    if (method === 'GET' && path === '/report') {
      return json(res, 200, loadReport());
    }

    // POST /sync
    if (method === 'POST' && path === '/sync') {
      if (isSyncing) {
        return json(res, 429, { error: 'Sync already in progress' });
      }
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'started', message: 'Sync started in background' }));
      
      runSync().catch(err => {
        console.error('Sync error:', err.message);
      });
      return;
    }

    // POST /sync/dry-run
    if (method === 'POST' && path === '/sync/dry-run') {
      if (isSyncing) {
        return json(res, 429, { error: 'Sync already in progress' });
      }
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'started', message: 'Dry-run sync started' }));
      
      runSync(['--dry-run']).catch(err => {
        console.error('Dry-run error:', err.message);
      });
      return;
    }

    // POST /sync/force
    if (method === 'POST' && path === '/sync/force') {
      if (isSyncing) {
        return json(res, 429, { error: 'Sync already in progress' });
      }
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'started', message: 'Force-all sync started' }));
      
      runSync(['--force-all']).catch(err => {
        console.error('Force sync error:', err.message);
      });
      return;
    }

    // 404
    json(res, 404, { error: 'Not found', paths: ['/health', '/status', '/report', '/sync', '/sync/dry-run', '/sync/force'] });

  } catch (err) {
    console.error('Server error:', err);
    json(res, 500, { error: err.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🐇 Rabbit Crypt Sync API running at http://localhost:${PORT}`);
  console.log(`   GET  /health        — health check`);
  console.log(`   GET  /status        — sync state`);
  console.log(`   GET  /report        — last sync report`);
  console.log(`   POST /sync          — trigger sync now`);
  console.log(`   POST /sync/dry-run  — dry-run (no writes)`);
  console.log(`   POST /sync/force    — force-all reprocess`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close();
  process.exit(0);
});
