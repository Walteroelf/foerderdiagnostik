// Erzeugt Aufgaben automatisch, damit sich Aufgaben bei Wiederholungstests kaum wiederholen.
// In den Datendateien steht z. B. { "gen": "rechnen", "anzahl": 10, "max": 20, "ops": ["+", "-"] }.
import { wortInfo, wortListe } from './symbole.js';
import { graphemeVon } from './eigenes.js';

// Eigene lautgetreue Wörter der Lehrkraft
const eigeneLegeWoerter = () => wortListe().filter((k) => wortInfo(k).eigen && wortInfo(k).legen);

const zufall = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const eins = (liste) => liste[Math.floor(Math.random() * liste.length)];
const ziehe = (liste, n) => [...liste].sort(() => Math.random() - 0.5).slice(0, n);

// Gut zählbare Dinge für Mengenbilder
const ZAEHLDINGE = ['apfel', 'ball', 'stern', 'fisch', 'ente', 'herz', 'blume', 'auto', 'birne', 'kirsche'];

const AEHNLICH_GROSS = {
  A: ['O', 'E', 'H'], B: ['D', 'P', 'R'], D: ['B', 'O', 'P'], E: ['F', 'B', 'L'], F: ['E', 'T', 'P'], G: ['C', 'O', 'Q'],
  H: ['N', 'M', 'K'], I: ['L', 'T', 'J'], K: ['R', 'H', 'X'], L: ['I', 'T', 'E'], M: ['N', 'W', 'H'], N: ['M', 'H', 'Z'],
  O: ['Q', 'C', 'D'], P: ['B', 'R', 'F'], R: ['P', 'B', 'K'], S: ['Z', 'G', 'C'], T: ['F', 'L', 'I'], U: ['V', 'O', 'W'],
  W: ['M', 'V', 'N'], Z: ['S', 'N', 'T'],
};
const AEHNLICH_KLEIN = {
  a: ['o', 'e', 'd'], b: ['d', 'p', 'q'], d: ['b', 'q', 'p'], e: ['a', 'o', 'c'], f: ['t', 'l', 'k'], g: ['q', 'p', 'j'],
  h: ['n', 'k', 'b'], i: ['l', 'j', 't'], k: ['h', 'x', 'l'], l: ['i', 't', 'f'], m: ['n', 'w', 'u'], n: ['m', 'u', 'h'],
  o: ['a', 'e', 'c'], p: ['q', 'b', 'd'], r: ['n', 'v', 't'], s: ['z', 'c', 'e'], t: ['f', 'l', 'i'], u: ['n', 'v', 'w'],
  w: ['m', 'v', 'u'], z: ['s', 'x', 'n'],
};
// Ähnlich klingende Anlaute
const AEHNLICH_LAUT = {
  A: ['O', 'E'], B: ['P', 'D'], D: ['T', 'B'], E: ['I', 'A'], F: ['W', 'S'], G: ['K', 'D'], H: ['R', 'N'], I: ['E', 'Ü'],
  J: ['G', 'I'], K: ['G', 'T'], L: ['R', 'N'], M: ['N', 'W'], N: ['M', 'L'], O: ['U', 'A'], P: ['B', 'T'], R: ['L', 'H'],
  S: ['Z', 'F'], T: ['D', 'K'], U: ['O', 'Ü'], W: ['F', 'M'], Z: ['S', 'T'],
};

function anlautWoerter() {
  return wortListe().filter((k) => {
    const w = wortInfo(k).wort.toLowerCase();
    return !/^(sch|ch|ei|au|eu|äu|st|sp|pf|qu|ph|ä|ö|ü)/.test(w) && AEHNLICH_LAUT[w[0].toUpperCase()];
  });
}

// Drei verschiedene Antwortzahlen: Ziel plus typische Fehler
function zahlOptionen(ziel, kandidaten, anzahl = 3) {
  const out = [ziel];
  for (const k of [...kandidaten, ziel + 1, ziel - 1, ziel + 2, ziel + 10]) {
    if (out.length >= anzahl) break;
    if (Number.isInteger(k) && k >= 0 && !out.includes(k)) out.push(k);
  }
  return out;
}

const dreher = (n) => (n >= 10 && n < 100 ? (n % 10) * 10 + Math.floor(n / 10) : null);

