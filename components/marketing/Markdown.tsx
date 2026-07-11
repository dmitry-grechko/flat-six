import Link from 'next/link';
import { sans, mono } from './tokens';

/** Minimal SSR markdown for knowledge article bodies — no extra dependency. */
export default function Markdown({ source }: { source: string }) {
  const blocks = parseBlocks(source.trim());
  return (
    <div style={{ font: `400 15px/1.7 ${sans}`, color: '#3A3A3E' }}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] };

function parseBlocks(source: string): Block[] {
  const lines = source.split('\n');
  const blocks: Block[] = [];
  let list: string[] | null = null;

  const flushList = () => {
    if (list && list.length) blocks.push({ type: 'ul', items: list });
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      blocks.push({ type: 'h1', text: line.slice(2).trim() });
    } else if (line.startsWith('## ')) {
      flushList();
      blocks.push({ type: 'h2', text: line.slice(3).trim() });
    } else if (line.startsWith('### ')) {
      flushList();
      blocks.push({ type: 'h3', text: line.slice(4).trim() });
    } else if (line.startsWith('- ')) {
      if (!list) list = [];
      list.push(line.slice(2).trim());
    } else {
      flushList();
      blocks.push({ type: 'p', text: line.trim() });
    }
  }
  flushList();
  return blocks;
}

function renderBlock(block: Block, key: number) {
  if (block.type === 'h1') {
    return (
      <h1 key={key} style={{ margin: '0 0 20px', font: `400 28px/1.2 ${sans}`, color: '#0B0B0C' }}>
        {inline(block.text)}
      </h1>
    );
  }
  if (block.type === 'h2') {
    return (
      <h2 key={key} style={{ margin: '32px 0 14px', font: `400 22px/1.25 ${sans}`, color: '#0B0B0C' }}>
        {inline(block.text)}
      </h2>
    );
  }
  if (block.type === 'h3') {
    return (
      <h3 key={key} style={{ margin: '24px 0 10px', font: `500 16px/1.3 ${sans}`, color: '#0B0B0C' }}>
        {inline(block.text)}
      </h3>
    );
  }
  if (block.type === 'ul') {
    return (
      <ul key={key} style={{ margin: '0 0 16px', paddingLeft: 20 }}>
        {block.items.map((item, i) => (
          <li key={i} style={{ marginBottom: 8 }}>{inline(item)}</li>
        ))}
      </ul>
    );
  }
  return <p key={key} style={{ margin: '0 0 14px' }}>{inline(block.text)}</p>;
}

function inline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={k++} style={{ color: '#0B0B0C', fontWeight: 600 }}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      parts.push(<em key={k++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('[')) {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (lm) {
        const href = lm[2];
        const isExternal = href.startsWith('http');
        parts.push(
          isExternal ? (
            <a key={k++} href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#D5001C' }}>{lm[1]}</a>
          ) : (
            <Link key={k++} href={href} style={{ color: '#D5001C' }}>{lm[1]}</Link>
          ),
        );
      } else parts.push(token);
    } else {
      parts.push(
        <a key={k++} href={token} target="_blank" rel="noopener noreferrer" style={{ color: '#D5001C', wordBreak: 'break-all' }}>{token}</a>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}
