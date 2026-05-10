'use client';

import { useState, useEffect, DragEvent } from 'react';
import { UploadCloud, Download, Image as ImageIcon, FileWarning, Loader2, File as FileIcon, Search, Globe, Instagram, Youtube, Sun, Moon } from 'lucide-react';
import * as fflate from 'fflate';

import NextImage from 'next/image';
import { extractIdFromNDS, getGameCoverUrl, getRegionFromId } from '@/lib/utils';

let cachedDbLines: string[] | null = null;
let fetchingDbPromise: Promise<string[]> | null = null;

let cachedRoms: string[] | null = null;
let fetchingRomsPromise: Promise<string[]> | null = null;

const fetchRomsFiles = async (): Promise<string[]> => {
  if (cachedRoms) return cachedRoms;
  if (fetchingRomsPromise) return fetchingRomsPromise;
  
  fetchingRomsPromise = (async () => {
    try {
      const res = await fetch(`/api/roms`);
      if (res.ok) {
        const json = await res.json();
        if (json.result) {
          cachedRoms = json.result;
          return json.result;
        }
      }
    } catch (e) {
      console.error('Failed to fetch ROMs list', e);
    }
    return [];
  })();
  return fetchingRomsPromise;
};

const findRomForTitle = async (title: string): Promise<string | null> => {
  const files = await fetchRomsFiles();
  if (files.length === 0 || !title) return null;
  
  const normalizeForMatch = (str: string) => {
      let s = str.toLowerCase();
      s = s.replace(/,\s*the$/, ' ');
      s = s.replace(/,\s*an?$/, ' ');
      if (s.startsWith('the ')) s = s.substring(4);
      if (s.startsWith('a ')) s = s.substring(2);
      s = s.replace(/[^a-z0-9]/g, '');
      return s;
  };

  const cleanTitle = normalizeForMatch(title);
  
  let bestMatch: string | null = null;
  let bestMatchLenDiff = Infinity;
  let bestMatchHasIt = false;

  // Prefer exact Match on filename (minus .zip)
  for (const file of files) {
    let baseName = file.replace('.zip', '');
    const hasIt = file.includes(',It') || file.includes(', It');
    
    baseName = baseName.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s*\[.*?\]\s*/g, ' ').trim();
    const cleanZipName = normalizeForMatch(baseName);
    
    if (cleanZipName === cleanTitle) {
      // If we find an exact match that has Italian, return it immediately.
      if (hasIt) return file;
      
      // Otherwise, record it but keep searching in case a ",It" version exists.
      if (!bestMatchHasIt) {
          bestMatch = file;
          bestMatchLenDiff = 0;
          bestMatchHasIt = false;
      }
      continue;
    }
    
    // Fuzzy match logic
    let isFuzzyMatch = false;
    let diff = Infinity;
    
    if (cleanZipName.includes(cleanTitle) && cleanTitle.length > 3) {
      isFuzzyMatch = true;
      diff = Math.abs(cleanZipName.length - cleanTitle.length);
    } else if (cleanTitle.includes(cleanZipName) && cleanZipName.length > 3) {
      isFuzzyMatch = true;
      diff = Math.abs(cleanTitle.length - cleanZipName.length);
    }
    
    if (isFuzzyMatch) {
        if (hasIt && !bestMatchHasIt) {
            // New match has IT and previous best didn't: take it regardless of diff!
            bestMatchHasIt = true;
            bestMatchLenDiff = diff;
            bestMatch = file;
        } else if (hasIt === bestMatchHasIt) {
            // Both have IT or both don't have IT: compare diff
            if (diff < bestMatchLenDiff) {
                bestMatchLenDiff = diff;
                bestMatch = file;
            }
        }
    }
  }
  return bestMatch;
};

const getTitleForId = async (code: string): Promise<string | null> => {
   try {
     const lines = await fetchAllDbLines();
     for (let i=1; i < lines.length; i++) {
       const line = lines[i].trim();
       if (!line) continue;
       const indexOfEquals = line.indexOf('=');
       if (indexOfEquals !== -1) {
         const idPart = line.substring(0, indexOfEquals).trim();
         if (idPart.toUpperCase() === code.toUpperCase()) {
           return line.substring(indexOfEquals + 1).trim();
         }
       }
     }
   } catch (e) {}
   return null;
};

