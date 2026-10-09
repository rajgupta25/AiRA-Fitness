// Adapted from selected AiRA code; see docs/HARNESS.md.
import { OPENUI_LIBRARY } from "./openui-library.js";
import type { Vocabulary, StatementNode, ParsedDocument } from "./openui-model.js";

/**
 * The line-oriented language AiRA composes documents in: one statement per line,
 * `id = Component(arg, ...)`, no nesting to balance.
 *
 * WHY A LANGUAGE AND NOT JSON — not token count, the failure mode. A JSON tree
 * arriving mid-stream is an invalid document: every open brace is a promise the
 * model has not kept yet, so nothing renders until the last one closes. Here the
 * unit is a LINE. A line either parses or it does not, and the lines before it
 * have already rendered.
 *
 * So the parser is deliberately permissive: an unparseable line is dropped, an
 * unknown component yields no node, a dangling reference yields no node. **A
 * malformed line must never blank something that is already on screen.**
 */

// ─── Values ─────────────────────────────────────────────────────────────────

type Value =
  | { k: "str"; v: string }
  | { k: "num"; v: number }
  | { k: "bool"; v: boolean }
  | { k: "null" }
  | { k: "arr"; v: Value[] }
  | { k: "obj"; v: Record<string, Value> }
  | { k: "ref"; v: string }
  | { k: "call"; name: string; args: Value[] };

// ─── Lexer ──────────────────────────────────────────────────────────────────

type Punct = "(" | ")" | "[" | "]" | "{" | "}" | "," | ":" | "=";

type Token =
  | { t: "ident"; v: string }
  | { t: "str"; v: string }
  | { t: "num"; v: number }
  | { t: "punct"; v: Punct };

const PUNCT = new Set<string>(["(", ")", "[", "]", "{", "}", ",", ":", "="]);

/** Thrown to abandon a line. Never escapes `parseLine`. `why` is read only by
 *  the dev drop report. */
class Bail extends Error {
  constructor(readonly why: string) {
    super(why);
  }
}

const bail = (why = "unexpected token"): never => {
  throw new Bail(why);
};

function lex(line: string): Token[] {
  const out: Token[] = [];
  let i = 0;

  while (i < line.length) {
    const c = line[i]!;

    if (c === " " || c === "\t" || c === "\r") {
      i += 1;
      continue;
    }

    if (PUNCT.has(c)) {
      out.push({ t: "punct", v: c as Punct });
      i += 1;
      continue;
    }

    if (c === '"' || c === "'") {
      const quote = c;
      let s = "";
      let closed = false;
      i += 1;
      while (i < line.length) {
        const ch = line[i]!;
        // An SVG document's attributes arrive as escaped `\"` — decode the
        // escape rather than letting the quote close the string early.
        if (ch === "\\" && i + 1 < line.length) {
          const esc = line[i + 1]!;
          s += esc === "n" ? "\n" : esc === "t" ? "\t" : esc;
          i += 2;
          continue;
        }
        if (ch === quote) {
          closed = true;
          i += 1;
          break;
        }
        s += ch;
        i += 1;
      }
      // An unterminated string is the signature of a half-arrived line — or of a
      // payload that carried a raw newline and split across two.
      if (!closed) bail("unterminated string");
      out.push({ t: "str", v: s });
      continue;
    }

    if (c === "-" || (c >= "0" && c <= "9")) {
      let j = i + 1;
      while (j < line.length && /[0-9._eE+-]/.test(line[j]!)) j += 1;
      const n = Number(line.slice(i, j));
      if (!Number.isFinite(n)) bail("bad number");
      out.push({ t: "num", v: n });
      i = j;
      continue;
    }

    // ⚠️ THE DOT BELONGS IN A NAME. `materialize` mints an inline argument's
    // key as `${parent}.${arg}` — a picture written straight into a Hero is
    // `h1.image` — and the resolver sends and matches that name on the wire.
    // Without the dot here the lexer bailed on the very lines this file mints,
    // so an inline picture's url could never be matched back to it and the
    // frame waited for ever. A float is lexed by the branch above, so numbers
    // are unaffected.
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_$.]/.test(line[j]!)) j += 1;
      out.push({ t: "ident", v: line.slice(i, j) });
      i = j;
      continue;
    }

    bail(`stray character ${JSON.stringify(c)}`);
  }

  return out;
}

// ─── Parser (one statement) ─────────────────────────────────────────────────

class Cursor {
  private i = 0;

  constructor(private readonly toks: readonly Token[]) {}

