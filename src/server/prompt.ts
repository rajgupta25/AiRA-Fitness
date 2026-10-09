import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { OPENUI_LIBRARY } from '../shared/openui/openui-library.js';
// AiRA-derived frontmatter loading for one local skill.
export function parseFrontmatter(raw: string) {
  let name='',description=''; const stripped=raw.trimStart();
  if(!stripped.startsWith('---'))return {name,description,body:raw};
  const rest=stripped.slice(3), fence=rest.indexOf('\n---');
  if(fence===-1)return {name,description,body:raw};
  for(const line of rest.slice(0,fence).split('\n')){const at=line.indexOf(':');if(at<0)continue;const key=line.slice(0,at).trim().toLowerCase();const value=line.slice(at+1).trim();if(key==='name')name=value;if(key==='description')description=value;}
  return {name,description,body:rest.slice(fence+4).replace(/^\n+/,'')};
}
export async function loadPrompt(root: string) {
  const [system,context,skill]=await Promise.all(['prompts/system.md','prompts/context.md','skills/workout.md'].map(path=>readFile(join(root,path),'utf8')));
  if(skill.length>20000 || system.length>20000 || context.length>10000)throw new Error('Prompt too large.');
  const catalog=Object.entries(OPENUI_LIBRARY).map(([name,spec])=>`${name}(${spec.args.map((arg,i)=>arg+(i>=spec.required?'?':'')).join(', ')})`).join('\n');
  const body=parseFrontmatter(skill).body;
  const protocol=system.replace('{{catalog}}',catalog)+'\n\n'+context;
  const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
  return {instructions:protocol+`\n\n## Skills preloaded for this turn\n<skill name='workout'>\n${body}\n</skill>`,skillHash:hash(skill),protocolHash:hash(protocol)};
}
