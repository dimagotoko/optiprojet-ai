import type { Genkit } from 'genkit';

let _ai: Genkit | null = null;

// Lazy getter — genkit and googleAI are loaded via require() only on first call,
// not at module load time, which prevents Turbopack from initializing them during
// static analysis of server chunks.
export function getAi(): Genkit {
  if (_ai) return _ai;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { genkit } = require('genkit') as typeof import('genkit');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { googleAI } = require('@genkit-ai/google-genai') as typeof import('@genkit-ai/google-genai');
  _ai = genkit({
    plugins: [googleAI()],
    model: 'googleai/gemini-2.5-flash',
  });
  return _ai;
}
