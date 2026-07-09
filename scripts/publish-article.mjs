#!/usr/bin/env node
// publish-article.mjs — Lists drafts, gets confirmation, publishes and pushes
// Usage: node scripts/publish-article.mjs

const fs = await import('fs');
const path = await import('path');
const { execSync } = require ? require('child_process') : (await import('child_process')).execSync;

const POSTS_DIR = path.resolve(new URL('../content/posts', import.meta.url).pathname);

async function main() {
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const drafts = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
    if (content.includes('draft: true') || content.includes('draft = true')) {
      const titleMatch = content.match(/title:\s*'([^']+)'/);
      const descMatch = content.match(/description:\s*'([^']+)'/);
      drafts.push({ file, title: titleMatch?.[1] || file, desc: descMatch?.[1] || '' });
    }
  }

  if (drafts.length === 0) {
    console.log('No drafts to publish.');
    return;
  }

  console.log(`📝 ${drafts.length} draft(s) found:\n`);
  drafts.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.title}`);
    if (d.desc) console.log(`     ${d.desc}`);
  });

  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(r => rl.question('\nPublish all? (y/N) ', r));
  rl.close();

  if (answer.toLowerCase() !== 'y') {
    console.log('Aborted.');
    return;
  }

  // Mark as published
  for (const draft of drafts) {
    const filePath = path.join(POSTS_DIR, draft.file);
    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.replace(/draft:\s*true/, 'draft: false');
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ ${draft.file}: published`);
  }

  // Git commit + push
  console.log('\nPushing to GitHub...');
  execSync('git add -A', { cwd: path.resolve(POSTS_DIR, '..') });
  execSync(`git commit -m "feat(blog): publish ${drafts.length} article(s)"`, { cwd: path.resolve(POSTS_DIR, '..') });
  execSync('git push', { cwd: path.resolve(POSTS_DIR, '..') });
  console.log('🚀 Deploy triggered on Cloudflare Pages!');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
