// Antwort per Sprache: Das Kind sagt die Antwort, die App wählt das passende Antwortfeld.
// Nutzt die Spracherkennung des Browsers (Safari: Diktierfunktion von Apple).
const Erkennung = window.SpeechRecognition || window.webkitSpeechRecognition;
export const erkennungVerfuegbar = () => !!Erkennung;

let aktiv = null;

export function hoerAuf() {
  if (aktiv) {
    try {
      aktiv.abort();
    } catch {
      /* schon beendet */
    }
  }
  aktiv = null;
}

// Hört einmal zu und liefert die erkannten Varianten (Liste von Texten, evtl. leer)
export function hoereZu() {
  hoerAuf();
  return new Promise((fertig) => {
    const r = new Erkennung();
    r.lang = 'de-DE';
    r.interimResults = false;
    r.maxAlternatives = 5;
    r.continuous = false;
    let ergebnis = [];
    r.onresult = (ev) => {
      ergebnis = [...ev.results[0]].map((alt) => alt.transcript);
    };
    r.onerror = (ev) => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') ergebnis = null;
    };
    r.onend = () => {
      if (aktiv === r) aktiv = null;
      fertig(ergebnis);
    };
    aktiv = r;
    r.start();
  });
}

const ZAHLWOERTER = {
  null: 0, eins: 1, ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
  elf: 11, zwölf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19, zwanzig: 20,
  dreißig: 30, vierzig: 40, fünfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90, hundert: 100,
};
const BUCHSTABENNAMEN = {
  a: 'a', ah: 'a', be: 'b', bee: 'b', ce: 'c', de: 'd', e: 'e', eh: 'e', ef: 'f', eff: 'f', ge: 'g', ha: 'h', i: 'i', ih: 'i',
  jot: 'j', ka: 'k', el: 'l', ell: 'l', em: 'm', emm: 'm', en: 'n', o: 'o', oh: 'o', pe: 'p', ku: 'q', er: 'r', es: 's', te: 't',
  u: 'u', uh: 'u', vau: 'v', we: 'w', ix: 'x', ypsilon: 'y', zet: 'z', ä: 'ä', ö: 'ö', ü: 'ü',
};

const normal = (t) => t.toLowerCase().replace(/[.,!?;:„“"']/g, ' ').replace(/\s+/g, ' ').trim();
const woerter = (t) => normal(t).split(' ').filter(Boolean);

// Zahlen aus dem Gesprochenen (Ziffern oder Zahlwörter, auch „einundzwanzig“)
function zahlen(t) {
  const out = new Set();
  for (const wort of woerter(t)) {
    if (/^\d+$/.test(wort)) out.add(Number(wort));
    else if (wort in ZAHLWOERTER) out.add(ZAHLWOERTER[wort]);
    else {
      const m = wort.match(/^(\w+?)und(\w+)$/);
      if (m && m[1] in ZAHLWOERTER && m[2] in ZAHLWOERTER) out.add(ZAHLWOERTER[m[1]] + ZAHLWOERTER[m[2]]);
    }
  }
  return out;
}

function passt(gesprochen, kandidat) {
  const { art, text } = kandidat;
  if (art === 'zahl') return zahlen(gesprochen).has(Number(text));
  if (art === 'geld') {
    const z = zahlen(gesprochen);
    const cent = Number(text);
    return z.has(cent) || (cent % 100 === 0 && z.has(cent / 100)) || (/euro/.test(normal(gesprochen)) && z.has(Math.floor(cent / 100)) && (cent % 100 === 0 || z.has(cent % 100)));
  }
  if (art === 'buchstabe') {
    const ziel = text.toLowerCase();
    return woerter(gesprochen).some((wort) => wort === ziel || BUCHSTABENNAMEN[wort] === ziel);
  }
  if (art === 'wahl') {
    const g = normal(gesprochen);
    if (text === 'stimmt nicht') return /stimmt nicht|nein|falsch/.test(g);
    if (text === 'stimmt') return !/stimmt nicht|nein|falsch/.test(g) && /stimmt|ja|richtig/.test(g);
    return g.includes(text);
  }
  // Wörter: alle Wörter der Antwort müssen vorkommen
  const alsZahl = (wort) => (wort in ZAHLWOERTER ? String(ZAHLWOERTER[wort]) : wort);
  const g = ` ${woerter(gesprochen).map(alsZahl).join(' ')} `;
  return woerter(text).map(alsZahl).every((wort) => g.includes(` ${wort} `));
}

// Findet genau ein passendes Antwortfeld. kandidaten: [{ art, text, el }]
export function findeAntwort(varianten, kandidaten) {
  for (const v of varianten) {
    const treffer = kandidaten.filter((k) => passt(v, k));
    if (treffer.length === 1) return { kandidat: treffer[0], gesprochen: v };
    if (treffer.length > 1) {
      // Bei mehreren Treffern (z. B. „Viertel nach 3“ und „Viertel nach 4“) gewinnt der längste Text
      const laengster = [...treffer].sort((a, b) => b.text.length - a.text.length);
      if (laengster[0].text.length > laengster[1].text.length) return { kandidat: laengster[0], gesprochen: v };
    }
  }
  return null;
}
