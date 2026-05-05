// lib/utils.ts

// Capisce la regione dalla 4° lettera dell'ID
export function getRegionFromId(gameId: string): string {
  const regionChar = gameId.charAt(3).toUpperCase();
  switch (regionChar) {
    case 'E': return 'US'; 
    case 'P': return 'EN'; 
    case 'I': return 'IT'; 
    case 'J': return 'JA'; 
    case 'F': return 'FR'; 
    case 'S': return 'ES'; 
    case 'D': return 'DE'; 
    case 'K': return 'KO'; 
    default: return 'EN';  
  }
}

// Genera il link di GameTDB corretto come da tua richiesta
export function getGameCoverUrl(gameId: string): string {
  if (!gameId || gameId.length < 4) return '/CoverDS/missing-cover.png'; 
  
  const cleanId = gameId.trim().toUpperCase();
  const region = getRegionFromId(cleanId);
  
  // Usa la cartella "cover" standard e il formato .jpg
  return `https://art.gametdb.com/ds/cover/${region}/${cleanId}.jpg`;
}

// Legge i 4 byte dell'ID dal file
export const extractIdFromNDS = (fileOrBlob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const idBlob = fileOrBlob.slice(12, 16);
    
    reader.onload = (e) => {
      const result = e.target?.result as string;
      resolve(result.replace(/[^a-zA-Z0-9]/g, '').toUpperCase());
    };
    reader.onerror = () => reject("Errore lettura header NDS");
    reader.readAsText(idBlob);
  });
};