  next(): Token {
    const t = this.toks[this.i];
    if (!t) bail("ends mid-statement");
    this.i += 1;
    return t!;
  }

  atPunct(v: Punct): boolean {
    const t = this.toks[this.i];
    return !!t && t.t === "punct" && t.v === v;
  }

  eatPunct(v: Punct): void {
    const t = this.next();
    if (t.t !== "punct" || t.v !== v) bail(`expected "${v}"`);
  }

  done(): boolean {
    return this.i >= this.toks.length;
  }
}

/** Comma-separated values up to `close`, which is consumed. */
function parseList(c: Cursor, close: Punct): Value[] {
  const items: Value[] = [];
  if (!c.atPunct(close)) {
    for (;;) {
      items.push(parseValue(c));
      if (!c.atPunct(",")) break;
      c.eatPunct(",");
      // A trailing comma before the close.
      if (c.atPunct(close)) break;
    }
  }
  c.eatPunct(close);
  return items;
}

function parseValue(c: Cursor): Value {
  const t = c.next();

  if (t.t === "str") return { k: "str", v: t.v };
  if (t.t === "num") return { k: "num", v: t.v };

  if (t.t === "punct" && t.v === "[") {
    return { k: "arr", v: parseList(c, "]") };
  }

  if (t.t === "punct" && t.v === "{") {
    const obj: Record<string, Value> = {};
    if (!c.atPunct("}")) {
      for (;;) {
        const key = c.next();
        if (key.t !== "ident" && key.t !== "str") bail("bad object key");
        c.eatPunct(":");
        obj[key.v as string] = parseValue(c);
        if (!c.atPunct(",")) break;
        c.eatPunct(",");
        if (c.atPunct("}")) break;
      }
    }
    c.eatPunct("}");
    return { k: "obj", v: obj };
  }

  if (t.t === "ident") {
    if (t.v === "true") return { k: "bool", v: true };
    if (t.v === "false") return { k: "bool", v: false };
    if (t.v === "null") return { k: "null" };
    if (c.atPunct("(")) {
      c.eatPunct("(");
      return { k: "call", name: t.v, args: parseList(c, ")") };
    }
    return { k: "ref", v: t.v };
  }

  return bail();
}

interface Stmt {
  id: string;
  value: Value;
}

/** One line, or the reason it is not a statement. Only `whyDropped` reads the
 *  reason; `parseLine` keeps the null it always returned. */
function parseLineOrWhy(line: string): Stmt | string {
  try {
    const toks = lex(line);
    if (toks.length === 0) return "empty";
    const c = new Cursor(toks);
    const id = c.next();
    if (id.t !== "ident") return "no statement head";
    c.eatPunct("=");
    const value = parseValue(c);
    // Anything left over means we mis-read the line — drop it rather than render
    // half of it.
    if (!c.done()) return "tokens after the statement";
    // A bare ref on the TAIL is held back by `bindsBareRef`'s callers rather
    // than refused here — see its header.
    return { id: id.v, value };
  } catch (error) {
    return error instanceof Bail ? error.why : "threw";
  }
}

function parseLine(line: string): Stmt | null {
  const out = parseLineOrWhy(line);
  return typeof out === "string" ? null : out;
}

// The whole document is re-parsed on every delta, so statements are cached by
// their exact source line: a growing document then costs only the line that
// changed, which is the tail.
const LINE_CACHE = new Map<string, Stmt | null>();
const LINE_CACHE_MAX = 600;

function parseLineCached(line: string): Stmt | null {
  const hit = LINE_CACHE.get(line);
  if (hit !== undefined) {
    // ⚠️ LRU REFRESH, AND EVICT ONE — NEVER `clear()`.
    //
    // Map iteration order is insertion order, so delete+set keeps the live
    // document's lines at the young end. A wholesale clear voids every cached
    // pointer for one frame, and the renderer's identity fast-path is built on
    // those pointers: it would deep-compare the whole page once every 600
    // distinct lines, which is exactly when the page is at its longest.
    LINE_CACHE.delete(line);
    LINE_CACHE.set(line, hit);
    return hit;
  }
  const stmt = parseLine(line);
  if (LINE_CACHE.size >= LINE_CACHE_MAX) {
    const oldest = LINE_CACHE.keys().next().value;
    if (oldest !== undefined) LINE_CACHE.delete(oldest);
  }
  LINE_CACHE.set(line, stmt);
  return stmt;
}

