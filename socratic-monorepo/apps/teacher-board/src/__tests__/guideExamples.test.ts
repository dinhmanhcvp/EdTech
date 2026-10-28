import {describe, it, expect} from 'vitest';
import {readFileSync} from 'fs';
import {resolve} from 'path';
import {matchInstantStemBlueprint} from '../components/canvas/SmartboardCanvas';
import {LIVE_CASES} from './liveDemoCases.test';

/**
 * docs/HUONG_DAN_VIET_DE_TRUC_QUAN.md: mỗi mục `### ID — tên` có dòng `- **Viết:** ...` liệt kê câu mẫu trong dấu `...`.
 * Mọi câu mẫu phải mở đúng mô phỏng ID; mọi mô phỏng trong danh sách trình diễn phải có mục trong hướng dẫn.
 */
const DOC = resolve(__dirname, '../../../../../docs/HUONG_DAN_VIET_DE_TRUC_QUAN.md');
const text = readFileSync(DOC, 'utf-8');

interface Entry {
  id: string;
  inputs: string[];
}

function parse(): Entry[] {
  const out: Entry[] = [];
  let cur: Entry | null = null;
  for (const line of text.split(/\r?\n/)) {
    const h = /^###\s+([A-Z0-9_]+)\s+—/.exec(line);
    if (h) {
      cur = {id: h[1], inputs: []};
      out.push(cur);
      continue;
    }
    if (cur && /^- \*\*Viết:\*\*/.test(line)) {
      // bỏ phần chú thích trong ngoặc sau câu cuối: lấy mọi đoạn trong dấu `
      cur.inputs.push(...[...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]));
    }
  }
  return out;
}

const ENTRIES = parse();

describe('hướng dẫn viết để trực quan', () => {
  it('có mục cho mọi mô phỏng trong danh sách trình diễn', () => {
    const documented = new Set(ENTRIES.map((e) => e.id));
    const missing = [...new Set(LIVE_CASES.map((c) => c.id))].filter((id) => !documented.has(id));
    expect(missing).toEqual([]);
  });

  it('mỗi mục có ít nhất một câu mẫu', () => {
    expect(ENTRIES.filter((e) => e.inputs.length === 0).map((e) => e.id)).toEqual([]);
  });

  for (const e of ENTRIES) {
    for (const input of e.inputs) {
      it(`${e.id} ← ${input}`, () => {
        // câu "(ba dòng…)" ghi chú không nằm trong dấu `; chỉ kiểm câu trong dấu `
        expect(matchInstantStemBlueprint(input)?.templateId).toBe(e.id);
      });
    }
  }
});
