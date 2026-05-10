import { NextResponse } from 'next/server';
import unzipper from 'unzipper';
import http from 'http';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');
  if (!file) return NextResponse.json({ error: 'Missing file param'}, {status: 400});

  const encodedFile = encodeURIComponent(file).replace(/%20/g, '+');
  // Wait, encodeURIComponent doesn't turn space into +, but url might need specific encoding.
  // Actually, we can just encode the characters properly.
  // We'll use the URL as is but encodeURIComponent on the filename. Note that the filename might already be decoded.
  const targetUrl = `http://94.23.34.95/Nintendo%20-%20Nintendo%20DS%20(Decrypted)/${file.split('/').map(encodeURIComponent).join('/')}`;
  
  const extractNds = searchParams.get('extract') === 'true';

  try {
    if (!extractNds) {
       // Just proxy the zip
       const res = await fetch(targetUrl);
       if (!res.ok) return NextResponse.json({ error: 'Target returned ' + res.status}, {status: res.status});
       const headers = new Headers(res.headers);
       headers.delete('content-encoding');
       headers.set('Content-Disposition', `attachment; filename="${file}"`);
       return new NextResponse(res.body, { headers, status: 200 });
    } else {
       // We need to return a ReadableStream of the .nds file.
       // `fetch` returns a Web Stream, but `unzipper` requires a Node stream.
       // So we'll use `http.get` to get a Node stream, pass it to `unzipper.Parse()`, and push the entry we want into a Web Stream.
       let ndsStream: ReadableStream | null = null;
       let filename = file.replace('.zip', '.nds');

       const stream = new ReadableStream({
           start(controller) {
               http.get(targetUrl, (response) => {
                   if (response.statusCode !== 200) {
                       controller.error(new Error("Target returned " + response.statusCode));
                       return;
                   }

                   response.pipe(unzipper.Parse())
                     .on('entry', (entry) => {
                         const fileName = entry.path;
                         if (fileName.toLowerCase().endsWith('.nds')) {
                             filename = fileName;
                             entry.on('data', (chunk: Buffer) => {
                                 controller.enqueue(chunk);
                             });
                             entry.on('end', () => {
                                 controller.close();
                             });
                         } else {
                             entry.autodrain();
                         }
                     })
                     .on('error', (err) => {
                         controller.error(err);
                     });
               }).on('error', (err) => {
                   controller.error(err);
               });
           }
       });

       return new NextResponse(stream, {
           status: 200,
           headers: {
               'Content-Type': 'application/x-nintendo-ds-rom',
               'Content-Disposition': `attachment; filename="${filename}"`
           }
       });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, {status: 500});
  }
}