/**
 * ⚠️ A BARE-REF TAIL MAY NOT OVERWRITE.
 *
 * A half-arrived line usually fails to parse and is simply not there yet — but
 * `root = Screens`, one span before its `(` arrives, parses as a complete
 * statement binding a bare ref. Last-write-wins let it CLOBBER the standing
 * root: root materialized to null, the whole page unmounted for two spans and
 * remounted with every entrance replaying — a visible collapse right before
 * every gesture, because a gesture is exactly when root is being rewritten.
 *
 * Only the bare ref is held back, and only when it would REPLACE a complete
 * binding. A call or literal on the tail cannot be a textual prefix of a longer
 * line (the closing paren or bracket differs from the comma that would continue
 * it), so a settled program's final line — no trailing newline, by the restore
 * contract — still lands as the edit it is. A tail that binds a NEW name still
 * renders early either way.
 *
 * ⚠️ READ BY ALL THREE LINE WALKERS. `parseDocument`, `linesById` and
 * `reachableStatements` must agree on what rendered, or a reader deciding the
 * page's shape from the lines flips it for one span and remounts the page.
 */
function tailIndex(code: string, lines: readonly string[]): number {
  // The segment after the final newline is the line STILL ARRIVING.
  return code.endsWith("\n") ? -1 : lines.length - 1;
}

/** Whether a line is a complete statement binding a bare reference — the shape
 *  the tail rule holds back. */
export function bindsBareRef(line: string): boolean {
  return parseLineCached(line.trim())?.value.k === "ref";
}

/**
 * A statement's line, by id, last definition wins — exactly as the renderer
 * resolves it, bare-ref tail rule included.
 */
export function linesById(code: string): Map<string, string> {
  const out = new Map<string, string>();
  const lines = code.split("\n");
  const tailAt = tailIndex(code, lines);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!.trim();
    if (line.length === 0) continue;
    const stmt = parseLineCached(line);
    if (!stmt) continue;
    if (i === tailAt && stmt.value.k === "ref" && out.has(stmt.id)) continue;
    out.set(stmt.id, line);
  }
  return out;
}

/**
 * ── HOW MANY TIMES A STATEMENT HAS BEEN WRITTEN ─────────────────────────────
 *
 * Every emission of a name is APPENDED to the program — `linesById` resolves
 * last-write-wins over the physical lines, it never compacts them — so counting
 * the lines that bind `id` counts ARRIVALS, and two byte-identical emissions
 * still count two.
 *
 * ⚠️ THAT IS THE WHOLE POINT, and no other signal in the client has it. The
 * compiled run is deduplicated by CONTENT (`sameActivityContent`), so a cursor
 * re-sent unchanged reaches the stepper as the same object it already held — an
 * instruction that failed to land the first time could never be repeated. The
 * count is what tells a re-send from a re-render.
 *
 * ⚠️ AND IT OBEYS THE BARE-REF TAIL RULE ABOVE, because it is a fourth walker
 * and they must agree: `root = Screens`, one span before its `(` arrives, parses
 * as a complete statement binding a ref. Counted, it announces an emission a
 * span early — while the document still resolves the PREVIOUS line, whose
 * instruction would then be honoured a second time.
 */
export function statementWrites(code: string, id: string): number {
  const lines = code.split("\n");
  const tailAt = tailIndex(code, lines);
  let writes = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!.trim();
    if (line.length === 0) continue;
    const stmt = parseLineCached(line);
    if (stmt?.id !== id) continue;
    if (i === tailAt && stmt.value.k === "ref" && writes > 0) continue;
    writes += 1;
  }
  return writes;
}

// ─── Materialize ────────────────────────────────────────────────────────────

// A document deep enough to hit this is malformed; the limit is what stops a
// mutual reference pair from recursing forever.
const MAX_DEPTH = 24;

/**
 * A call's node wrapper, cached by the `Value` it was built from — the same
 * bargain `LINE_CACHE` makes one level down. `parseLineCached` hands back the
 * IDENTICAL `Value` for a line whose text has not changed, so a `WeakMap` keyed
 * on it needs no eviction of its own: a wrapper is collected exactly when that
 * cache evicts the line that produced it. Handing back the SAME object lets
 * downstream `===` checks (an element cache, a `useMemo`, an effect's deps) bail
 * out instead of comparing a fresh allocation to the last one.
 */
const NODE_CACHE = new WeakMap<Value, StatementNode>();

/** Shallow, by reference. Each value in `props` is itself the OUTPUT of
 *  `materialize`, so a change anywhere underneath has already surfaced as a new
 *  reference at this level — nothing here needs to look further than one level
 *  deep. */
