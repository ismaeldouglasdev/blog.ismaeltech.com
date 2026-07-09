#!/usr/bin/env node
// generate-article.mjs — Uses 9Router to generate SEO article from trending topic
// Usage: node scripts/generate-article.mjs [--topic "topic title"]

const fs = await import('fs');
const path = await import('path');
const { execSync } = await import('child_process');

const NINEROUTER_URL = process.env.NINEROUTER_URL || 'http://localhost:20128';
const NINEROUTER_KEY = process.env.NINEROUTER_KEY || '';
const BLOG_DIR = path.resolve(new URL('..', import.meta.url).pathname);
const POSTS_DIR = path.join(BLOG_DIR, 'content', 'posts');

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function call9Router(prompt, system) {
  const body = {
    model: 'combo-round-robin',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  };

  const headers = { 'Content-Type': 'application/json' };
  if (NINEROUTER_KEY) headers['Authorization'] = `Bearer ${NINEROUTER_KEY}`;

  const res = await fetch(`${NINEROUTER_URL}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`9Router API error (${res.status}): ${err}`);
  }

  let rawText = await res.text();

  // Strip trailing SSE artifacts
  const jsonEnd = rawText.lastIndexOf('}');
  if (jsonEnd > 0) rawText = rawText.slice(0, jsonEnd + 1);

  const data = JSON.parse(rawText);
  return data.choices?.[0]?.message?.content?.trim() || data.choices?.[0]?.message?.reasoning_content?.trim() || '';
}

async function pickTopic() {
  const trendsPath = path.join(BLOG_DIR, 'scripts', 'data', 'trends.json');
  if (!fs.existsSync(trendsPath)) {
    console.error('[generate] No trends.json found. Run discover-topics.mjs first.');
    process.exit(1);
  }
  const trends = JSON.parse(fs.readFileSync(trendsPath, 'utf-8'));
  if (trends.length === 0) throw new Error('No trends available');
  return trends[0];
}

function buildFrontmatter(title, description, tags, slug) {
  const date = new Date().toISOString().split('T')[0];
  const tagsYaml = tags.map(t => `  - "${t}"`).join('\n');
  return `---
title: '${title.replace(/'/g, "''")}'
date: ${date}
draft: true
description: '${description.replace(/'/g, "''")}'
tags:
${tagsYaml}
---
`;
}

async function main() {
  const topicArg = process.argv.find(a => a.startsWith('--topic='));
  let topic;

  if (topicArg) {
    topic = { title: topicArg.replace('--topic=', '') };
  } else {
    topic = await pickTopic();
  }

  console.error(`[generate] Topic: ${topic.title}`);

  // Step 1: Generate outline
  console.error('[generate] Generating outline...');
  const outlinePrompt = `Crie um outline detalhado (H2 headings apenas) para um artigo SEO sobre: "${topic.title}"

O artigo deve ser útil para desenvolvedores, donos de negócio ou profissionais de tecnologia.
Formato:
- Título SEO-friendly (máx 60 chars)
- Meta description (máx 155 chars)
- 3-5 H2 headings com sub-tópicos
- 2-3 tags relevantes

Responda APENAS neste formato:
TITLE: <titulo>
DESCRIPTION: <descricao>
TAGS: tag1, tag2, tag3
OUTLINE:
- H2 heading 1
- H2 heading 2
- ...`;

  const outlineResponse = await call9Router(outlinePrompt, 'Você é um especialista em SEO e conteúdo técnico. Gere outlines precisos e úteis.');
  console.error(`[generate] Outline:\n${outlineResponse}`);

  // Parse outline response
  const titleMatch = outlineResponse.match(/TITLE:\s*(.+)/);
  const descMatch = outlineResponse.match(/DESCRIPTION:\s*(.+)/);
  const tagsMatch = outlineResponse.match(/TAGS:\s*(.+)/);
  const outlineStart = outlineResponse.indexOf('OUTLINE:');

  const title = titleMatch?.[1]?.trim() || topic.title;
  const description = descMatch?.[1]?.trim() || `Artigo sobre ${topic.title}`;
  const tags = tagsMatch?.[1]?.split(',').map(t => t.trim()) || ['tecnologia', 'desenvolvimento'];
  const outline = outlineStart > 0 ? outlineResponse.slice(outlineStart + 8).trim() : '';

  // Step 2: Generate full article
  console.error('[generate] Generating full article...');
  const articlePrompt = `Escreva um artigo completo em português brasileiro sobre:

TÍTULO: ${title}
DESCRIÇÃO: ${description}
OUTLINE:
${outline}

Regras:
- Tom pessoal e direto (como um dev experiente explicando pra outro dev)
- Hook forte no primeiro parágrafo
- Use exemplos práticos e código quando relevante
- Parágrafo final com CTA: "Tem um projeto parecido? [Vamos conversar](https://ismaeltech.com/#contato)"
- Mínimo 800 palavras
- NÃO use linguagem genérica de IA ("no cenário atual", "é importante destacar")
- Seja específico, dê opinião, compartilhe experiência real`;

  const article = await call9Router(articlePrompt, 'Você é um desenvolvedor full stack experiente escrevendo um artigo técnico. Seja autêntico, específico e prático.');

  // Build final .md file
  const slug = slugify(title);
  const frontmatter = buildFrontmatter(title, description, tags, slug);
  const content = `${frontmatter}\n${article}\n`;

  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  fs.writeFileSync(filePath, content);

  console.log(JSON.stringify({ slug, title, description, tags, file: filePath }, null, 2));
  console.error(`[generate] ✅ Article saved: ${filePath}`);
}

main().catch(err => {
  console.error('[generate] Fatal:', err.message);
  process.exit(1);
});
