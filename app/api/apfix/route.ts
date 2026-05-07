import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://archive.org/metadata/nds_apfix/files');
    const json = await res.json();
    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