function sameProps(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  return (
    keysA.length === keysB.length &&
    keysA.every((k) => {
      return Object.is(a[k], b[k]);
    })
  );
}

function materialize(
  value: Value,
  stmts: Map<string, Value>,
  seen: Set<string>,
  key: string,
  depth: number,
  unknown: Set<string>,
  library: Vocabulary,
): unknown {
  if (depth > MAX_DEPTH) return null;

  switch (value.k) {
    case "str":
    case "num":
    case "bool":
      return value.v;

    case "null":
      return null;

    case "arr":
      return value.v.map((item, i) => {
        return materialize(
          item,
          stmts,
          seen,
          `${key}.${i}`,
          depth + 1,
          unknown,
          library,
        );
      });

    case "obj": {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value.v)) {
        out[k] = materialize(
          v,
          stmts,
          seen,
          `${key}.${k}`,
          depth + 1,
          unknown,
          library,
        );
      }
      return out;
    }

    case "ref": {
      // A reference to a line that has not arrived yet is normal mid-stream.
      const target = stmts.get(value.v);
      if (!target || seen.has(value.v)) return null;
      seen.add(value.v);
      // Keyed by the statement id, not the path, so a node keeps its key when a
      // sibling is inserted before it.
      const out = materialize(
        target,
        stmts,
        seen,
        value.v,
        depth + 1,
        unknown,
        library,
      );
      seen.delete(value.v);
      return out;
    }

    case "call": {
      // Resolved against the library this parse was GIVEN, never an imported
      // one: a second surface must not be able to name this page's components.
      const spec = library[value.name];
      if (!spec) {
        unknown.add(value.name);
        return null;
      }
      const props: Record<string, unknown> = {};
      // Positional, by declared argument order. Extra arguments are ignored
      // rather than shifting the ones that were right.
      spec.args.forEach((argName, i) => {
        const arg = value.args[i];
        if (arg === undefined) return;
        props[argName] = materialize(
          arg,
          stmts,
          seen,
          `${key}.${argName}`,
          depth + 1,
          unknown,
          library,
        );
      });
      // Reuse last parse's wrapper when what it resolved to is unchanged — see
      // NODE_CACHE. The shape returned is identical either way; only its
      // identity across parses differs.
      const cached = NODE_CACHE.get(value);
      if (cached && cached.key === key && sameProps(cached.props, props)) {
        return cached;
      }
      const node: StatementNode = {
        type: "node",
        name: value.name,
        props,
        key,
      } satisfies StatementNode;
      NODE_CACHE.set(value, node);
      return node;
    }
  }
}

const isNode = (v: unknown): v is StatementNode => {
  return !!v && typeof v === "object" && (v as StatementNode).type === "node";
};

/**
 * Parse a whole — possibly still-growing — AiRA UI document.
 *
 * The entry point is `root` if present, else the first statement, so a document
 * is renderable from its first complete line. Names resolve against `library`,
 * which defaults to the page's own — see `Vocabulary`.
 */
export function parseDocument(
  code: string,
  library: Vocabulary = OPENUI_LIBRARY,
): ParsedDocument {
  const stmts = new Map<string, Value>();
  let first: string | null = null;
  let dropped = 0;

  const lines = code.split("\n");
  const tailAt = tailIndex(code, lines);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!.trim();
    if (line.length === 0) continue;
    const stmt = parseLineCached(line);
    if (!stmt) {
      dropped += 1;
      continue;
    }
    if (i === tailAt && stmt.value.k === "ref" && stmts.has(stmt.id)) continue;
    // Last write wins: a re-sent line is an edit to that statement.
    stmts.set(stmt.id, stmt.value);
    if (first === null) first = stmt.id;
  }

  const entryId = stmts.has("root") ? "root" : first;
  if (entryId === null) return { root: null, unknown: [], dropped };

  const unknown = new Set<string>();
  const out = materialize(
    stmts.get(entryId)!,
    stmts,
    new Set([entryId]),
    entryId,
    0,
    unknown,
    library,
  );

  return { root: isNode(out) ? out : null, unknown: [...unknown], dropped };
}

/**
 * The statement this line defines, or null when the line is not a complete
 * statement — a half-arrived tail, or a payload that split across lines because
 * it carried a raw newline. Exported so "what is on screen" is answered with the
 * SAME rule the renderer uses: a caller matching `id =` with its own regex keeps
 * lines this parser throws away and reports a screen that was never drawn.
 */
