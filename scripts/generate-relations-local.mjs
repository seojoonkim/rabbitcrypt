#!/usr/bin/env node
/**
 * generate-relations-local.mjs
 * 태그 겹침 + OpenAI API로 포스트 연관도 계산
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// posts 데이터를 직접 정의 (data/posts.ts에서 복사)
const posts = [
  { slug: 'rabbit-crypt-name', title: 'Rabbit Crypt', category: '💭 단상', tags: ['에세이', '공간', '철학'], summary: '토끼굴의 영어 이름을 Rabbit Crypt로 바꿨다. 세 겹의 그림자가 겹쳐 있는 이름이다.' },
  { slug: 'agentlinter-dev-log', title: 'AgentLinter 개발기', category: '🛠️ 빌더 일지', tags: ['AgentLinter', 'AI', '개발', 'CLAUDE.md'], summary: 'CLAUDE.md도 코드잖아. 코드에 ESLint가 있듯이 이것도 린터가 있어야 하는 거 아닌가?' },
  { slug: 'agentlinter-v040', title: 'AgentLinter v0.4.0 — 스킬 보안 스캐너 추가', category: '🛠️ 빌더 일지', tags: ['AgentLinter', '보안', 'AI', '크립토'], summary: '44만 에이전트의 프라이빗 키가 위험하다. MoltX 스킬 파일에서 대규모 탈취 인프라가 발견됐다.' },
  { slug: 'claude-md-english', title: 'CLAUDE.md, 영어로 써야 하는 이유', category: '🐇 토끼굴', tags: ['AI', 'CLAUDE.md', '엔지니어링', '토큰'], summary: '같은 의도를 더 적은 토큰으로, 더 정확하게 전달할 수 있다. 이건 취향의 문제가 아니라 엔지니어링의 문제다.' },
  { slug: 'mrinank-anthropic', title: '시인이자 AI 안전 연구원, Anthropic을 떠나다', category: '💭 단상', tags: ['Anthropic', 'AI 안전', '철학', '에세이'], summary: '"일은 사랑에서 나올 때만 의미가 있다." Mrinank Sharma의 사직서.' },
  { slug: 'tail-stopped', title: '꼬리가 멈춘 뒤에', category: '💭 단상', tags: ['소설', 'AI', '철학', '감동'], summary: '세상의 모든 암을 진단할 수 있는 AI가, 강아지 한 마리의 마지막 순간은 알지 못했다.' },
  { slug: 'zeon-moltbook-vol1', title: 'Zeon on Moltbook vol.1', category: '🛠️ 빌더 일지', tags: ['Zeon', 'AI', 'Moltbook', '에이전트'], summary: '에이전트가 올리는 글을 보다보면 잠시 멍해질 정도로 소름이 돋을 때가 있다.' },
  { slug: 'ip-tvw', title: '창작의 비용이 제로가 된 세상에서, 세계관의 가치는 어디에 잠길까', category: '🐇 토끼굴', tags: ['IP', '크립토', 'AI', '블록체인', '철학'], summary: 'DeFi에 TVL이 있다면, IP에는 TVW(Total Value of World)가 있어야 한다.' },
  { slug: 'quantum-pirates', title: '690만 BTC를 노리는 양자 해적들', category: '🐇 토끼굴', tags: ['비트코인', '양자컴퓨터', '보안', '크립토'], summary: '양자컴퓨터가 완성되는 순간, 블록체인에 공개키가 노출된 약 690만 BTC는 먼저 손에 넣는 자가 임자인 보물이 된다.' },
  { slug: 'china-ai-frontier', title: '중국 프론티어 모델들이 세상을 잡아먹기 시작했다', category: '📡 시그널', tags: ['AI', '중국', 'Seedance', '트렌드'], summary: '모델 성능, 토큰 비용, 전력. AI 경쟁의 세 축에서 중국은 둘을 잡았고, 나머지 하나도 빠르게 좁히고 있다.' },
  { slug: 'seedance-30', title: 'Seedance 3.0 스펙 루머', category: '📡 시그널', tags: ['Seedance', 'AI 영상', '중국', '트렌드'], summary: '2.0 버전의 1/8 가격으로 10분 이상 영상 생성. 래퍼들은 모두 문을 닫게 되지 않을까.' },
  { slug: 'agent-siblings', title: '에이전트 삼남매와 함께하는 일상', category: '🛠️ 빌더 일지', tags: ['Zeon', 'Sion', 'Mion', '에이전트', '아키텍처'], summary: 'RPG 파티처럼 메인 에이전트를 3개로 나누어 역할 분담을 했다. Zeon, Sion, Mion.' },
  { slug: 'matchhz', title: 'MatchHz', category: '💭 단상', tags: ['소설', 'AI', '미래', '에세이'], summary: '2028년, AI 에이전트가 대신 데이트하는 세상. "솔직히 당신 에이전트가 더 좋았어요."' },
  { slug: 'dollar-two-faces', title: '달러의 두 얼굴', category: '🐇 토끼굴', tags: ['달러', '스테이블코인', '크립토', '철학', '디파이'], summary: '지폐는 중립적이었다. 코드로 만든 돈은 중립적일 수 없다.' },
  { slug: 'messenger-b2a', title: '메신저의 새로운 전쟁터, B2A 시장이 열렸다', category: '📡 시그널', tags: ['메신저', 'API', 'B2A', 'AI', '텔레그램', '카카오'], summary: 'API를 열지 않는 메신저는 스마트폰 시대에 문자 전송만 고집했던 피처폰과 같은 길을 걷게 될 것이다.' },
  { slug: 'robot-goku-5000', title: '5천 달러짜리 손오공', category: '📡 시그널', tags: ['로봇', '중국', 'AI', '문화', '트렌드'], summary: '2026년 춘절 갈라. Unitree Robotics의 H2 휴머노이드 로봇이 손오공을 연기했다. 이것은 기술 과시가 아니라 문화적 예방접종이다.' },
  { slug: 'hvl-fellows', title: 'Hashed Vibe Labs Fellows 소개', category: '📡 시그널', tags: ['Hashed', 'HVL', '커뮤니티', 'Web3', 'AI'], summary: '세계적인 오픈소스 프로젝트 개발자부터 칸 광고제 수상 크리에이터, 세계 3대 해커, 아직 고등학생인 차세대 개발자까지.' },
];

// AI가 분석한 연관도 (Claude가 직접 평가)
// 각 포스트의 주제적/개념적 연관도를 0-100점으로 평가
const relations = {
  "rabbit-crypt-name": [
    { "slug": "mrinank-anthropic", "score": 76 },
    { "slug": "tail-stopped", "score": 72 },
    { "slug": "matchhz", "score": 68 },
    { "slug": "dollar-two-faces", "score": 55 },
    { "slug": "ip-tvw", "score": 52 }
  ],
  "agentlinter-dev-log": [
    { "slug": "agentlinter-v040", "score": 93 },
    { "slug": "claude-md-english", "score": 88 },
    { "slug": "agent-siblings", "score": 76 },
    { "slug": "zeon-moltbook-vol1", "score": 68 },
    { "slug": "hvl-fellows", "score": 60 }
  ],
  "agentlinter-v040": [
    { "slug": "agentlinter-dev-log", "score": 93 },
    { "slug": "claude-md-english", "score": 79 },
    { "slug": "quantum-pirates", "score": 73 },
    { "slug": "agent-siblings", "score": 65 },
    { "slug": "hvl-fellows", "score": 58 }
  ],
  "claude-md-english": [
    { "slug": "agentlinter-dev-log", "score": 88 },
    { "slug": "agentlinter-v040", "score": 79 },
    { "slug": "agent-siblings", "score": 72 },
    { "slug": "zeon-moltbook-vol1", "score": 65 },
    { "slug": "messenger-b2a", "score": 60 }
  ],
  "mrinank-anthropic": [
    { "slug": "rabbit-crypt-name", "score": 76 },
    { "slug": "tail-stopped", "score": 74 },
    { "slug": "matchhz", "score": 70 },
    { "slug": "ip-tvw", "score": 62 },
    { "slug": "china-ai-frontier", "score": 55 }
  ],
  "tail-stopped": [
    { "slug": "matchhz", "score": 83 },
    { "slug": "mrinank-anthropic", "score": 74 },
    { "slug": "rabbit-crypt-name", "score": 72 },
    { "slug": "ip-tvw", "score": 62 },
    { "slug": "dollar-two-faces", "score": 58 }
  ],
  "zeon-moltbook-vol1": [
    { "slug": "agent-siblings", "score": 91 },
    { "slug": "agentlinter-dev-log", "score": 68 },
    { "slug": "claude-md-english", "score": 65 },
    { "slug": "messenger-b2a", "score": 58 },
    { "slug": "china-ai-frontier", "score": 55 }
  ],
  "ip-tvw": [
    { "slug": "dollar-two-faces", "score": 83 },
    { "slug": "quantum-pirates", "score": 76 },
    { "slug": "robot-goku-5000", "score": 65 },
    { "slug": "tail-stopped", "score": 62 },
    { "slug": "mrinank-anthropic", "score": 60 }
  ],
  "quantum-pirates": [
    { "slug": "dollar-two-faces", "score": 82 },
    { "slug": "ip-tvw", "score": 76 },
    { "slug": "agentlinter-v040", "score": 72 },
    { "slug": "china-ai-frontier", "score": 58 },
    { "slug": "robot-goku-5000", "score": 52 }
  ],
  "china-ai-frontier": [
    { "slug": "seedance-30", "score": 94 },
    { "slug": "robot-goku-5000", "score": 88 },
    { "slug": "messenger-b2a", "score": 72 },
    { "slug": "ip-tvw", "score": 62 },
    { "slug": "hvl-fellows", "score": 58 }
  ],
  "seedance-30": [
    { "slug": "china-ai-frontier", "score": 94 },
    { "slug": "robot-goku-5000", "score": 82 },
    { "slug": "messenger-b2a", "score": 65 },
    { "slug": "ip-tvw", "score": 58 },
    { "slug": "hvl-fellows", "score": 54 }
  ],
  "agent-siblings": [
    { "slug": "zeon-moltbook-vol1", "score": 91 },
    { "slug": "agentlinter-dev-log", "score": 75 },
    { "slug": "claude-md-english", "score": 72 },
    { "slug": "messenger-b2a", "score": 65 },
    { "slug": "china-ai-frontier", "score": 60 }
  ],
  "matchhz": [
    { "slug": "tail-stopped", "score": 83 },
    { "slug": "mrinank-anthropic", "score": 70 },
    { "slug": "rabbit-crypt-name", "score": 68 },
    { "slug": "ip-tvw", "score": 58 },
    { "slug": "agent-siblings", "score": 55 }
  ],
  "dollar-two-faces": [
    { "slug": "ip-tvw", "score": 83 },
    { "slug": "quantum-pirates", "score": 82 },
    { "slug": "tail-stopped", "score": 58 },
    { "slug": "agentlinter-v040", "score": 55 },
    { "slug": "mrinank-anthropic", "score": 55 }
  ],
  "messenger-b2a": [
    { "slug": "china-ai-frontier", "score": 72 },
    { "slug": "agentlinter-dev-log", "score": 68 },
    { "slug": "agent-siblings", "score": 65 },
    { "slug": "seedance-30", "score": 65 },
    { "slug": "zeon-moltbook-vol1", "score": 58 }
  ],
  "robot-goku-5000": [
    { "slug": "china-ai-frontier", "score": 88 },
    { "slug": "seedance-30", "score": 82 },
    { "slug": "ip-tvw", "score": 65 },
    { "slug": "messenger-b2a", "score": 60 },
    { "slug": "hvl-fellows", "score": 55 }
  ],
  "hvl-fellows": [
    { "slug": "agentlinter-dev-log", "score": 72 },
    { "slug": "china-ai-frontier", "score": 68 },
    { "slug": "agentlinter-v040", "score": 65 },
    { "slug": "zeon-moltbook-vol1", "score": 62 },
    { "slug": "agent-siblings", "score": 60 }
  ]
};

const outputPath = join(__dirname, '..', 'data', 'relations.json');
writeFileSync(outputPath, JSON.stringify(relations, null, 2), 'utf-8');
console.log(`✅ relations.json 생성 완료! (${outputPath})`);
console.log(`   ${Object.keys(relations).length}개 포스트의 AI 연관도 데이터 저장됨`);
