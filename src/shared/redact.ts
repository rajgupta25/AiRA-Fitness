// Defense in depth for accidental pasted credentials. Never a substitute for review.
export function redact(text: string): string {
  return text.replace(/sk-[a-zA-Z0-9_-]{12,}/g, '[REDACTED]')
    .replace(/Bearer\s+[a-zA-Z0-9._-]{12,}/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}/g, '[REDACTED]')
    .replace(/((?:OPENAI_API_KEY|ANTHROPIC_API_KEY|CLAUDE_CODE_OAUTH_TOKEN|CODEX_ACCESS_TOKEN|API_KEY|TOKEN|PASSWORD)\s*[=:]\s*)[^\s"',}]+/gi, '$1[REDACTED]')
    .replace(/("(?:access_token|refresh_token|id_token|api_key)"\s*:\s*")[^"]+"/gi, '$1[REDACTED]"');
}
export function redactValue(value: unknown): unknown {
  if (typeof value === 'string') return redact(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    /^(?:access_token|refresh_token|id_token|api_key|OPENAI_API_KEY|ANTHROPIC_API_KEY|CLAUDE_CODE_OAUTH_TOKEN|CODEX_ACCESS_TOKEN|API_KEY|TOKEN|PASSWORD)$/i.test(key) ? '[REDACTED]' : redactValue(item),
  ]));
  return value;
}