const GEN = {
  eigenlegen() {
    const keys = eigeneLegeWoerter();
    if (!keys.length) return null;
    const wort = eins(keys);
    return { typ: 'legen', wort, teile: graphemeVon(wortInfo(wort).wort) };
  },
  eigenbeschriften() {
    const keys = eigeneLegeWoerter();
    return keys.length ? { typ: 'beschriften', wort: eins(keys) } : null;
  },
  zuordnen() {
    const [ziel, ...rest] = ziehe(wortListe(), 3);
    return { typ: 'zuordnen', ziel, optionen: [ziel, ...rest] };
  },
  buchstabe() {
    const ziel = eins(Object.keys(AEHNLICH_GROSS));
    return { typ: 'buchstabe', ziel, optionen: [ziel, ...AEHNLICH_GROSS[ziel]] };
  },
  anlaut() {
    const wort = eins(anlautWoerter());
    const ziel = wortInfo(wort).wort[0].toUpperCase();
    return { typ: 'anlaut', wort, ziel, optionen: [ziel, ...AEHNLICH_LAUT[ziel]] };
  },
  silben() {
    const wort = eins(wortListe().filter((k) => wortInfo(k).silben));
    const text = wortInfo(wort).silben;
    const ziel = text.split('-').length;
    return { typ: 'silben', wort, silbenText: text, ziel, optionen: ziel > 3 ? [1, 2, 3, 4] : [1, 2, 3] };
  },
  buchstabezuordnen() {
    if (Math.random() < 0.5) {
      const klein = eins(Object.keys(AEHNLICH_KLEIN));
      const gross = klein.toUpperCase();
      const ablenker = (AEHNLICH_GROSS[gross] || ['O', 'E', 'H']).filter((x) => x !== gross);
      return { typ: 'buchstabezuordnen', art: 'gross', zeige: klein, ziel: gross, optionen: [gross, ...ablenker.slice(0, 3)] };
    }
    const tabelle = Math.random() < 0.5 ? AEHNLICH_KLEIN : AEHNLICH_GROSS;
    const ziel = eins(Object.keys(tabelle));
    return { typ: 'buchstabezuordnen', art: 'gleich', zeige: ziel, ziel, optionen: [ziel, ...tabelle[ziel]] };
  },
  menge() {
    let links, rechts;
    do {
      links = zufall(1, 8);
      rechts = zufall(1, 8);
    } while (Math.abs(links - rechts) < 2);
    return { typ: 'menge', frage: eins(['mehr', 'weniger']), ding: eins(ZAEHLDINGE), links, rechts };
  },
  simultan({ max = 6 }) {
    const ziel = zufall(1, max);
    const opt = ziel === 1 ? [1, 2, 3] : [ziel - 1, ziel, ziel + 1];
    return { typ: 'simultan', ziel, optionen: opt };
  },
  zahlmenge({ max = 7 }) {
    const ziel = zufall(1, max);
    return { typ: 'zahlmenge', ziel, ding: eins(ZAEHLDINGE), optionen: zahlOptionen(ziel, [ziel + 1, ziel - 1, ziel + 2]) };
  },
  rechnen({ max = 20, ops = ['+', '-'], bilder = false }) {
    const op = eins(ops);
    let a, b;
    if (op === '+') {
      const summe = max <= 10 ? zufall(3, max) : max <= 20 ? zufall(11, max) : zufall(25, max);
      a = zufall(Math.max(1, Math.floor(summe / 4)), summe - 1);
      b = summe - a;
    } else {
      a = max <= 10 ? zufall(3, max) : max <= 20 ? zufall(11, max) : zufall(25, max);
      b = zufall(1, Math.min(a - 1, max <= 20 ? 9 : 49));
    }
    const ziel = op === '+' ? a + b : a - b;
    const anders = op === '+' ? a - b : a + b;
    return { typ: 'rechnen', a, op, b, bilder: bilder && max <= 10, ding: eins(ZAEHLDINGE), optionen: zahlOptionen(ziel, [ziel + 1, anders, dreher(ziel), ziel - 10]) };
  },
  einmaleins({ reihen = [2, 5, 10] }) {
    const b = eins(reihen);
    const a = zufall(1, 10);
    const ziel = a * b;
    return { typ: 'rechnen', a, op: '·', b, bilder: false, optionen: zahlOptionen(ziel, [ziel + b, ziel - b, a + b]) };
  },
  stellenwert() {
    let zehner, einer;
    do {
      zehner = zufall(1, 9);
      einer = zufall(1, 9);
    } while (zehner === einer);
    const ziel = zehner * 10 + einer;
    return { typ: 'stellenwert', zehner, einer, optionen: zahlOptionen(ziel, [dreher(ziel), zehner + einer, ziel + 10]) };
  },
  geld() {
    const STUECKE = [1000, 500, 200, 100, 50, 20, 10];
    const anzahl = zufall(2, 4);
    const stuecke = Array.from({ length: anzahl }, () => eins(STUECKE)).sort((x, y) => y - x);
    const ziel = stuecke.reduce((s, x) => s + x, 0);
    const kand = [ziel + 100, ziel - 50, ziel + 50, ziel - 100, ziel + 10].filter((x) => x > 0);
    return { typ: 'geld', stuecke, ziel, optionen: zahlOptionen(ziel, kand) };
  },
  uhr() {
    const stunde = zufall(1, 12);
    const nach = (stunde % 12) + 1;
    const art = eins(['voll', 'halb', 'viertelnach', 'viertelvor']);
    const varianten = {
      voll: { minute: 0, text: `${stunde} Uhr`, falsch: [[`halb ${stunde}`, 'Halb-Verwechslung'], [`${nach} Uhr`, 'Stunde falsch abgelesen']] },
      halb: { minute: 30, text: `halb ${nach}`, falsch: [[`halb ${stunde}`, 'Halb-Verwechslung'], [`${stunde} Uhr`, 'Minutenzeiger nicht beachtet']] },
      viertelnach: { minute: 15, text: `Viertel nach ${stunde}`, falsch: [[`Viertel vor ${stunde}`, 'Viertel nach/vor verwechselt'], [`halb ${nach}`, 'Minutenzeiger falsch abgelesen']] },
      viertelvor: { minute: 45, text: `Viertel vor ${nach}`, falsch: [[`Viertel nach ${nach}`, 'Viertel nach/vor verwechselt'], [`Viertel vor ${stunde}`, 'Stunde falsch abgelesen']] },
    }[art];
    return {
      typ: 'uhr', stunde, minute: varianten.minute,
      optionen: [{ text: varianten.text }, ...varianten.falsch.map(([text, fehler]) => ({ text, fehler }))],
    };
  },
};

export function erzeugeAufgaben(generatoren = []) {
  const out = [];
  for (const g of generatoren) {
    const fn = GEN[g.gen];
    if (!fn) continue;
    for (let i = 0; i < (g.anzahl || 6); i++) {
      const a = fn(g);
      if (a) out.push(a);
    }
  }
  return out;
}

export const hatAufgaben = (stufe) => (stufe.aufgaben?.length || 0) + (stufe.generatoren?.length || 0) > 0;
