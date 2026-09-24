import { Fragment } from 'react';

type Block =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'numbers'; items: string[] };

const BULLET = /^\s*[-•*]\s+/;
const NUMBER = /^\s*\d+[.)]\s+/;

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.split('\n')) {
    const last = blocks[blocks.length - 1];
    if (!line.trim()) {
      blocks.push({ kind: 'paragraph', lines: [] });
    } else if (BULLET.test(line)) {
      if (last?.kind === 'bullets') last.items.push(line.replace(BULLET, ''));
      else blocks.push({ kind: 'bullets', items: [line.replace(BULLET, '')] });
    } else if (NUMBER.test(line)) {
      if (last?.kind === 'numbers') last.items.push(line.replace(NUMBER, ''));
      else blocks.push({ kind: 'numbers', items: [line.replace(NUMBER, '')] });
    } else if (last?.kind === 'paragraph') {
      last.lines.push(line);
    } else {
      blocks.push({ kind: 'paragraph', lines: [line] });
    }
  }
  return blocks.filter((b) => (b.kind === 'paragraph' ? b.lines.length > 0 : b.items.length > 0));
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="rounded-md bg-surface-2 px-1 py-0.5 text-[13px]">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noreferrer"
              className="break-all text-accent underline-offset-2 hover:underline"
            >
              {part}
            </a>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/** Lo poco de Markdown que usa el asistente: párrafos, listas, **negritas** y enlaces. */
export function RichText({ text }: { text: string }) {
  return (
    <div className="min-w-0 space-y-2.5 text-[14.5px] leading-relaxed text-txt [overflow-wrap:anywhere]">
      {parse(text).map((block, i) => {
        if (block.kind === 'bullets') {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 marker:text-faint">
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === 'numbers') {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5 marker:text-faint">
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inline text={item} />
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Inline text={line} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
