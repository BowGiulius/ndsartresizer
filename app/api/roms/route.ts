import { NextResponse } from 'next/server';

let cachedRoms: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

const fetchRoms = async () => {
    if (cachedRoms) return cachedRoms;
    if (fetchPromise) return fetchPromise;
    fetchPromise = (async () => {
        try {
            const res = await fetch('http://94.23.34.95/Nintendo%20-%20Nintendo%20DS%20(Decrypted)/');
            const text = await res.text();
            const matches = text.match(/href="([^"]+\.zip)"/g);
            if (matches) {
                cachedRoms = matches.map(m => decodeURIComponent(m.substring(6, m.length - 1)));
                return cachedRoms;
            }
        } catch (e) {
            console.error('Failed to fetch ROMs list', e);
        }
        return [];
    })();
    return fetchPromise;
};

export async function GET() {
  const roms = await fetchRoms();
  return NextResponse.json({ result: roms });
}