const fetchAllDbLines = async (): Promise<string[]> => {
  if (cachedDbLines) return cachedDbLines;
  if (fetchingDbPromise) return fetchingDbPromise;
  
  fetchingDbPromise = (async () => {
    const dbsToFetch = ['IT', 'EN', 'US', 'FR', 'ES', 'DE'];
    let allLines: string[] = [];
    await Promise.all(dbsToFetch.map(async (langCode) => {
      try {
        const res = await fetch(`/dstdb_${langCode}.txt`);
        if (res.ok) {
          const text = await res.text();
          allLines = allLines.concat(text.split('\n'));
        }
      } catch (e) {
        // ignore
      }
    }));
    cachedDbLines = allLines;
    return allLines;
  })();
  return fetchingDbPromise;
};

const content = {
  IT: {
    title: "NDS Art Resizer",
    subtitle: <>Incolla (Ctrl+V), trascina o seleziona un&apos;immagine per averla a 128x115 px.<br/>Puoi caricare un file <span className="font-bold opacity-100">.NDS</span> per estrarre la copertina in automatico da <span className="font-bold text-blue-500">GameTDB</span>, oppure cercare manualmente il codice del gioco o il nome!</>,
    dropText: "Trascina un'Immagine o un .NDS",
    pasteText: "oppure incollaci l'immagine (Ctrl+V)",
    buttonNDS: "Scegli .NDS",
    buttonImg: "Scegli Immagine",
    searchLabel: "Oppure cerca su GameTDB per ID o Nome:",
    searchPlaceholder: "Es: Mario, Pokemon, ADAE",
    searchBtn: "Cerca ID",
    loading: "Ricerca copertina in corso...",
    preview: "Anteprima 128x115",
    restart: "Ricomincia",
    download: "Scarica",
    errCodeLen: "Il codice ID deve essere di 4 caratteri (es. ADAE) oppure seleziona un gioco dalla lista.",
    errNotFound: "Né copertina né AP Fix trovati con questo codice/nome.",
    errFormat: "Formato non supportato. Trascina un'immagine o un file .NDS.",
    errReadCode: "Impossibile leggere il codice interno di",
    errConnection: "Errore di connessione a GameTDB.",
    errReadNDS: "Errore durante la lettura del file .NDS.",
    gamePrefix: "Gioco:",
    disclaimerFolder: "Inserisci le copertine nella tua microSD in:",
    madeBy: "Creato con 🧡 da",
    clearAll: "Svuota tutto",
    downloadAll: "Scarica tutti (ZIP)",
    processedCount: "Elaborati",
    remove: "Rimuovi"
  },
  EN: {
    title: "NDS Art Resizer",
    subtitle: <>Paste (Ctrl+V), drag or select an image to resize it to 128x115 px.<br/>You can upload an <span className="font-bold opacity-100">.NDS</span> file to automatically extract the cover from <span className="font-bold text-blue-500">GameTDB</span>, or manually search by game code or name!</>,
    dropText: "Drag an Image or a .NDS",
    pasteText: "or paste the image (Ctrl+V)",
    buttonNDS: "Choose .NDS",
    buttonImg: "Choose Image",
    searchLabel: "Or search GameTDB by ID or Name:",
    searchPlaceholder: "Ex: Mario, Pokemon, ADAE",
    searchBtn: "Search ID",
    loading: "Cover search in progress...",
    preview: "Preview 128x115",
    restart: "Start over",
    download: "Download",
    errCodeLen: "The ID code must be 4 characters (ex. ADAE) or select a game from the list.",
    errNotFound: "Neither cover nor AP Fix found for this query.",
    errFormat: "Unsupported format. Drag an image or a .NDS file.",
    errReadCode: "Unable to read internal code of",
    errConnection: "Error connecting to GameTDB.",
    errReadNDS: "Error while reading the .NDS file.",
    gamePrefix: "Game:",
    disclaimerFolder: "Place the boxarts in your microSD card in:",
    madeBy: "Made with 🧡 by",
    clearAll: "Clear all",
    downloadAll: "Download all (ZIP)",
    processedCount: "Processed",
    remove: "Remove"
  }
};

interface ProcessedItem {
  id: string;
  url: string;
  name: string;
  gameCode?: string;
  gameTitle?: string | null;
  romZipPath?: string | null;
}

