import { Fragment, type ReactNode } from "react";

import { interpolate, lookup, type MessageParams, type MessageValue } from "./translate";
import type { Locale } from "./locale";

export type RichParams = Record<string, MessageValue | ReactNode>;

const TAG = /<(b|i|c)>([\s\S]*?)<\/\1>|<br\s*\/?>/g;
const HOLE = /(\{\w+\})/g;

const WRAPPER = {
  b: "strong",
  i: "em",
  c: "code",
} as const;

function fill(text: string, params: RichParams | undefined, keyPrefix: string): ReactNode[] {
  if (!params) return [text];
  return text.split(HOLE).map((piece, index) => {
    const name = /^\{(\w+)\}$/.exec(piece)?.[1];
    if (name === undefined) return piece;
    const value = params[name];
    if (value === undefined) return piece;
    if (typeof value === "string" || typeof value === "number") return String(value);
    return <Fragment key={`${keyPrefix}-${index}`}>{value}</Fragment>;
  });
}

/**
 * A message with its inline emphasis intact.
 *
 * The markup lives inside the message so a translator decides which words
 * carry it — Spanish rarely emphasises the same span English does — and so a
 * sentence broken by a `<strong>` is still one message rather than three
 * fragments the code stitches together.
 */
export function renderRich(source: string, params?: RichParams): ReactNode {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  TAG.lastIndex = 0;
  while ((match = TAG.exec(source)) !== null) {
    if (match.index > cursor) {
      nodes.push(...fill(source.slice(cursor, match.index), params, `t${nodes.length}`));
    }
    const tag = match[1];
    if (tag === undefined) {
      nodes.push(<br key={`br${nodes.length}`} />);
    } else {
      const Wrapper = WRAPPER[tag as keyof typeof WRAPPER];
      nodes.push(
        <Wrapper key={`${tag}${nodes.length}`}>
          {fill(match[2] ?? "", params, `w${nodes.length}`)}
        </Wrapper>,
      );
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) {
    nodes.push(...fill(source.slice(cursor), params, `t${nodes.length}`));
  }
  return nodes.length === 1 ? nodes[0] : <>{nodes}</>;
}

export function translateRich(locale: Locale, key: string, params?: RichParams): ReactNode {
  const scalars: MessageParams = {};
  for (const [name, value] of Object.entries(params ?? {})) {
    if (typeof value === "string" || typeof value === "number") scalars[name] = value;
  }
  return renderRich(interpolate(lookup(locale, key, scalars), undefined), params);
}
