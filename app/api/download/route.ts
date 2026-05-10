import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');
  if (!file) return NextResponse.json({ error: 'Missing file param'}, {status: 400});

  const targetUrl = `https://archive.org/download/nds_apfix/${file}`;
  
  try {
    const res = await fetch(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
    });

    if (!res.ok) {
        return NextResponse.json({ error: 'Target returned ' + res.status }, {status: 500});
    }

    // Return the response directly as a stream with appropriate headers
    const newHeaders = new Headers(res.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    // Remove headers that might cause issues
    newHeaders.delete('content-encoding');
    newHeaders.delete('transfer-encoding');

    return new NextResponse(res.body, {
      status: res.status,
      headers: newHeaders,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, {status: 500});
  }
}
