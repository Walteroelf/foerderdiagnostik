// Adaptiver Testablauf: Aufgabenblock je Stufe, danach Stufe hoch, runter oder Ende.
import { wortInfo } from './symbole.js';
import { erzeugeAufgaben, hatAufgaben } from './generatoren.js';
import { beschreibung as bedienungText } from './bedienung.js';

export const SICHER_AB = 0.8; // ab 80 % richtig gilt eine Stufe als sicher
export const UNSICHER_UNTER = 0.5; // unter 50 % geht es eine Stufe zurück

const mische = (liste) => {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Aufgaben auswählen: feste und erzeugte Aufgaben, Aufgabentypen gleichmäßig mischen.
// Aufgaben mit "gruppe" (z. B. mehrere Fragen zu einem Text) bleiben zusammen.
function waehleAufgaben(stufeDef, anzahl) {
  const pool = [...(stufeDef.aufgaben || []), ...erzeugeAufgaben(stufeDef.generatoren)];
  const gesehen = new Set();
  const eindeutig = pool.filter((a) => {
    const k = JSON.stringify(a);
    if (gesehen.has(k)) return false;
    gesehen.add(k);
    return true;
  });
  let out = [];
  if (eindeutig.some((a) => a.gruppe)) {
    const gruppen = {};
    for (const a of eindeutig) (gruppen[a.gruppe || a.typ] ||= []).push(a);
    for (const g of mische(Object.values(gruppen))) {
      if (out.length >= anzahl) break;
      out.push(...g);
    }
  } else {
    const nachTyp = {};
    for (const a of mische(eindeutig)) (nachTyp[a.typ] ||= []).push(a);
    const gruppen = Object.values(nachTyp);
    while (out.length < anzahl && gruppen.some((g) => g.length)) {
      for (const g of gruppen) if (g.length && out.length < anzahl) out.push(g.shift());
    }
    out = mische(out);
  }
  return out.map((a) => ({ ...a, optionen: a.typ === 'menge' ? ['links', 'rechts'] : a.typ === 'satz' ? ['stimmt', 'stimmt nicht'] : mische(a.optionen || []) }));
}

const w = (key) => wortInfo(key).wort;

export const rechne = (a, op, b) => (op === '+' ? a + b : op === '-' ? a - b : a * b);

export const euro = (cent) => (cent % 100 ? (cent / 100).toFixed(2).replace('.', ',') : String(cent / 100)) + ' €';

// Antworten mit Optionsobjekten: richtig ist die Option ohne "fehler" (bzw. mit richtig: true)
function optionsBewertung(aufgabe, gewaehlt) {
  const richtige = aufgabe.optionen.find((o) => o.richtig || (!o.fehler && !aufgabe.optionen.some((x) => x.richtig)));
  const gewaehlteOption = aufgabe.optionen.find((o) => o.text === gewaehlt);
  return { richtige: richtige.text, richtig: gewaehlteOption === richtige, fehlerArt: gewaehlteOption?.fehler };
}

const istTeilfolge = (kurz, lang) => {
  let i = 0;
  for (const x of lang) if (x === kurz[i]) i++;
  return i === kurz.length;
};

// Grobe Fehleranalyse beim Schreiben (Lautebene)
export function schreibFehler(soll, ist) {
  if (!ist.length) return 'Keine Eingabe';
  if (ist.length < soll.length && istTeilfolge(ist, soll)) return 'Laut ausgelassen';
  if (ist.length > soll.length && istTeilfolge(soll, ist)) return 'Laut hinzugefügt';
  if (ist.length === soll.length) {
    if ([...ist].sort().join() === [...soll].sort().join()) return 'Laute vertauscht';
    const unterschiede = soll.filter((x, i) => x !== ist[i]).length;
    return unterschiede === 1 ? 'Laut ersetzt' : 'Mehrere Laute ersetzt';
  }
  return 'Wort stark abweichend';
}

// Beschreibung und Bewertung einer Antwort für das Protokoll
export function bewerte(aufgabe, gewaehlt) {
  switch (aufgabe.typ) {
    case 'zuordnen':
      return {
        aufgabe: `Bild „${w(aufgabe.ziel)}“ dem Symbol zuordnen`,
        richtig: gewaehlt === aufgabe.ziel,
        fehler: `„${w(gewaehlt)}“ statt „${w(aufgabe.ziel)}“ gewählt`,
        fehlerTyp: 'Zuordnung',
      };
    case 'buchstabe':
      return {
        aufgabe: `Buchstabe ${aufgabe.ziel} nach Gehör erkennen`,
        richtig: gewaehlt === aufgabe.ziel,
        fehler: `${gewaehlt} statt ${aufgabe.ziel}`,
        fehlerTyp: 'Buchstabenverwechslung',
      };
    case 'anlaut':
      return {
        aufgabe: `Anlaut von „${w(aufgabe.wort)}“`,
        richtig: gewaehlt === aufgabe.ziel,
        fehler: `${gewaehlt} statt ${aufgabe.ziel}`,
        fehlerTyp: 'Anlaut',
      };
    case 'silben':
      return {
        aufgabe: `Silben zählen „${aufgabe.silbenText}“`,
        richtig: Number(gewaehlt) === aufgabe.ziel,
        fehler: `${gewaehlt} statt ${aufgabe.ziel} Silben`,
        fehlerTyp: 'Silbengliederung',
      };
    case 'wortbild': {
      const richtigesWort = aufgabe.optionen.find((o) => !o.fehler).text;
      const gewaehlteOption = aufgabe.optionen.find((o) => o.text === gewaehlt);
      return {
        aufgabe: `Wort zum Bild „${richtigesWort}“ finden`,
        richtig: !gewaehlteOption?.fehler,
        fehler: `„${gewaehlt}“ statt „${richtigesWort}“`,
        fehlerTyp: `Wortverwechslung (${gewaehlteOption?.fehler || 'unbekannt'})`,
      };
    }
    case 'buchstabezuordnen':
      return {
        aufgabe: aufgabe.art === 'gross' ? `Zu „${aufgabe.zeige}“ den großen Buchstaben finden` : `Gleichen Buchstaben zu „${aufgabe.zeige}“ finden`,
        richtig: gewaehlt === aufgabe.ziel,
        fehler: `${gewaehlt} statt ${aufgabe.ziel}`,
        fehlerTyp: aufgabe.art === 'gross' ? 'Groß-Klein-Zuordnung' : 'Buchstabenverwechslung',
      };
    case 'legen': {
      const soll = aufgabe.teile.map((t) => t.toLowerCase());
      const ist = String(gewaehlt).split('|').filter(Boolean).map((t) => t.toLowerCase());
      const istText = String(gewaehlt).split('|').join('') || '(nichts)';
      return {
        aufgabe: `Wort „${w(aufgabe.wort)}“ legen`,
        richtig: soll.join('|') === ist.join('|'),
        fehler: `„${istText}“ statt „${aufgabe.teile.join('')}“`,
        fehlerTyp: schreibFehler(soll, ist),
      };
    }
    case 'menge': {
      const richtigeSeite =
        (aufgabe.frage === 'mehr') === aufgabe.links > aufgabe.rechts ? 'links' : 'rechts';
      return {
        aufgabe: `Wo sind ${aufgabe.frage}? (${aufgabe.links} gegen ${aufgabe.rechts})`,
        richtig: gewaehlt === richtigeSeite,
        fehler: `${gewaehlt === 'links' ? aufgabe.links : aufgabe.rechts} gewählt`,
        fehlerTyp: `Mengenvergleich (${aufgabe.frage})`,
      };
    }
    case 'simultan': {
      const diff = Math.abs(Number(gewaehlt) - aufgabe.ziel);
      return {
        aufgabe: `${aufgabe.ziel} Punkte erfassen`,
        richtig: diff === 0,
        fehler: `${gewaehlt} statt ${aufgabe.ziel}`,
        fehlerTyp: diff === 1 ? 'Mengenerfassung (um 1 daneben)' : 'Mengenerfassung',
      };
    }
    case 'zahlmenge':
      return {
        aufgabe: `Zur Zahl ${aufgabe.ziel} die Menge finden`,
        richtig: Number(gewaehlt) === aufgabe.ziel,
        fehler: `Menge ${gewaehlt} statt ${aufgabe.ziel}`,
        fehlerTyp: 'Zahl-Menge-Zuordnung',
      };
    case 'rechnen': {
      const ziel = rechne(aufgabe.a, aufgabe.op, aufgabe.b);
      const g = Number(gewaehlt);
      const anders = aufgabe.op === '·' ? aufgabe.a + aufgabe.b : rechne(aufgabe.a, aufgabe.op === '+' ? '-' : '+', aufgabe.b);
      const dreh = ziel >= 10 && ziel < 100 ? (ziel % 10) * 10 + Math.floor(ziel / 10) : null;
      let fehlerTyp = 'Rechenfehler';
      if (aufgabe.op === '·' && Math.abs(g - ziel) === aufgabe.b) fehlerTyp = 'Einmaleins: Nachbaraufgabe';
      else if (g === dreh) fehlerTyp = 'Zahlendreher';
      else if (g === anders) fehlerTyp = aufgabe.op === '·' ? 'Plus statt mal' : 'Rechenart verwechselt';
      else if (Math.abs(g - ziel) === 1) fehlerTyp = 'Abweichung um 1 (Hinweis auf Zählfehler)';
      else if (Math.abs(g - ziel) === 10) fehlerTyp = 'Stellenwertfehler (um 10 daneben)';
      return {
        aufgabe: `${aufgabe.a} ${aufgabe.op} ${aufgabe.b}${aufgabe.bilder ? ' (mit Bildern)' : ''}`,
        richtig: g === ziel,
        fehler: `${g} statt ${ziel}`,
        fehlerTyp,
        kategorie: aufgabe.op === '·' ? 'Einmaleins' : aufgabe.bilder ? 'Plus/Minus mit Bildern' : `Plus/Minus bis ${Math.max(ziel, aufgabe.a) > 20 ? 100 : 20}`,
      };
    }
    case 'stellenwert': {
      const ziel = aufgabe.zehner * 10 + aufgabe.einer;
      const g = Number(gewaehlt);
      return {
        aufgabe: `${aufgabe.zehner} Zehner und ${aufgabe.einer} Einer`,
        richtig: g === ziel,
        fehler: `${g} statt ${ziel}`,
        fehlerTyp: g === aufgabe.einer * 10 + aufgabe.zehner ? 'Zahlendreher (Zehner und Einer vertauscht)' : g === aufgabe.zehner + aufgabe.einer ? 'Zehner als Einer gezählt' : 'Stellenwertfehler',
      };
    }
    case 'geld': {
      const g = Number(gewaehlt);
      return {
        aufgabe: `Geld zählen (${aufgabe.stuecke.map(euro).join(' + ')})`,
        richtig: g === aufgabe.ziel,
        fehler: `${euro(g)} statt ${euro(aufgabe.ziel)}`,
        fehlerTyp: 'Geldbetrag falsch',
      };
    }
    case 'textaufgabe':
      return {
        aufgabe: `Textaufgabe: ${aufgabe.text}`,
        richtig: Number(gewaehlt) === aufgabe.ziel,
        fehler: `${gewaehlt} statt ${aufgabe.ziel}`,
        fehlerTyp: 'Textaufgabe',
      };
    case 'uhr':
    case 'schreibweise':
    case 'satz':
    case 'textfrage': {
      if (aufgabe.typ === 'satz') {
        const richtig = (gewaehlt === 'stimmt') === aufgabe.stimmt;
        return { aufgabe: `Satz „${aufgabe.satz}“ (${aufgabe.stimmt ? 'stimmt' : 'stimmt nicht'})`, richtig, fehler: `„${gewaehlt}“ gewählt`, fehlerTyp: 'Satzverständnis' };
      }
      const b = optionsBewertung(aufgabe, gewaehlt);
      const aufgabeText =
        aufgabe.typ === 'uhr' ? `Uhr lesen (${b.richtige})`
          : aufgabe.typ === 'schreibweise' ? `Schreibweise „${b.richtige}“`
            : `Text „${aufgabe.text.slice(0, 30)}…“: ${aufgabe.frage}`;
      return {
        aufgabe: aufgabeText,
        richtig: b.richtig,
        fehler: `„${gewaehlt}“ statt „${b.richtige}“`,
        fehlerTyp: aufgabe.typ === 'textfrage' ? 'Textverständnis' : aufgabe.typ === 'uhr' ? `Uhr: ${b.fehlerArt || 'falsch'}` : `Rechtschreibung: ${b.fehlerArt || 'falsch'}`,
        kategorie: aufgabe.typ === 'schreibweise' ? aufgabe.muster : undefined,
      };
    }
    case 'satzlegen': {
      const soll = aufgabe.woerter;
      const ist = String(gewaehlt).split('|').filter(Boolean);
      const klein = (l) => l.map((x) => x.toLowerCase().replace(/[.!?]/g, ''));
      let fehlerTyp = 'Satz abweichend';
      if (klein(ist).join(' ') === klein(soll).join(' ')) fehlerTyp = 'Großschreibung oder Satzzeichen';
      else if (ist.length === soll.length && [...klein(ist)].sort().join() === [...klein(soll)].sort().join()) fehlerTyp = 'Wortreihenfolge';
      else if (ist.length < soll.length) fehlerTyp = 'Wort ausgelassen';
      else if (ist.some((x) => aufgabe.extra.includes(x))) fehlerTyp = 'Falsche Wortform gewählt';
      return {
        aufgabe: `Diktierter Satz „${aufgabe.satz}“`,
        richtig: ist.join(' ') === soll.join(' '),
        fehler: `„${ist.join(' ') || '(nichts)'}“`,
        fehlerTyp,
      };
    }
    case 'hoeren': {
      const ziele = aufgabe.ziel.split('+');
      const gew = String(gewaehlt).split('+');
      const teilweise = ziele.length > 1 && gew.some((x) => ziele.includes(x));
      const namen = (keys) => keys.map(w).join(' und ');
      return {
        aufgabe: `„${aufgabe.sprache}“`,
        richtig: gewaehlt === aufgabe.ziel,
        fehler: `${namen(gew)} statt ${namen(ziele)} gezeigt`,
        fehlerTyp: teilweise ? 'Hörverstehen: nur eine von zwei Angaben behalten' : `Hörverstehen: ${aufgabe.kategorie}`,
        kategorie: aufgabe.kategorie,
      };
    }
    case 'beschriften': {
      const soll = wortInfo(aufgabe.wort).wort;
      const ist = String(gewaehlt);
      let fehlerTyp = schreibFehler([...soll.toLowerCase()], [...ist.toLowerCase()]);
      if (ist.toLowerCase() === soll.toLowerCase()) fehlerTyp = 'Großschreibung';
      return {
        aufgabe: `Bild beschriften „${soll}“`,
        richtig: ist === soll,
        fehler: `„${ist || '(nichts)'}“ statt „${soll}“`,
        fehlerTyp,
      };
    }
    default:
      return { aufgabe: aufgabe.typ, richtig: false, fehler: String(gewaehlt), fehlerTyp: 'Sonstiges' };
  }
}

export class Testlauf {
  constructor(bereichDef, pseudonym, einstiegsstufe) {
    this.def = bereichDef;
    this.verfuegbar = bereichDef.stufen.filter(hatAufgaben).map((s) => s.stufe);
    this.ergebnis = {
      typ: 'schuelerprotokoll',
      version: 1,
      id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      pseudonym,
      datum: new Date().toISOString(),
      bereich: bereichDef.bereich,
      bereichTitel: bereichDef.titel,
      einstiegsstufe,
      verlauf: [],
      stufen: {},
      erreichteStufe: null,
      abgebrochen: false,
      bedienung: bedienungText(),
    };
    this.starteStufe(einstiegsstufe);
  }

  stufeDef(n) {
    return this.def.stufen.find((s) => s.stufe === n);
  }

  starteStufe(n) {
    const def = this.stufeDef(n);
    this.stufe = n;
    this.block = waehleAufgaben(def, this.def.aufgabenProStufe || 6);
    this.index = 0;
    this.ergebnis.verlauf.push(n);
    this.ergebnis.stufen[n] = { name: def.name, kompetenz: def.kompetenz, antworten: [] };
  }

  get aufgabe() {
    return this.block[this.index];
  }

  get blockFertig() {
    return this.index >= this.block.length;
  }

  antworte(gewaehlt, zeitMs, gesprochen = null) {
    const a = this.aufgabe;
    const b = bewerte(a, gewaehlt);
    this.ergebnis.stufen[this.stufe].antworten.push({
      typ: a.typ,
      aufgabe: b.aufgabe,
      richtig: b.richtig,
      gewaehlt: String(gewaehlt),
      fehler: b.richtig ? null : b.fehler,
      fehlerTyp: b.richtig ? null : b.fehlerTyp,
      kategorie: b.kategorie || null,
      zeitMs: Math.round(zeitMs),
      ...(gesprochen ? { gesprochen } : {}),
    });
    this.index++;
  }

  quote(n) {
    const ant = this.ergebnis.stufen[n]?.antworten || [];
    return ant.length ? ant.filter((x) => x.richtig).length / ant.length : 0;
  }

  // Gibt die nächste Stufe zurück oder null, wenn der Test endet.
  naechsteStufe() {
    const n = this.stufe;
    const q = this.quote(n);
    const besucht = (s) => this.ergebnis.verlauf.includes(s);
    if (q >= SICHER_AB && this.verfuegbar.includes(n + 1) && !besucht(n + 1)) return n + 1;
    if (q < UNSICHER_UNTER && this.verfuegbar.includes(n - 1) && !besucht(n - 1)) return n - 1;
    return null;
  }

  abschliessen(abgebrochen = false) {
    this.ergebnis.abgebrochen = abgebrochen;
    const sicher = Object.keys(this.ergebnis.stufen)
      .map(Number)
      .filter((s) => this.ergebnis.stufen[s].antworten.length && this.quote(s) >= SICHER_AB);
    this.ergebnis.erreichteStufe = sicher.length ? Math.max(...sicher) : null;
    // Nächste Stufe als Förderziel merken
    const naechste = this.def.stufen.find((s) => s.stufe > (this.ergebnis.erreichteStufe || 0) && hatAufgaben(s));
    if (naechste) this.ergebnis.naechsteStufe = { stufe: naechste.stufe, name: naechste.name, kompetenz: naechste.kompetenz };
    return this.ergebnis;
  }
}
