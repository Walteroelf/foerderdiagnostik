// Bildquellen: eigene Fotos, eigene Symbole (z. B. METACOM), ARASAAC, Emoji als Ersatz.
// Alle Bilder liegen nur in diesem Browser (IndexedDB) und werden nie veröffentlicht.
const DB_NAME = 'foerderdiagnostik-symbole';
const STORE = 'bilder';
export const SAETZE = { foto: 'Eigene Fotos', eigen: 'Eigene Symbole', arasaac: 'ARASAAC' };

let woerter = {};
const urls = new Map(); // "satz:wort" -> objectURL

function oeffneDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function mitStore(modus, fn) {
  const db = await oeffneDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, modus);
    const ergebnis = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(ergebnis?.result ?? ergebnis);
    tx.onerror = () => reject(tx.error);
  });
}

export async function initSymbole(wortDaten) {
  woerter = wortDaten;
  try {
    const eintraege = await mitStore('readonly', (s) => {
      const out = [];
      s.openCursor().onsuccess = (e) => {
        const c = e.target.result;
        if (c) {
          out.push([c.key, c.value]);
          c.continue();
        }
      };
      return out;
    });
    for (const [key, wert] of eintraege) setzeUrl(key, wert);
  } catch (e) {
    console.warn('Symbolspeicher nicht verfügbar', e);
  }
}

function setzeUrl(key, wert) {
  if (urls.has(key)) URL.revokeObjectURL(urls.get(key));
  const blob = wert?.blob || wert;
  if (blob instanceof Blob) urls.set(key, URL.createObjectURL(blob));
}

export const wortInfo = (key) => woerter[key] || { wort: key, emoji: '❓' };
export const wortListe = () => Object.keys(woerter);

// art: 'foto' (Abbildung eines realen Gegenstands) oder 'symbol'
export function bildElement(key, art = 'symbol') {
  const reihenfolge = art === 'foto' ? ['foto'] : ['eigen', 'arasaac'];
  for (const satz of reihenfolge) {
    const url = urls.get(`${satz}:${key}`);
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = wortInfo(key).wort;
      img.className = 'bild';
      return img;
    }
  }
  const span = document.createElement('span');
  span.className = 'bild emoji';
  span.textContent = wortInfo(key).emoji;
  span.setAttribute('role', 'img');
  span.setAttribute('aria-label', wortInfo(key).wort);
  return span;
}

export function anzahlBilder(satz) {
  return [...urls.keys()].filter((k) => k.startsWith(satz + ':')).length;
}

export async function speichereBild(satz, key, blob, meta = {}) {
  await mitStore('readwrite', (s) => s.put({ blob, ...meta }, `${satz}:${key}`));
  setzeUrl(`${satz}:${key}`, blob);
}

export async function loescheSatz(satz) {
  const keys = [...urls.keys()].filter((k) => k.startsWith(satz + ':'));
  await mitStore('readwrite', (s) => keys.forEach((k) => s.delete(k)));
  keys.forEach((k) => {
    URL.revokeObjectURL(urls.get(k));
    urls.delete(k);
  });
}

// Dateiname ohne Endung = Wort, z. B. "Maus.png" oder "maus.jpg"
export function wortAusDateiname(name) {
  const basis = name.replace(/\.[^.]+$/, '').trim().toLowerCase();
  const umlaut = basis.replace(/ae/g, 'ä').replace(/oe/g, 'ö').replace(/ue/g, 'ü');
  for (const key of Object.keys(woerter)) {
    const w = woerter[key].wort.toLowerCase();
    if (key === basis || w === basis || w === umlaut) return key;
  }
  return null;
}

// Lädt ARASAAC-Piktogramme einmalig (Internet nötig). Übertragen werden nur die Suchwörter.
export async function ladeArasaac(fortschritt = () => {}) {
  const keys = Object.keys(woerter);
  let ok = 0;
  const fehler = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const info = woerter[key];
    try {
      let id = info.arasaacId;
      if (!id) {
        const begriff = encodeURIComponent(info.arasaac || info.wort);
        let r = await fetch(`https://api.arasaac.org/v1/pictograms/de/bestsearch/${begriff}`);
        if (!r.ok) r = await fetch(`https://api.arasaac.org/v1/pictograms/de/search/${begriff}`);
        if (!r.ok) throw new Error('nicht gefunden');
        const treffer = await r.json();
        id = treffer?.[0]?._id;
      }
      if (!id) throw new Error('nicht gefunden');
      const bild = await fetch(`https://static.arasaac.org/pictograms/${id}/${id}_500.png`);
      if (!bild.ok) throw new Error('Bild fehlt');
      await speichereBild('arasaac', key, await bild.blob(), { arasaacId: id });
      ok++;
    } catch {
      fehler.push(info.wort);
    }
    fortschritt(i + 1, keys.length);
  }
  return { ok, fehler };
}
