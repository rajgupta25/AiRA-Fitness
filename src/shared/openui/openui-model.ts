// Adapted from selected AiRA code; see docs/HARNESS.md.
import type { OPENUI_LIBRARY } from "./openui-library.js";

/** Every component name the model is allowed to write. */
export type StatementName = keyof typeof OPENUI_LIBRARY;

/** One library entry: the signature, and how it is described to the model. */
export interface StatementSpec {
  /** Positional argument names, in signature order. Optional ones go last. */
  readonly args: readonly string[];
  /** How many of `args` are required — the rest drop from the end. */
  readonly required: number;
  /**
   * ⚠️ NOT THE PROMPT. Optional so a revert costs one commit — see
   * `services/openui-library.ts`'s header. No entry sets it: the model's
   * words live in `components/statements/*` JSDoc and `docs/OPENUI.md`.
   */
  readonly desc?: string;
  /**
   * The argument holding child ELEMENTS rather than data. Declared here so a new
   * container cannot silently render empty: without it the renderer has no way
   * to know `items` holds elements and not strings.
   */
  readonly childArg?: string;
}

/**
 * What the spacing ladder needs of a block: its statement name, and the props
 * that say which rung it is.
 *
 * ⚠️ THE PAIR IS TWO NODES, NOT TWO NAMES. One statement can take either rung:
 * a `Text` is a screen's name or the paragraph under it depending on its
 * `variant`, and a name-only decision reads both as prose. A `StatementNode`
 * satisfies this structurally.
 */
export interface GapNode {
  readonly name: string;
  readonly props?: Record<string, unknown>;
}

/**
 * A vocabulary a document can be parsed against.
 *
 * The language and the vocabulary are different things, so the library is a
 * parser PARAMETER rather than an import: a second surface then costs a second
 * table, not a second parser, and the conversation's generated prompt does not
 * silently grow that surface's components.
 */
export type Vocabulary = Readonly<Record<string, StatementSpec>>;

/** A materialized element: component name plus props resolved by signature. */
export interface StatementNode {
  type: "node";
  /** A name in whichever library this document was parsed against. */
  name: string;
  props: Record<string, unknown>;
  /** Stable across re-parses — the statement id, or a positional path. */
  key: string;
}

export interface ParsedDocument {
  root: StatementNode | null;
  /** Component names the model used that the library does not define. */
  unknown: string[];
  /** Lines that did not parse. While streaming the tail is normally one. */
  dropped: number;
}

/** Whether a materialized value is a node rather than a plain string, number,
 *  list or object literal — the one check every reader of a resolved tree
 *  needs before it can look at `.name`/`.props`/`.key`. */
export function isStatementNode(value: unknown): value is StatementNode {
  return (
    !!value &&
    typeof value === "object" &&
    (value as StatementNode).type === "node"
  );
}