const RomControls = ({ item, theme }: { item: ProcessedItem; theme: string }) => {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingNdS, setDownloadingNdS] = useState(false);

  if (!item.romZipPath) return null;

  const handleDownload = async (extractNds: boolean) => {
    if (!item.romZipPath) return;
    const setter = extractNds ? setDownloadingNdS : setDownloadingZip;
    setter(true);
    
    try {
      if (!extractNds) {
         let downloadUrl = `http://94.23.34.95/Nintendo%20-%20Nintendo%20DS%20(Decrypted)/${item.romZipPath}`;
         const a = document.createElement("a");
         a.href = downloadUrl;
         a.download = item.romZipPath;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
      } else {
         // Extract via server streaming proxy
         const downloadUrl = `/api/download_rom_pages?file=${encodeURIComponent(item.romZipPath)}&extract=true`;
         const a = document.createElement("a");
         a.href = downloadUrl;
         const extractName = item.romZipPath.replace('.zip', '.nds');
         a.download = extractName;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
      }

      if (item.url) {
        setTimeout(() => {
          const aImg = document.createElement("a");
          aImg.href = item.url;
          aImg.download = item.name;
          document.body.appendChild(aImg);
          aImg.click();
          document.body.removeChild(aImg);
        }, 500);
      }

    } catch (e) {
      console.error(e);
      alert("Errore durante il download del gioco (possibile file troppo grande).");
    } finally {
      setter(false);
    }
  };

  return (
    <div className={`flex flex-col gap-1 w-full mt-2 border-t pt-2 ${theme === 'dark' ? 'border-zinc-700' : 'border-gray-200'}`}>
      <span className={`text-[10px] text-center font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
        Gioco Disponibile!
      </span>
      <div className="flex gap-1 justify-center w-full px-1">
        <button
          onClick={() => handleDownload(true)}
          disabled={downloadingNdS || downloadingZip}
          className={`flex-1 flex justify-center items-center text-[10px] py-1.5 px-1 rounded font-medium border text-white transition-colors ${theme === 'dark' ? 'border-green-700 bg-green-700/80 hover:bg-green-600/80 disabled:opacity-50' : 'border-green-600 bg-green-600 hover:bg-green-700 disabled:opacity-50'}`}
          title="Download .NDS extract"
        >
          {downloadingNdS ? <Loader2 className="w-3 h-3 animate-spin mx-auto"/> : "Scarica .NDS"}
        </button>
        <button
          onClick={() => handleDownload(false)}
          disabled={downloadingZip || downloadingNdS}
          className={`flex-[0.5] flex justify-center items-center text-[10px] py-1.5 px-1 rounded font-medium border transition-colors ${theme === 'dark' ? 'border-zinc-600 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50' : 'border-gray-300 hover:bg-gray-100 text-gray-700 disabled:opacity-50'}`}
          title="Download original .ZIP archive"
        >
          {downloadingZip ? <Loader2 className="w-3 h-3 animate-spin mx-auto"/> : ".ZIP"}
        </button>
      </div>
    </div>
  );
};

const GameCoverIcon = ({ code, className }: { code: string, className?: string }) => {
  const region = getRegionFromId(code);
  const sources = [
    `/CoverDS/${code}.bmp`,
    `/CoverDS/IT/${code}.bmp`,
    `/CoverDS/EN/${code}.bmp`,
    `/CoverDS/US/${code}.bmp`,
    `https://images.weserv.nl/?url=${encodeURIComponent(getGameCoverUrl(code))}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(`https://art.gametdb.com/ds/cover/HQ/${region}/${code}.png`)}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(`https://art.gametdb.com/ds/coverHQ/${region}/${code}.png`)}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(`https://art.gametdb.com/ds/coverM/${region}/${code}.jpg`)}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(`https://art.gametdb.com/ds/coverS/${region}/${code}.png`)}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(`https://art.gametdb.com/ds/cover/EN/${code}.jpg`)}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(`https://art.gametdb.com/ds/coverM/EN/${code}.jpg`)}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(`https://art.gametdb.com/ds/coverS/EN/${code}.png`)}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(`https://art.gametdb.com/ds/label/${region}/${code}.png`)}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(`https://art.gametdb.com/ds/label/EN/${code}.png`)}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(`https://art.gametdb.com/ds/label/US/${code}.png`)}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(`https://art.gametdb.com/ds/label/EU/${code}.png`)}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(`https://art.gametdb.com/ds/label/JA/${code}.png`)}`
  ];
  
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src={sources[currentIndex]} 
      alt="" 
      className={className}
      onError={(e) => {
        if (currentIndex < sources.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          e.currentTarget.style.display = 'none';
        }
      }} 
    />
  );
};

