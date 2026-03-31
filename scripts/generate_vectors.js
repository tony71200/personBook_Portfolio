#!/usr/bin/env node

/**
 * Usage:
 *   GEMINI_API_KEY=xxx node scripts/generate_vectors.js
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const MODEL = 'text-embedding-004';
const INPUT_FILE = path.join(process.cwd(), 'data', 'raw_data.json');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'database.json');
const OUTPUT_LOCAL_FILE = path.join(process.cwd(), 'data', 'database.local.js');

async function embed(text, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: { parts: [{ text }] } })
  });

  if (!response.ok) {
    throw new Error(`Embedding failed (${response.status}): ${await response.text()}`);
  }

  const payload = await response.json();
  return payload?.embedding?.values || [];
}

(async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable.');
  }

  const raw = JSON.parse(await fs.readFile(INPUT_FILE, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error('raw_data.json must be an array.');
  }

  const output = [];
  for (const item of raw) {
    const vector = await embed(item.content || '', apiKey);
    output.push({ ...item, vector });
    process.stdout.write(`Embedded: ${item.id}\n`);
  }

  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_LOCAL_FILE, `window.__CHATBOT_DATABASE__ = ${JSON.stringify(output)};\n`, 'utf8');
  process.stdout.write(`Saved ${output.length} chunks to ${OUTPUT_FILE} and ${OUTPUT_LOCAL_FILE}\n`);
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
