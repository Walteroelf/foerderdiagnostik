// Adaptiver Testablauf: Aufgabenblock je Stufe, danach Stufe hoch, runter oder Ende.
import { wortInfo } from './symbole.js';

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

// Aufgaben auswählen, Aufgabentypen gleichmäßig mischen
function waehleAufgaben(stufeDef, anzahl) {
  const nachTyp = {};
  for (const a of mische(stufeDef.aufgaben)) (nachTyp[a.typ] ||= []).push(a);
  const gruppen = Object.values(nachTyp);
  const out = [];
  while (out.length < anzahl && gruppen.some((g) => g.length)) {
    for (const g of gruppen) if (g.length && out.length < anzahl) out.push(g.shift());
  }
  return mische(out).map((a) => ({ ...a, optionen: a.typ === 'menge' ? ['links', 'rechts'] : mische(a.optionen || []) }));
}

const w = (key) => wortInfo(key).wort;

export const rechne = (a, op, b) => (op === '+' ? a + b : a - b);

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
      const anders = rechne(aufgabe.a, aufgabe.op === '+' ? '-' : '+', aufgabe.b);
      return {
        aufgabe: `${aufgabe.a} ${aufgabe.op} ${aufgabe.b}${aufgabe.bilder ? ' (mit Bildern)' : ''}`,
        richtig: g === ziel,
        fehler: `${g} statt ${ziel}`,
        fehlerTyp: Math.abs(g - ziel) === 1 ? 'Abweichung um 1 (Hinweis auf Zählfehler)' : g === anders ? 'Rechenart verwechselt' : 'Rechenfehler',
      };
    }
    default:
      return { aufgabe: aufgabe.typ, richtig: false, fehler: String(gewaehlt), fehlerTyp: 'Sonstiges' };
  }
}

export class Testlauf {
  constructor(bereichDef, pseudonym, einstiegsstufe) {
    this.def = bereichDef;
    this.verfuegbar = bereichDef.stufen.filter((s) => s.aufgaben.length).map((s) => s.stufe);
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

  antworte(gewaehlt, zeitMs) {
    const a = this.aufgabe;
    const b = bewerte(a, gewaehlt);
    this.ergebnis.stufen[this.stufe].antworten.push({
      typ: a.typ,
      aufgabe: b.aufgabe,
      richtig: b.richtig,
      gewaehlt: String(gewaehlt),
      fehler: b.richtig ? null : b.fehler,
      fehlerTyp: b.richtig ? null : b.fehlerTyp,
      zeitMs: Math.round(zeitMs),
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
    return this.ergebnis;
  }
}
