const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const EMBEDDING_MODELS = ['gemini-embedding-001', 'text-embedding-004'];

const DEFAULT_FALLBACK = 'Dạ, hiện tại em chưa có thông tin chi tiết về phần này trong hồ sơ. Anh/Chị có muốn biết thêm về các dự án Computer Vision của em không?';

function setCorsHeaders(res, origin) {
  if (ALLOWED_ORIGIN) {
    if (origin === ALLOWED_ORIGIN) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else if (origin && (origin.includes('github.io') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function reject(res, code, message) {
  return res.status(code).json({ error: message });
}

async function runEmbedding(text) {
  let lastError = null;

  for (const model of EMBEDDING_MODELS) {
    const response = await fetch(`${GEMINI_BASE}/${model}:embedContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] }
      })
    });

    if (response.ok) {
      const payload = await response.json();
      return payload?.embedding?.values || [];
    }

    const detail = await response.text();
    lastError = `Embedding failed on ${model}: ${response.status} - ${detail}`;
    if (response.status !== 404) {
      throw new Error(lastError);
    }
  }

  throw new Error(lastError || 'Embedding failed on all candidate models.');
}

async function runChat(message, context, systemInstruction) {
  const fullPrompt = `Context:\n${context}\n\nRecruiter question:\n${message}`;
  const response = await fetch(`${GEMINI_BASE}/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: fullPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 500
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Chat failed: ${response.status} - ${detail}`);
  }

  const payload = await response.json();
  return payload?.candidates?.[0]?.content?.parts?.[0]?.text || DEFAULT_FALLBACK;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return reject(res, 405, 'Method not allowed');
  }

  if (!GEMINI_API_KEY) {
    return reject(res, 500, 'Missing GEMINI_API_KEY');
  }

  try {
    const { mode = 'chat', text = '', message = '', context = '', systemInstruction = '' } = req.body || {};

    if (mode === 'embed') {
      if (!text || typeof text !== 'string') return reject(res, 400, 'text is required for embed mode');
      const embedding = await runEmbedding(text);
      return res.status(200).json({ embedding });
    }

    if (!message || typeof message !== 'string') {
      return reject(res, 400, 'message is required for chat mode');
    }

    const answer = await runChat(message, context || '', systemInstruction || '');
    return res.status(200).json({ text: answer });
  } catch (error) {
    return reject(res, 500, error.message || 'Unknown error');
  }
}
