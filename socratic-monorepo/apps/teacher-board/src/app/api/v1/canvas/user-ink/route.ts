import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getDataFilePath(): string {
  const p1 = path.join(process.cwd(), 'src', 'data', 'userSavedInk.json');
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), 'apps', 'teacher-board', 'src', 'data', 'userSavedInk.json');
  if (fs.existsSync(p2)) return p2;
  return process.cwd().includes('teacher-board') ? p1 : p2;
}

function readSavedInk(): Record<string, any> {
  try {
    const filePath = getDataFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content || '{}');
    }
  } catch (err) {
    console.error('Failed to read userSavedInk.json:', err);
  }
  return {};
}

function writeSavedInk(data: Record<string, any>) {
  try {
    const filePath = getDataFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write userSavedInk.json:', err);
  }
}

export async function GET() {
  const data = readSavedInk();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slotId, strokes, allSlots } = body;

    const data = readSavedInk();

    if (allSlots && typeof allSlots === 'object') {
      Object.assign(data, allSlots);
    } else if (slotId && Array.isArray(strokes)) {
      data[slotId] = strokes;
    }

    writeSavedInk(data);
    return NextResponse.json({ success: true, savedSlots: Object.keys(data) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slotId = searchParams.get('slotId');

    const data = readSavedInk();
    if (slotId) {
      delete data[slotId];
    } else {
      for (const k of Object.keys(data)) {
        delete data[k];
      }
    }

    writeSavedInk(data);
    return NextResponse.json({ success: true, remaining: Object.keys(data) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