export const statementIdOf = (line: string): string | null => {
  return parseLineCached(line.trim())?.id ?? null;
};

/**
 * The component a statement CALLS, or null when the line is not a statement or
 * binds something other than a call.
 *
 * Same bargain as `statementIdOf`: a caller scraping the name out with its own
 * regex disagrees with the renderer on exactly the hardest lines — a payload
 * carrying a raw newline, a half-arrived tail — and that disagreement is a card
 * that animates when the renderer never redrew it.
 */
export const statementCallOf = (line: string): string | null => {
  const value = parseLineCached(line.trim())?.value;
  return value?.k === "call" ? value.name : null;
};

/**
 * One statement's arguments as they were WRITTEN — a string is a string, a
 * reference is still a reference.
 *
 * `materialize` cannot answer this: it RESOLVES a reference into the thing it
 * names, discarding the statement names, and drops every child the caller's
 * library does not declare. Library-independent for the same reason — a call's
 * name and its arguments are facts about the TEXT.
 */
export type LangArg =
  | { k: "str"; v: string }
  | { k: "num"; v: number }
  | { k: "bool"; v: boolean }
  | { k: "null" }
  | { k: "ref"; v: string }
  | { k: "list"; v: LangArg[] };

function asArg(value: Value): LangArg | null {
  switch (value.k) {
    case "str":
      return { k: "str", v: value.v };
    case "num":
      return { k: "num", v: value.v };
    case "bool":
      return { k: "bool", v: value.v };
    case "null":
      return { k: "null" };
    case "ref":
      return { k: "ref", v: value.v };
    case "arr": {
      const items = value.v.map(asArg);
      // A list holding a value this cannot describe is not read HALF way: the
      // caller would silently see a shorter list.
      return items.every((item): item is LangArg => {
        return item !== null;
      })
        ? { k: "list", v: items }
        : null;
    }
    default:
      // A nested call or an object literal. Legal in the language, and nothing
      // a structural reader has a use for.
      return null;
  }
}

/** The call a line makes, argument by argument — or null if it is not a call. */
export function callArgsOf(
  line: string,
): { name: string; args: (LangArg | null)[] } | null {
  const value = parseLineCached(line.trim())?.value;
  if (value?.k !== "call") {
    return null;
  }
  return { name: value.name, args: value.args.map(asArg) };
}

/**
 * Every statement name `root` actually walks to, or null when there is no `root`.
 *
 * The program appends for the whole session, so each turn's new `root` orphans
 * the previous turn's document: those statements render nothing. This is what
 * tells them apart.
 *
 * ⚠️ NULL IS NOT AN EMPTY SET. No `root` means the question is unanswerable here
 * — a program that is still arriving, or a patch frame that re-emits one
 * statement and names no entry point. An empty set would read as "the screen is
 * blank", and a caller filtering by it would report nothing at all.
 *
 * A name is marked reached even when no statement defines it yet: a child named
 * on line 1 before its own line arrives is the normal streaming case, and the
 * set is "what `root` points at", not "what has a line".
 */
export function reachableStatements(code: string): Set<string> | null {
  const stmts = new Map<string, Value>();
  const lines = code.split("\n");
  const tailAt = tailIndex(code, lines);
  for (let i = 0; i < lines.length; i += 1) {
    const stmt = parseLineCached(lines[i]!.trim());
    // Last definition wins, exactly as `parseDocument` resolves it — reachability
    // has to be computed over the lines that RENDERED, not the superseded ones.
    // Including the bare-ref tail rule: a half-arrived rewrite has not rendered.
    if (!stmt) continue;
    if (i === tailAt && stmt.value.k === "ref" && stmts.has(stmt.id)) continue;
    stmts.set(stmt.id, stmt.value);
  }

  const entry = stmts.get("root");
  if (entry === undefined) {
    return null;
  }

  const reached = new Set<string>(["root"]);
  const pending: Value[] = [entry];
  while (pending.length > 0) {
    const value = pending.pop() as Value;
    switch (value.k) {
      case "ref": {
        if (!reached.has(value.v)) {
          reached.add(value.v);
          const target = stmts.get(value.v);
          if (target !== undefined) {
            pending.push(target);
          }
        }
        break;
      }
      case "arr":
        pending.push(...value.v);
        break;
      case "obj":
        pending.push(...Object.values(value.v));
        break;
      case "call":
        pending.push(...value.args);
        break;
      default:
        break;
    }
  }
  return reached;
}
