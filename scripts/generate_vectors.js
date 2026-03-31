#!/usr/bin/env node

/**
 * Usage:
 *   GEMINI_API_KEY=xxx node scripts/generate_vectors.js
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const EMBEDDING_MODELS = ['gemini-embedding-001', 'text-embedding-004'];
const INPUT_FILE = path.join(process.cwd(), 'data', 'raw_data.json');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'database.json');
const OUTPUT_LOCAL_FILE = path.join(process.cwd(), 'data', 'database.local.js');

async function embed(text, apiKey) {
  let lastError = null;

  for (const model of EMBEDDING_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] } })
    });

    if (response.ok) {
      const payload = await response.json();
      return { vector: payload?.embedding?.values || [], model };
    }

    const detail = await response.text();
    lastError = `Model ${model} failed (${response.status}): ${detail}`;

    if (response.status !== 404) {
      throw new Error(lastError);
    }
  }

  throw new Error(lastError || 'Embedding failed on all candidate models.');
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
    const { vector, model } = await embed(item.content || '', apiKey);
    output.push({ ...item, vector });
    process.stdout.write(`Embedded: ${item.id} (${model})\n`);
  }

  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_LOCAL_FILE, `window.__CHATBOT_DATABASE__ = ${JSON.stringify(output)};\n`, 'utf8');
  process.stdout.write(`Saved ${output.length} chunks to ${OUTPUT_FILE} and ${OUTPUT_LOCAL_FILE}\n`);
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
