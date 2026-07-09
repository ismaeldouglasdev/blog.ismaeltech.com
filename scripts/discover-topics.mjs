#!/usr/bin/env node
// discover-topics.mjs — Collects trending dev topics from HN, Dev.to, GitHub
// Usage: node scripts/discover-topics.mjs

import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const DATA_FILE = path.join(__dirname, 'data', 'trends.json');

const sources = [
  { name: 'hackernews', fetch: fetchHN, weight: 1 },
  { name: 'devto',      fetch: fetchDevto, weight: 1 },
  { name: 'github',     fetch: fetchGitHubTrend, weight: 0.8 },
];

async function fetchHN() {
  const ids = await (await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')).json();
  const items = await Promise.all(
    ids.slice(0, 30).map(id =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json()).catch(() => null)
    )
  );
  return items
    .filter(Boolean)
    .filter(i => i.type === 'story' && i.title && !i.title.startsWith('Show HN') && !i.title.startsWith('Ask HN'))
    .map(i => ({
      title: i.title,
      url: i.url || `https://news.ycombinator.com/item?id=${i.id}`,
      score: (i.score || 0) + (i.descendants || 0) * 2,
      source: 'Hacker News',
    }));
}

async function fetchDevto() {
  const res = await fetch('https://dev.to/api/articles?top=1&per_page=30');
  const data = await res.json();
  return data.map(a => ({
    title: a.title,
    url: a.url,
    score: a.positive_reactions_count || 0,
    source: 'Dev.to',
    tags: a.tag_list,
  }));
}

async function fetchGitHubTrend() {
  const res = await fetch('https://api.github.com/search/repositories?q=created:>2026-06-09&sort=stars&order=desc&per_page=20');
  const data = await res.json();
  return (data.items || []).map(r => ({
    title: r.description ? `${r.name}: ${r.description}` : r.name,
    url: r.html_url,
    score: r.stargazers_count || 0,
    source: 'GitHub Trending',
    tags: [r.language].filter(Boolean),
  }));
}

async function main() {
  const all = [];

  for (const source of sources) {
    try {
      console.error(`[discover] Fetching ${source.name}...`);
      const items = await source.fetch();
      items.forEach(i => {
        all.push({ ...i, finalScore: Math.round((i.score || 0) * source.weight) });
      });
      console.error(`[discover] ${source.name}: ${items.length} items`);
    } catch (err) {
      console.error(`[discover] ${source.name} failed:`, err.message);
    }
  }

  all.sort((a, b) => b.finalScore - a.finalScore);
  const top = all.slice(0, 20);

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(top, null, 2));

  console.log(JSON.stringify(top.map(t => ({
    title: t.title,
    source: t.source,
    score: t.finalScore,
  })), null, 2));
}

main().catch(err => {
  console.error('[discover] Fatal:', err.message);
  process.exit(1);
});
