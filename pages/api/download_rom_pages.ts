import type { NextApiRequest, NextApiResponse } from 'next';
import http from 'http';
import https from 'https';
import unzipper from 'unzipper';

// Disable Next.js body parsing to handle large proxy requests directly
export const config = {
    api: {
        responseLimit: false,
    },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    const file = req.query.file as string;
    const extract = req.query.extract === 'true';

    if (!file) {
        res.status(400).json({ error: 'Missing file parameter' });
        return;
    }

    const baseUrl = 'http://94.23.34.95/Nintendo%20-%20Nintendo%20DS%20(Decrypted)/';
    const targetUrl = baseUrl + encodeURI(file);

    if (!extract) {
        // Direct proxy
        const client = targetUrl.startsWith('https') ? https : http;
        const proxyReq = client.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (proxyRes) => {
            if (proxyRes.statusCode !== 200) {
                res.status(proxyRes.statusCode || 500).json({ error: 'Upstream error ' + proxyRes.statusCode });
                return;
            }
            res.writeHead(200, {
                'Content-Type': proxyRes.headers['content-type'] || 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${file.split('/').pop()}"`,
                'Content-Length': proxyRes.headers['content-length'] || '',
                'Access-Control-Allow-Origin': '*',
            });
            proxyRes.pipe(res);
        });
        proxyReq.on('error', (err) => {
            res.status(500).json({ error: 'Proxy error', details: err.message });
        });
        return;
    }

    // Extract mode
    const getReq = http.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (proxyRes) => {
        if (proxyRes.statusCode !== 200) {
            res.status(proxyRes.statusCode || 500).json({ error: 'Upstream error ' + proxyRes.statusCode });
            return;
        }

        let found = false;
        proxyRes.pipe(unzipper.Parse())
            .on('entry', (entry: any) => {
                const fileName = entry.path;
                if (!found && fileName.toLowerCase().endsWith('.nds')) {
                    found = true;
                    const ndsName = fileName.split('/').pop() || file.replace('.zip', '.nds');

                    const headers: Record<string, string> = {
                        'Content-Disposition': `attachment; filename="${ndsName}"`,
                        'Content-Type': 'application/x-nintendo-ds-rom',
                        'Access-Control-Allow-Origin': '*',
                        'X-Accel-Buffering': 'no',
                        'Cache-Control': 'no-cache',
                    };

                    if (entry.vars && entry.vars.uncompressedSize) {
                        headers['Content-Length'] = entry.vars.uncompressedSize.toString();
                    }

                    res.writeHead(200, headers);
                    
                    entry.pipe(res);
                    
                    entry.on('end', () => {
                        setTimeout(() => { try { getReq.destroy(); } catch (e) { } }, 1000);
                    });
                    
                    req.on('close', () => {
                        try { entry.destroy(); } catch(e){}
                        try { getReq.destroy(); } catch(e){}
                    });
                } else {
                    entry.autodrain();
                }
            })
            .on('error', (err: any) => {
                console.error("Unzip error:", err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Unzip error', details: err.message });
                }
            });
    });

    getReq.on('error', (err) => {
        console.error("Downstream GET error:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Proxy error', details: err.message });
        }
    });
}