export default function Home() {
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, title: string}[]>([]);
  const [isSearchingList, setIsSearchingList] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [lang, setLang] = useState<'IT' | 'EN'>('IT');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isEnglish = (navigator.language && !navigator.language.toLowerCase().startsWith('it'));
      if (isEnglish) setTimeout(() => setLang('EN'), 0);
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) setTimeout(() => setTheme('dark'), 0);
    }
  }, []);

  const t = content[lang];

  const processImageToDataUrl = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!url.startsWith('data:') && !url.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 115;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, 128, 115);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error("Canvas not supported"));
        }
      };
      img.onerror = () => reject(new Error("Failed to load image: " + url.substring(0, 50)));
      img.src = url;
    });
  };

  const processImageFile = async (file: File | Blob) => {
    setErrorStatus(null);
    setIsProcessing(true);
    setProcessingProgress({ current: 1, total: 1 });
    let url = '';
    try {
      url = URL.createObjectURL(file);
      const dataUrl = await processImageToDataUrl(url);
      setProcessedItems(prev => [{
        id: Math.random().toString(36).substring(2, 11),
        url: dataUrl,
        name: 'name' in file ? file.name.replace(/\.[^/.]+$/, "") + ".nds.png" : "immagine.nds.png"
      }, ...prev]);
    } catch (e) {
      console.error(e);
      setErrorStatus(t.errFormat);
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
    setIsProcessing(false);
  };

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setTimeout(() => {
        setSearchResults([]);
        setShowDropdown(false);
      }, 0);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingList(true);
      try {
        const allLines = await fetchAllDbLines();
        
        if (allLines.length > 0) {
          const results: {id: string, title: string}[] = [];
          const query = searchQuery.trim().toLowerCase();
          
          for (let i = 1; i < allLines.length; i++) {
              const line = allLines[i].trim();
              if (!line) continue;
              const indexOfEquals = line.indexOf('=');
              if (indexOfEquals !== -1) {
                  const idPart = line.substring(0, indexOfEquals).trim();
                  const titlePart = line.substring(indexOfEquals + 1).trim();
                  if (titlePart.toLowerCase().includes(query) || idPart.toLowerCase().includes(query)) {
                      // Avoid duplicates
                      if (!results.some(r => r.id === idPart)) {
                        results.push({ id: idPart, title: titlePart });
                        if (results.length >= 20) break;
                      }
                  }
              }
          }
          setSearchResults(results);
          setShowDropdown(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingList(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, lang]);

  // Incolla file dagli appunti
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Used only for debugging fallback here, actual call uses the elegant one
  const extractCodeFromNdsOld = async (file: File): Promise<string | null> => {
    try {
      const blob = file.slice(0, 16);
      const buffer = await blob.arrayBuffer();
      const view = new DataView(buffer);
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += String.fromCharCode(view.getUint8(12 + i));
      }
      if (/^[a-zA-Z0-9]{4}$/.test(code)) {
        return code;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const fetchBoxartFromWeserv = async (code: string): Promise<string | null> => {
    // Prima tenta di caricare il file BMP locale presente in /CoverDS o nelle sottocartelle
    try {
      const localUrls = [
        `/CoverDS/${code}.bmp`,
        `/CoverDS/IT/${code}.bmp`,
        `/CoverDS/EN/${code}.bmp`,
        `/CoverDS/US/${code}.bmp`
      ];

      for (const localUrl of localUrls) {
        try {
          const res = await fetch(localUrl, { method: 'HEAD' });
          if (res.ok) {
            return await processImageToDataUrl(localUrl);
          }
        } catch(e) {
          // ignore error for this specific url
        }
      }
    } catch (e) {
      console.warn("Local cover not found or error checking local cover:", e);
    }

    const region = getRegionFromId(code);
    const urlsToTry = [
      getGameCoverUrl(code),
      `https://art.gametdb.com/ds/cover/HQ/${region}/${code}.png`,
      `https://art.gametdb.com/ds/coverHQ/${region}/${code}.png`,
      `https://art.gametdb.com/ds/coverM/${region}/${code}.jpg`,
      `https://art.gametdb.com/ds/coverS/${region}/${code}.png`,
      `https://art.gametdb.com/ds/cover/EN/${code}.jpg`,
      `https://art.gametdb.com/ds/coverM/EN/${code}.jpg`,
      `https://art.gametdb.com/ds/coverS/EN/${code}.png`,
      `https://art.gametdb.com/ds/label/${region}/${code}.png`,
      `https://art.gametdb.com/ds/label/EN/${code}.png`,
      `https://art.gametdb.com/ds/label/US/${code}.png`,
      `https://art.gametdb.com/ds/label/EU/${code}.png`,
      `https://art.gametdb.com/ds/label/JA/${code}.png`,
    ];

    for (const originalUrl of urlsToTry) {
        try {
            const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}`;
            const dataUrl = await processImageToDataUrl(proxiedUrl);
            if (dataUrl) return dataUrl;
        } catch (e) {
            // ignore and try next
        }
    }
    
    return null;
  };

  const processMultipleNdsFiles = async (files: File[]) => {
    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: files.length });
    setErrorStatus(null);

    let successCount = 0;
    const newItems: ProcessedItem[] = [];
    
    let lines: string[] = [];
    try {
        lines = await fetchAllDbLines();
    } catch (e) {
        console.error("Failed to load dstdb", e);
    }
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const baseName = file.name.replace(/\.nds$/i, '').trim();
        const cleanNameRaw = baseName.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s*\[.*?\]\s*/g, ' ').trim();
        
        const normalizeForMatch = (str: string) => {
            let s = str.toLowerCase();
            s = s.replace(/,\s*the$/, ' ');
            s = s.replace(/,\s*an?$/, ' ');
            if (s.startsWith('the ')) s = s.substring(4);
            if (s.startsWith('a ')) s = s.substring(2);
            s = s.replace(/[^a-z0-9]/g, '');
            return s;
        };
        const cleanInput = normalizeForMatch(cleanNameRaw);
        
        let foundCode: string | null = null;
        
        if (lines.length > 0) {
            let bestMatchLengthDiff = Infinity;
            
            for (let j = 1; j < lines.length; j++) {
                const line = lines[j].trim();
                if (!line) continue;
                const indexOfEquals = line.indexOf('=');
                if (indexOfEquals !== -1) {
                    const idPart = line.substring(0, indexOfEquals).trim();
                    const titlePart = line.substring(indexOfEquals + 1).trim();
                    const cleanTitle = normalizeForMatch(titlePart);
                    
                    if (cleanTitle === cleanInput) {
                        foundCode = idPart;
                        break;
                    }
                    
                    if (cleanInput.length > 3 && cleanTitle.length > 3 && (cleanInput.includes(cleanTitle) || cleanTitle.includes(cleanInput))) {
                        const diff = Math.abs(cleanInput.length - cleanTitle.length);
                        if (diff < bestMatchLengthDiff) {
                            bestMatchLengthDiff = diff;
                            foundCode = idPart;
                        }
                    }
                }
            }
        }
        
        try {
            if (!foundCode) {
                console.warn("Title not found in DB, falling back to binary code extraction for:", baseName);
                const codeFromBin = await extractIdFromNDS(file);
                if (codeFromBin) {
                    foundCode = codeFromBin;
                }
            }
            
            if (foundCode) {
                const dataUrl = await fetchBoxartFromWeserv(foundCode);
                const gameTitle = await getTitleForId(foundCode);
                let romZipPath = null;
                if (gameTitle) {
                   romZipPath = await findRomForTitle(gameTitle);
                } else if (cleanNameRaw) {
                   romZipPath = await findRomForTitle(cleanNameRaw);
                }
                
                // Always add to output even if no cover or rom.
                newItems.push({
                    id: Math.random().toString(36).substring(2, 11),
                    url: dataUrl || '',
                    name: `${baseName}.nds.png`,
                    gameCode: foundCode,
                    gameTitle: gameTitle || baseName,
                    romZipPath
                });
                successCount++;
            } else {
                console.error(`Could not determine code for Game: ${baseName}`);
            }
        } catch (e) {
            console.error(e);
        }
        
        setProcessingProgress({ current: i + 1, total: files.length });
    }
    
    if (newItems.length > 0) {
        setProcessedItems(prev => [...newItems, ...prev]);
    }
    
    if (successCount < files.length) {
        setErrorStatus(lang === 'IT' ? `Completato con errori. Elaborati ${successCount} su ${files.length} giochi.` : `Completed with errors. Processed ${successCount} of ${files.length} games.`);
    }
    
    setIsProcessing(false);
  };

  const fetchBoxartForCode = async (code: string, customTitle?: string) => {
    setIsProcessing(true);
    setProcessingProgress({ current: 1, total: 1 });
    setErrorStatus(null);
    setShowDropdown(false);
    try {
      const dataUrl = await fetchBoxartFromWeserv(code);
      const gameTitle = customTitle || await getTitleForId(code);
      let romZipPath = null;
      if (gameTitle) {
         romZipPath = await findRomForTitle(gameTitle);
      } else if (customTitle) {
         romZipPath = await findRomForTitle(customTitle);
      }
      
      // Always add the item to the list when manually searched (even if no dataUrl or romZipPath) 
      // since the user wants them to appear even without icons.
      setProcessedItems(prev => [{
          id: Math.random().toString(36).substring(2, 11),
          url: dataUrl || '',
          name: `${gameTitle || customTitle || code}.nds.png`,
          gameCode: code,
          gameTitle,
          romZipPath
      }, ...prev]);
      setSearchQuery('');
    } catch (e) {
      console.error(e);
      setErrorStatus(t.errConnection);
    } finally {
      setIsProcessing(false);
    }
  };

  const searchManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = searchQuery.trim().toUpperCase();
    if (code.length !== 4) {
      setErrorStatus(t.errCodeLen);
      return;
    }
    fetchBoxartForCode(code);
  };

  const removeItem = (id: string) => {
    setProcessedItems(prev => prev.filter(item => item.id !== id));
  };

  const downloadAllZip = () => {
      const files: Record<string, Uint8Array> = {};
      
      processedItems.forEach(item => {
          if (!item.url) return;
          const base64Data = item.url.replace(/^data:image\/png;base64,/, "");
          const binaryString = atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }
          
          let fileName = item.name;
          let counter = 1;
          while (files[fileName]) {
              fileName = item.name.replace(/(?:\.nds\.png|\.png)$/i, ` (${counter}).nds.png`);
              counter++;
          }
          files[fileName] = bytes;
      });

      const zipped = fflate.zipSync(files);
      const blob = new Blob([zipped as any], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "NDS_Boxarts.zip";
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length === 0) return;

    const files = Array.from(e.dataTransfer.files);
    const ndsFiles = files.filter(f => f.name.toLowerCase().endsWith('.nds'));

    if (ndsFiles.length > 0) {
      processMultipleNdsFiles(ndsFiles);
    } else {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      } else {
        setErrorStatus(t.errFormat);
      }
    }
  };

  return (
    <main className={`min-h-screen flex flex-col items-center justify-center py-10 px-4 font-sans transition-colors ${theme === 'dark' ? 'bg-zinc-900 text-zinc-200' : 'bg-gray-50 text-gray-900'}`}>
      <div className={`max-w-md w-full rounded-2xl shadow-xl border relative transition-colors ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 shadow-black/40' : 'bg-white border-gray-100'}`}>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NextImage src="/ndsartresizer.png" alt="NDS Art Resizer Logo" width={160} height={40} className="h-8 w-auto object-contain transition-all duration-300 brightness-0 invert drop-shadow-sm" priority />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="flex items-center justify-center w-8 h-8 rounded-md transition-colors bg-white/10 hover:bg-white/20 text-white"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setLang(lang === 'IT' ? 'EN' : 'IT')}
              className="flex items-center justify-center gap-1 text-sm font-semibold h-8 px-2.5 rounded-md transition-colors bg-white/10 hover:bg-white/20 text-white"
            >
              <Globe className="w-4 h-4" />
              {lang}
            </button>
          </div>
        </div>

        <div className="p-6">
          <p className={`text-sm mb-6 font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>
            {t.subtitle}
          </p>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative border-2 border-dashed rounded-xl p-8 mb-4 text-center transition-all duration-200
              ${isDragging 
                  ? (theme === 'dark' ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50')
                  : (theme === 'dark' ? 'border-zinc-600 hover:border-zinc-500 bg-zinc-800/80 cursor-pointer' : 'border-gray-300 hover:border-gray-400 bg-gray-50/50 cursor-pointer')}
            `}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-6 text-blue-500">
                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                <p className="text-sm font-semibold text-center mt-2">
                    {processingProgress.total > 1 ? 
                        `${lang === 'IT' ? 'Elaborazione file' : 'Processing files'} ${processingProgress.current} / ${processingProgress.total}...` : 
                        t.loading}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4 text-center cursor-pointer pointer-events-none">
                <UploadCloud className={`w-10 h-10 mb-3 mx-auto ${isDragging ? 'text-blue-500' : (theme === 'dark' ? 'text-zinc-500' : 'text-gray-400')}`} />
                <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-600'}`}>{t.dropText}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'}`}>{t.pasteText}</p>
              </div>
            )}
          </div>

          {errorStatus && (
            <div className={`mb-4 text-sm p-3 rounded-lg flex items-start gap-2 ${theme === 'dark' ? 'bg-red-900/30 text-rose-300 border border-red-900/50' : 'bg-amber-50 text-amber-800'}`}>
              <FileWarning className="w-5 h-5 shrink-0 mt-0.5 opacity-80" />
              <span>{errorStatus}</span>
            </div>
          )}

          {!isProcessing && (
            <div className="flex flex-col gap-4 mt-4 relative">
              <div className="flex flex-col sm:flex-row gap-3">
                <label htmlFor="nds-upload" className={`flex-1 flex flex-col items-center justify-center py-3 px-3 border rounded-lg cursor-pointer transition-all text-sm font-semibold shadow-sm focus-within:ring-2 focus-within:ring-blue-500 ${theme === 'dark' ? 'bg-zinc-800 border-zinc-600 hover:bg-zinc-700 text-zinc-300' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                  <FileIcon className="w-5 h-5 mb-1 text-blue-500" />
                  {t.buttonNDS}
                  <input type="file" accept=".nds" multiple onChange={(e) => { 
                    if (!e.target.files?.length) return;
                    processMultipleNdsFiles(Array.from(e.target.files));
                  }} className="hidden" id="nds-upload" />
                </label>

                <label htmlFor="img-upload" className={`flex-1 flex flex-col items-center justify-center py-3 px-3 border rounded-lg cursor-pointer transition-all text-sm font-semibold shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 ${theme === 'dark' ? 'bg-zinc-800 border-zinc-600 hover:bg-zinc-700 text-zinc-300' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                  <ImageIcon className="w-5 h-5 mb-1 text-indigo-500" />
                  {t.buttonImg}
                  <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) processImageFile(e.target.files[0]) }} className="hidden" id="img-upload" />
                </label>
              </div>

              <form onSubmit={searchManualSubmit} className={`flex flex-col gap-2 p-3 border rounded-xl shadow-sm relative ${theme === 'dark' ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-gray-50 border-gray-200'}`}>
                <label className={`text-xs font-semibold block flex items-center justify-center gap-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
                  <Search className="w-3 h-3 text-blue-500" />
                  {t.searchLabel}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        if (!showDropdown) setShowDropdown(true);
                      }}
                      onFocus={() => {
                        if (searchResults.length > 0) setShowDropdown(true);
                      }}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                      placeholder={t.searchPlaceholder}
                      className={`w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-500 focus:ring-2 ring-blue-500/20 text-sm font-medium text-center sm:text-left transition-colors ${theme === 'dark' ? 'bg-zinc-900 border-zinc-600 text-zinc-200 placeholder-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 ring-blue-100'}`}
                    />
                    {isSearchingList && (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin absolute right-3 top-2.5" />
                    )}
                    
                    {showDropdown && searchResults.length > 0 && (
                      <ul className={`absolute z-10 w-full mt-1 border rounded-lg shadow-xl max-h-60 overflow-y-auto text-left text-sm divide-y ${theme === 'dark' ? 'bg-zinc-800 border-zinc-600 divide-zinc-700' : 'bg-white border-gray-200 divide-gray-100'}`}>
                        {searchResults.map((game, i) => {
                          return (
                          <li
                            key={i}
                            onMouseDown={() => fetchBoxartForCode(game.id, game.title)}
                            className={`px-3 py-2 cursor-pointer flex justify-between items-center group transition-colors ${theme === 'dark' ? 'hover:bg-zinc-700' : 'hover:bg-blue-50'}`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`w-8 h-8 shrink-0 rounded flex items-center justify-center overflow-hidden border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-gray-100 border-gray-200'}`}>
                                <GameCoverIcon code={game.id} className="w-full h-full object-cover" />
                              </div>
                              <span className={`font-medium break-words whitespace-normal leading-tight pr-2 ${theme === 'dark' ? 'text-zinc-200' : 'text-gray-800'}`}>{game.title}</span>
                            </div>
                            <span className={`text-xs font-mono shrink-0 ${theme === 'dark' ? 'text-zinc-500 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-500'}`}>{game.id}</span>
                          </li>
                        )})}
                       </ul>
                    )}
                  </div>
                  <button type="submit" disabled={searchQuery.trim().length !== 4 && searchResults.length === 0} className={`text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm shrink-0 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {t.searchBtn}
                  </button>
                </div>
              </form>
            </div>
          )}

          {processedItems.length > 0 && (
            <div className={`mt-6 pt-6 border-t ${theme === 'dark' ? 'border-zinc-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-zinc-200' : 'text-gray-800'}`}>
                  {t.processedCount} ({processedItems.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProcessedItems([])}
                    className={`text-xs font-medium px-2 py-1 rounded transition-colors ${theme === 'dark' ? 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
                  >
                    {t.clearAll}
                  </button>
                  {processedItems.length > 1 && (
                    <button
                      onClick={downloadAllZip}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg text-white shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {t.downloadAll}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1 pb-1 rounded">
                {processedItems.map(item => (
                  <div key={item.id} className={`flex flex-col items-center p-3 rounded-xl border relative shadow-sm ${theme === 'dark' ? 'bg-zinc-800/80 border-zinc-700' : 'bg-white border-gray-200'}`}>
                    <div className="absolute top-1 right-1">
                      <button 
                        onClick={() => removeItem(item.id)} 
                        className={`w-6 h-6 flex items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:scale-110 transition-transform focus:outline-none`}
                        title={t.remove}
                      >
                        <span className="sr-only">{t.remove}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                    
                    {item.url ? (
                      <div className={`shadow-sm border overflow-hidden bg-black flex items-center justify-center mt-2 ${theme === 'dark' ? 'border-zinc-600' : 'border-gray-200'}`} style={{ width: 128, height: 115 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt="Preview" className="block" style={{ width: 128, height: 115, objectFit: 'fill' }} />
                      </div>
                    ) : (
                      <div className={`shadow-sm border overflow-hidden flex flex-col items-center justify-center mt-2 ${theme === 'dark' ? 'border-zinc-600 bg-zinc-900 border-dashed text-zinc-600' : 'border-gray-200 bg-gray-50 border-dashed text-gray-400'}`} style={{ width: 128, height: 115 }}>
                        <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                        <span className="text-[10px] text-center px-2 font-medium">Nessuna Copertina</span>
                      </div>
                    )}
                    
                    <p className={`text-xs mt-3 truncate w-full text-center px-1 font-medium ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`} title={item.gameTitle || item.name}>
                      {item.gameTitle || item.name}
                    </p>
                    
                    {item.url && (
                      <a
                        href={item.url}
                        download={item.name}
                        className={`mt-2 flex items-center justify-center gap-1.5 py-1.5 w-full rounded-md text-xs font-semibold border transition-colors ${theme === 'dark' ? 'border-zinc-600 hover:bg-zinc-700 text-zinc-200 bg-zinc-800' : 'border-gray-300 hover:bg-gray-50 text-gray-700 bg-white'}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Solo Artbox
                      </a>
                    )}
                    <RomControls item={item} theme={theme} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`mt-8 text-center text-sm ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>
        <p className="mb-2">
          {t.disclaimerFolder} <br className="sm:hidden" />
          <code className={`px-2 py-1 rounded font-mono text-xs ml-1 ${theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-200 text-gray-700'}`}>/_nds/TWiLightMenu/boxart</code>
        </p>
        <div className="flex items-center justify-center gap-2 font-medium">
          <span>{t.madeBy} <span className={`font-semibold ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-700'}`}>BowGiulius</span></span>
          <div className={`flex items-center gap-2 border-l pl-2 ml-1 ${theme === 'dark' ? 'border-zinc-700' : 'border-gray-300'}`}>
            <a href="https://www.instagram.com/BowGiulius" target="_blank" rel="noopener noreferrer" className={`hover:scale-110 transition-transform ${theme === 'dark' ? 'text-pink-500' : 'text-pink-600'}`} title="Instagram" aria-label="Instagram">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="https://www.youtube.com/@BowGiulius" target="_blank" rel="noopener noreferrer" className={`hover:scale-110 transition-transform ${theme === 'dark' ? 'text-red-500' : 'text-red-600'}`} title="YouTube" aria-label="YouTube">
              <Youtube className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}