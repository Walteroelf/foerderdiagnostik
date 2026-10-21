// Übertragung zwischen iPads per QR-Code. Die Daten gehen direkt von Bildschirm zu Kamera,
// ohne Internet und ohne Server. Größere Pakete werden auf mehrere QR-Codes verteilt, die nacheinander erscheinen.
import { h } from './dom.js';
import { speicher } from './storage.js';
import { eigeneWoerter, eigeneTexte, uebernehmeEigenes } from './eigenes.js';

const TEIL_LAENGE = 700;
const WECHSEL_MS = 1200;

function ladeSkript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Skript nicht ladbar: ' + src));
    document.head.append(s);
  });
}

const zuB64 = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const vonB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function packe(text) {
  const roh = new TextEncoder().encode(text);
  if ('CompressionStream' in window) {
    const strom = new Blob([roh]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return 'z' + zuB64(new Uint8Array(await new Response(strom).arrayBuffer()));
  }
  return 'p' + zuB64(roh);
}

async function entpacke(s) {
  const bytes = vonB64(s.slice(1));
  if (s[0] === 'z') {
    const strom = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new TextDecoder().decode(await new Response(strom).arrayBuffer());
  }
  return new TextDecoder().decode(bytes);
}

// Paket für ein Pseudonym oder alle Pseudonyme dieses Geräts
export function erstellePaket(pseudonyme, mitEigenem) {
  const paket = { typ: 'paket', version: 1, erstellt: new Date().toISOString(), tests: [], lautlesen: [], boegen: [] };
  for (const p of pseudonyme) {
    paket.tests.push(...speicher.tests(p));
    paket.lautlesen.push(...speicher.lautlesen(p));
    const b = speicher.bogen(p);
    if (b) paket.boegen.push(b);
  }
  if (mitEigenem) {
    paket.eigeneWoerter = eigeneWoerter();
    paket.eigeneTexte = eigeneTexte();
  }
  return paket;
}

export function importierePaket(d) {
  const z = { tests: 0, lautlesen: 0, boegen: 0, eigenes: 0 };
  d.tests?.forEach((t) => speicher.speichereTest(t) && z.tests++);
  d.lautlesen?.forEach((r) => speicher.speichereLautlesen(r) && z.lautlesen++);
  d.boegen?.forEach((b) => {
    const alt = speicher.bogen(b.pseudonym);
    if (!alt || alt.aktualisiert <= b.aktualisiert) {
      speicher.speichereBogen(b);
      z.boegen++;
    }
  });
  if (d.eigeneWoerter || d.eigeneTexte) z.eigenes = uebernehmeEigenes({ woerter: d.eigeneWoerter, texte: d.eigeneTexte });
  return z;
}

export const zusammenfassung = (z) =>
  [
    z.tests && `${z.tests} Schülerprotokoll(e)`,
    z.lautlesen && `${z.lautlesen} Leseprotokoll(e)`,
    z.boegen && `${z.boegen} Kompetenzbogen/-bögen`,
    z.eigenes && `${z.eigenes} eigene Wörter/Texte`,
  ].filter(Boolean).join(', ') || 'nichts Neues';

// Zeigt das Paket als (wechselnde) QR-Codes. Gibt eine Stopp-Funktion zurück.
export async function zeigeQr(container, paket) {
  await ladeSkript('vendor/qrcode.js');
  const daten = await packe(JSON.stringify(paket));
  const id = Math.random().toString(36).slice(2, 6);
  const anzahl = Math.ceil(daten.length / TEIL_LAENGE);
  const codes = Array.from({ length: anzahl }, (_, i) => {
    const qr = window.qrcode(0, 'L');
    qr.addData(`FD1|${id}|${i}|${anzahl}|${daten.slice(i * TEIL_LAENGE, (i + 1) * TEIL_LAENGE)}`);
    qr.make();
    return qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
  });
  const bild = h('div', { class: 'qr-bild' });
  const info = h('p', { class: 'unter' });
  container.replaceChildren(bild, info);
  let i = 0;
  const male = () => {
    bild.innerHTML = codes[i];
    info.textContent = anzahl > 1 ? `QR-Code ${i + 1} von ${anzahl} – die Codes wechseln automatisch. Einfach die Kamera draufhalten.` : 'Halte die Kamera des anderen iPads auf diesen Code.';
    i = (i + 1) % anzahl;
  };
  male();
  const timer = anzahl > 1 ? setInterval(male, WECHSEL_MS) : null;
  return () => clearInterval(timer);
}

// Scannt QR-Codes mit der Kamera, bis alle Teile da sind. fertig(paket) wird mit dem Paket aufgerufen.
export async function starteScanner(container, fertig, fehler) {
  await ladeSkript('vendor/jsQR.js');
  const video = h('video', { playsinline: true, muted: true, autoplay: true, class: 'scan-video' });
  const status = h('p', { class: 'scan-status' }, 'Halte die Kamera auf den QR-Code des anderen iPads.');
  const balken = h('div', { class: 'scan-balken' }, h('span'));
  container.replaceChildren(video, balken, status);
  let strom;
  try {
    strom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  } catch {
    fehler('Kamera nicht verfügbar. Bitte den Kamerazugriff für diese Seite erlauben.');
    return () => {};
  }
  video.muted = true;
  video.srcObject = strom;
  await video.play().catch(() => {});
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const teile = new Map();
  let paketId = null;
  let aktiv = true;
  const stopp = () => {
    aktiv = false;
    strom.getTracks().forEach((t) => t.stop());
  };
  const runde = async () => {
    if (!aktiv) return;
    if (video.readyState >= 2) {
      const breite = Math.min(video.videoWidth, 800);
      const hoehe = Math.round((video.videoHeight / video.videoWidth) * breite);
      canvas.width = breite;
      canvas.height = hoehe;
      ctx.drawImage(video, 0, 0, breite, hoehe);
      const code = window.jsQR(ctx.getImageData(0, 0, breite, hoehe).data, breite, hoehe, { inversionAttempts: 'dontInvert' });
      const m = code?.data?.match(/^FD1\|(\w+)\|(\d+)\|(\d+)\|(.*)$/s);
      if (m) {
        const [, id, nr, anzahl, inhalt] = m;
        if (id !== paketId) {
          paketId = id;
          teile.clear();
        }
        teile.set(Number(nr), inhalt);
        balken.firstChild.style.width = `${(teile.size / Number(anzahl)) * 100}%`;
        status.textContent = `${teile.size} von ${anzahl} Codes gelesen …`;
        if (teile.size === Number(anzahl)) {
          stopp();
          try {
            const text = await entpacke([...Array(Number(anzahl)).keys()].map((k) => teile.get(k)).join(''));
            fertig(JSON.parse(text));
          } catch {
            fehler('Die Daten konnten nicht gelesen werden. Bitte noch einmal versuchen.');
          }
          return;
        }
      }
    }
    setTimeout(runde, 150);
  };
  runde();
  return stopp;
}
