// Adapted from selected AiRA code; see docs/HARNESS.md.
export function serializeStatement(name: string, component: string, args: unknown[]): string {
  if (!/^[A-Za-z_]\w*$/.test(name) || !/^[A-Za-z_]\w*$/.test(component)) throw new Error('Invalid statement name.');
  return `${name} = ${component}(${args.map(value => JSON.stringify(value)).join(', ')})`;
}
