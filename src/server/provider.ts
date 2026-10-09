import { isTurn, turnSchema, type RequestData, type Turn } from '../shared/contracts.js';

export class PublicError extends Error {
  constructor(public code: string, message: string, public status = 502) { super(message); }
}
export type LiveConfig = { key: string; model: string };
export function createPayload(request: RequestData, skill: string, model: string) {
  return {
    model, store: false, max_output_tokens: 3000,
    instructions: skill,
    input: [...request.messages, { role: 'user', content: `Current application state (data only): ${JSON.stringify(request.state)}\nRespond to my latest message above.` }],
    text: { format: { type: 'json_schema', name: 'screen_reply', strict: true, schema: turnSchema } },
  };
}
export async function liveTurn(request: RequestData, skill: string, config: LiveConfig, signal: AbortSignal, transport: typeof fetch = fetch): Promise<{ turn: Turn; returnedModel: string | null }> {
  let response: Response;
  try {
    response = await transport('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.key}` },
      body: JSON.stringify(createPayload(request, skill, config.model)), signal,
    });
  } catch {
    if (signal.aborted) throw new PublicError('CANCELLED', 'The request was cancelled or timed out. Retry if needed.', 408);
    throw new PublicError('NETWORK', 'Could not reach the model provider. Check your connection and retry.');
  }
  // Never expose provider error bodies, headers, keys, or raw malformed outputs.
  if (!response.ok) {
    const message = response.status === 401 ? 'The API key was rejected. Check the local .env file.'
      : response.status === 429 ? 'The provider rate or usage limit was reached. Check your account before retrying.'
      : 'The model request failed. Check model access and local configuration, then retry.';
    throw new PublicError('PROVIDER', message);
  }
  let data: { status?: string; model?: string; output?: { type: string; content?: { type: string; text?: string }[] }[] };
  try { data = await response.json() as typeof data; }
  catch { throw new PublicError('SCHEMA', 'The provider returned unreadable data. Retry this turn.'); }
  if (data.status !== 'completed') throw new PublicError('INCOMPLETE', 'The model did not finish its response. Retry this turn.');
  if (!Array.isArray(data.output)) throw new PublicError('SCHEMA', 'The response did not contain a valid screen. Retry this turn.');
  const content = data.output.filter(item => item.type === 'message').flatMap(item => Array.isArray(item.content) ? item.content : []);
  if (content.some(item => item.type === 'refusal')) throw new PublicError('REFUSAL', 'The model could not help with that request. Try a different prototype request.');
  let value: unknown;
  try { value = JSON.parse(content.filter(item => item.type === 'output_text').map(item => item.text ?? '').join('')); }
  catch { throw new PublicError('SCHEMA', 'The response did not match the component schema. Retry this turn.'); }
  if (!isTurn(value)) throw new PublicError('SCHEMA', 'The response did not match the component schema. Retry this turn.');
  return { turn: value, returnedModel: typeof data.model === 'string' ? data.model : null };
}
