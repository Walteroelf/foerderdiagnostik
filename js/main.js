import { speicher } from './storage.js';
import { erzeugePseudonym, siehtAusWiePseudonym, schoenesPseudonym } from './pseudonym.js';
import { sprich, stopp, spracheVerfuegbar, deutscheStimmen, setzeStimme, aktuelleStimme, tempo, setzeTempo } from './sprache.js';
import {
  initSymbole, bildElement, wortInfo, anzahlBilder, speichereBild, loescheSatz, wortAusDateiname, ladeArasaac,
} from './symbole.js';
import { Testlauf } from './testlauf.js';
import { schuelerText, bogenText, gesamtText, dateiname } from './protokoll.js';

const daten = {};
const app = document.getElementById('app');

// ---------- Hilfsfunktionen ----------
function h(tag, attrs = {}, ...kinder) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kind of kinder.flat()) {
    if (kind == null || kind === false) continue;
    el.append(kind instanceof Node ? kind : String(kind));
  }
  return el;
}

function zeige(...knoten) {
  stopp();
  app.replaceChildren(...knoten);
  window.scrollTo(0, 0);
  aktualisiereFuss();
}

const knopf = (text, onclick, klasse = 'knopf') => h('button', { class: klasse, type: 'button', onclick }, text);

const kopf = (titel, zurueck) =>
  h('header', { class: 'kopf' },
    zurueck ? knopf('← Zurück', zurueck, 'knopf klein leise') : h('span'),
    h('h1', {}, titel),
    h('span'));

const vorlesen = (text) =>
  h('button', { class: 'vorlesen', type: 'button', 'aria-label': 'Vorlesen', onclick: () => sprich(text) }, '🔊');

function hinweisSpeicher() {
  return h('p', { class: 'hinweis' },
    '⚠️ Die Daten liegen nur in diesem Browser. Wenn die Safari-Daten gelöscht werden, sind sie weg. ',
    'Bitte das Protokoll zusätzlich als Datei sichern.');
}

function aktualisiereFuss() {
  const fuss = document.getElementById('fuss');
  const teile = ['Informelles Förderdiagnostik-Werkzeug, ersetzt keine standardisierte Diagnostik. Alle Daten bleiben auf diesem Gerät.'];
  if (anzahlBilder('arasaac')) {
    teile.push('Piktogramme: Sergio Palao. Herkunft: ARASAAC (https://arasaac.org). Lizenz: CC BY-NC-SA 4.0. Eigentum: Regierung von Aragonien (Spanien).');
  }
  fuss.replaceChildren(...teile.map((t) => h('p', {}, t)));
}

function laden(name, inhalt, typ) {
  const blob = new Blob([inhalt], { type: typ });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function kopieren(text, knopfEl) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = h('textarea', {}, text);
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  const alt = knopfEl.textContent;
  knopfEl.textContent = '✓ Kopiert';
  setTimeout(() => (knopfEl.textContent = alt), 2000);
}

// ---------- Startseite ----------
function startseite() {
  zeige(
    h('main', { class: 'start' },
      h('h1', { class: 'titel' }, 'Förderdiagnostik'),
      h('p', { class: 'unter' }, 'Lesen · Rechtschreibung · Mathe'),
      h('div', { class: 'kacheln' },
        h('button', { class: 'kachel kind', type: 'button', onclick: () => pseudonymSeite('schueler') },
          h('span', { class: 'gross' }, '🧒'), 'Schülermodus', h('small', {}, 'Das Kind bearbeitet Aufgaben')),
        h('button', { class: 'kachel', type: 'button', onclick: () => pseudonymSeite('lehrkraft') },
          h('span', { class: 'gross' }, '📋'), 'Lehrkraftmodus', h('small', {}, 'Kompetenzbogen ausfüllen'))),
      knopf('Protokolle und Einstellungen', verwaltung, 'knopf leise'),
      !spracheVerfuegbar() && h('p', { class: 'hinweis' }, 'Dieser Browser hat keine Sprachausgabe. Bitte Safari verwenden.')));
}

// ---------- Pseudonym ----------
function pseudonymSeite(modus) {
  const weiter = (p) => {
    speicher.merkePseudonym(p);
    if (modus === 'schueler') bereichSeite(p);
    else bogenSeite(p);
  };
  const neu = () => {
    let p = erzeugePseudonym(speicher.pseudonyme());
    const anzeige = h('div', { class: 'pseudonym' }, p);
    zeige(
      kopf('Neues Pseudonym', () => pseudonymSeite(modus)),
      h('main', { class: 'mitte' },
        h('p', {}, 'Bitte notiere dieses Pseudonym auf deinem Zettel:'),
        anzeige,
        h('div', { class: 'reihe' },
          knopf('🔄 Anderes', () => {
            p = erzeugePseudonym(speicher.pseudonyme());
            anzeige.textContent = p;
          }, 'knopf leise'),
          knopf('Notiert, weiter', () => weiter(p)))));
  };
  const vorhanden = () => {
    const bekannt = speicher.pseudonyme();
    const feld = h('input', { type: 'text', class: 'eingabe', list: 'bekannte', autocomplete: 'off', autocapitalize: 'words', placeholder: 'z. B. Blauer Fuchs 47' });
    const meldung = h('p', { class: 'hinweis', hidden: true });
    const pruefe = () => {
      const p = schoenesPseudonym(feld.value);
      if (!p) return;
      if (!siehtAusWiePseudonym(p) && !meldung.dataset.bestaetigt) {
        meldung.hidden = false;
        meldung.textContent = 'Das sieht nicht wie ein Pseudonym aus dieser App aus. Bitte keine echten Namen eingeben. Zum Fortfahren noch einmal tippen.';
        meldung.dataset.bestaetigt = '1';
        return;
      }
      weiter(p);
    };
    zeige(
      kopf('Pseudonym eingeben', () => pseudonymSeite(modus)),
      h('main', { class: 'mitte' },
        h('label', {}, 'Pseudonym vom Zettel:', feld),
        h('datalist', { id: 'bekannte' }, bekannt.map((b) => h('option', { value: b }))),
        meldung,
        knopf('Weiter', pruefe),
        bekannt.length ? h('div', { class: 'liste' },
          h('p', {}, 'Auf diesem iPad schon verwendet:'),
          bekannt.map((b) => knopf(b, () => weiter(b), 'knopf leise'))) : null));
    feld.focus();
  };
  zeige(
    kopf(modus === 'schueler' ? 'Schülermodus' : 'Lehrkraftmodus', startseite),
    h('main', { class: 'mitte' },
      h('div', { class: 'kacheln' },
        h('button', { class: 'kachel', type: 'button', onclick: neu }, h('span', { class: 'gross' }, '✨'), 'Neues Pseudonym'),
        h('button', { class: 'kachel', type: 'button', onclick: vorhanden }, h('span', { class: 'gross' }, '🔑'), 'Vorhandenes eingeben')),
      modus === 'lehrkraft' && h('p', { class: 'unter' }, 'Nimm dasselbe Pseudonym wie im Schülermodus, damit die Protokolle zusammenpassen.')));
}

// ---------- Schülermodus ----------
function bereichSeite(p) {
  const bereiche = [
    { id: 'lesen', titel: 'Lesen', symbol: '📖', bereit: true },
    { id: 'rechtschreibung', titel: 'Schreiben', symbol: '✏️', bereit: true },
    { id: 'mathe', titel: 'Mathe', symbol: '🔢', bereit: true },
  ];
  zeige(
    kopf(p, startseite),
    h('main', { class: 'mitte' },
      h('h2', {}, 'Was möchtest du machen?'),
      h('div', { class: 'kacheln' },
        bereiche.map((b) =>
          h('button', { class: 'kachel', type: 'button', disabled: !b.bereit, onclick: () => stufeSeite(p, daten[b.id]) },
            h('span', { class: 'gross' }, b.symbol), b.titel, !b.bereit && h('small', {}, 'folgt bald'))))));
}

function stufeSeite(p, def) {
  zeige(
    kopf(`${def.titel}: Einstiegsstufe`, () => bereichSeite(p)),
    h('main', { class: 'mitte' },
      h('p', { class: 'unter' }, 'Für die Lehrkraft: Mit welcher Stufe soll das Kind beginnen? Die App passt die Stufe danach selbst an.'),
      h('div', { class: 'stufen' },
        def.stufen.map((s) =>
          h('button', { class: 'stufe', type: 'button', disabled: !s.aufgaben.length, onclick: () => testStarten(p, def, s.stufe) },
            h('strong', {}, `Stufe ${s.stufe}`), h('span', {}, s.name), !s.aufgaben.length && h('small', {}, 'folgt bald'))))));
}

function testStarten(p, def, stufe) {
  const lauf = new Testlauf(def, p, stufe);
  zeige(
    h('main', { class: 'mitte kindansicht' },
      h('div', { class: 'pseudonym klein' }, '🌟'),
      h('h2', {}, 'Hallo! Los geht\'s.'),
      h('p', {}, 'Hör gut zu und tippe auf die richtige Antwort.'),
      knopf('Start', () => aufgabeSeite(lauf), 'knopf riesig')));
  sprich('Hallo! Hör gut zu und tippe auf die richtige Antwort. Tippe auf Start.');
}

function anweisung(a) {
  const w = (k) => wortInfo(k).wort;
  switch (a.typ) {
    case 'zuordnen':
      return { text: 'Was passt zusammen?', sprache: 'Schau dir das Bild an. Was passt dazu? Tippe auf das passende Bild.', vorlage: bildElement(a.ziel, 'foto') };
    case 'buchstabe':
      return { text: 'Hör gut zu. Tippe auf den Buchstaben.', sprache: `Tippe auf das ${a.ziel}.` };
    case 'anlaut':
      return { text: 'Womit fängt das Wort an?', sprache: `${w(a.wort)}. Womit fängt ${w(a.wort)} an? Tippe auf den Buchstaben.`, vorlage: bildElement(a.wort, 'symbol') };
    case 'silben':
      return { text: 'Wie viele Silben? Klatsch mit!', sprache: `${w(a.wort)}. Wie viele Silben hat ${w(a.wort)}? Klatsch mit.`, vorlage: bildElement(a.wort, 'symbol') };
    case 'wortbild':
      return { text: 'Welches Wort passt zum Bild?', sprache: 'Welches Wort passt zum Bild? Lies genau.', vorlage: bildElement(a.wort, 'symbol') };
    case 'buchstabezuordnen':
      return a.art === 'gross'
        ? { text: 'Finde den großen Buchstaben.', sprache: 'Hier ist ein kleiner Buchstabe. Finde den passenden großen Buchstaben.', vorlage: h('span', { class: 'buchstabe' }, a.zeige) }
        : { text: 'Finde den gleichen Buchstaben.', sprache: 'Finde den gleichen Buchstaben.', vorlage: h('span', { class: 'buchstabe' }, a.zeige) };
    case 'legen':
      return { text: 'Schreib das Wort.', sprache: `Schreib das Wort ${w(a.wort)}. Tippe die Buchstaben nacheinander an.` };
    case 'menge':
      return { text: `Wo sind ${a.frage}?`, sprache: `Wo sind ${a.frage}? Tippe auf die Seite mit ${a.frage === 'mehr' ? 'mehr' : 'weniger'} Bildern.` };
    case 'simultan':
      return { text: 'Wie viele Punkte?', sprache: 'Wie viele Punkte siehst du?', vorlage: wuerfel(a.ziel) };
    case 'zahlmenge':
      return { text: `Wo sind ${a.ziel}?`, sprache: `Wo sind ${a.ziel}? Tippe auf das passende Bild.`, vorlage: h('span', { class: 'zahl-gross' }, a.ziel) };
    case 'rechnen': {
      const wort = a.op === '+' ? 'plus' : 'minus';
      return {
        text: 'Rechne.',
        sprache: `Wie viel ist ${a.a} ${wort} ${a.b}?`,
        vorlage: a.bilder
          ? h('span', { class: 'rechenbild-mit-text' }, rechenBild(a), h('span', { class: 'rechentext' }, `${a.a} ${a.op === '-' ? '−' : '+'} ${a.b} = ?`))
          : h('span', { class: 'rechentext gross' }, `${a.a} ${a.op === '-' ? '−' : '+'} ${a.b} = ?`),
      };
    }
    default:
      return { text: '', sprache: '' };
  }
}

function optionInhalt(a, o) {
  switch (a.typ) {
    case 'zuordnen':
      return [o, bildElement(o, 'symbol')];
    case 'buchstabe':
    case 'anlaut':
      return [o, h('span', { class: 'buchstabe' }, o)];
    case 'silben':
      return [o, h('span', { class: 'silben' }, h('span', { class: 'zahl' }, o), h('span', {}, '👏'.repeat(o)))];
    case 'wortbild':
      return [o.text, h('span', { class: 'wort' }, o.text)];
    case 'buchstabezuordnen':
    case 'simultan':
    case 'rechnen':
      return [o, h('span', { class: 'buchstabe' }, o)];
    case 'menge':
      return [o, menge(o === 'links' ? a.links : a.rechts, a.ding)];
    case 'zahlmenge':
      return [o, menge(o, a.ding)];
    default:
      return [o, String(o)];
  }
}

function menge(n, ding) {
  return h('span', { class: 'menge', 'aria-label': `${n} Bilder` },
    Array.from({ length: n }, () => h('span', {}, wortInfo(ding).emoji)));
}

// Würfelbild: Punkte in fester Anordnung (3×3-Raster)
const WUERFEL = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8], 7: [0, 2, 3, 4, 5, 6, 8] };
function wuerfel(n) {
  const an = new Set(WUERFEL[n] || []);
  return h('span', { class: 'wuerfel', 'aria-label': `${n} Punkte` },
    Array.from({ length: 9 }, (_, i) => h('span', { class: an.has(i) ? 'punkt' : '' })));
}

function rechenBild(a) {
  const e = wortInfo(a.ding).emoji;
  if (a.op === '+') {
    return h('span', { class: 'rechenbild' }, menge(a.a, a.ding), h('span', { class: 'op' }, '+'), menge(a.b, a.ding));
  }
  return h('span', { class: 'rechenbild' },
    h('span', { class: 'menge' }, Array.from({ length: a.a }, (_, i) => h('span', { class: i >= a.a - a.b ? 'weg' : '' }, e))));
}

// Schreiben: Wort aus Buchstabenkärtchen legen
function legenSeite(lauf, a, anw, fertig) {
  const kaertchen = [...a.teile, ...a.extra]
    .map((t, i) => ({ t: i === 0 ? t : t.toLowerCase(), id: i }))
    .sort(() => Math.random() - 0.5);
  const gelegt = [];
  const zeile = h('div', { class: 'gelegt' });
  const knoepfe = kaertchen.map((k) => {
    const el = h('button', { class: 'kaertchen', type: 'button' }, k.t);
    el.addEventListener('click', () => {
      gelegt.push({ k, el });
      el.disabled = true;
      male();
    });
    return el;
  });
  const male = () => {
    zeile.replaceChildren(...(gelegt.length ? gelegt.map((g) => h('span', { class: 'teil' }, g.k.t)) : [h('span', { class: 'leer' }, '…')]));
  };
  male();
  const loeschen = knopf('⌫', () => {
    const g = gelegt.pop();
    if (g) g.el.disabled = false;
    male();
  }, 'knopf leise gross-knopf');
  const ok = knopf('✓ Fertig', () => fertig(gelegt.map((g) => g.k.t).join('|')), 'knopf gross-knopf');
  return [
    h('div', { class: 'vorlage klein' }, bildElement(a.wort, 'symbol')),
    h('div', { class: 'legezeile' }, zeile, loeschen),
    h('div', { class: 'kaertchen-feld' }, knoepfe),
    ok,
  ];
}

const LOB = ['Danke!', 'Prima, weiter geht\'s!', 'Toll, wie du arbeitest!', 'Super, weiter so!', 'Gut gemacht!'];

function aufgabeSeite(lauf) {
  const a = lauf.aufgabe;
  const anw = anweisung(a);
  const gesamt = lauf.block.length;
  let start = performance.now();
  let gewaehlt = false;

  const waehle = (wert, el) => {
    if (gewaehlt) return;
    gewaehlt = true;
    el.classList.add('gewaehlt');
    lauf.antworte(wert, performance.now() - start);
    const lob = LOB[Math.floor(Math.random() * LOB.length)];
    app.append(h('div', { class: 'lob' }, h('span', {}, '⭐'), lob));
    setTimeout(() => weiter(lauf), 900);
  };

  const optionen = a.typ === 'legen' ? [] : a.optionen.map((o) => {
    const [wert, inhalt] = optionInhalt(a, o);
    const el = h('button', { class: `option typ-${a.typ}`, type: 'button' }, inhalt);
    el.addEventListener('click', () => waehle(wert, el));
    return el;
  });

  zeige(
    h('div', { class: 'testleiste' },
      h('div', { class: 'sterne', 'aria-label': `Aufgabe ${lauf.index + 1} von ${gesamt}` },
        Array.from({ length: gesamt }, (_, i) => h('span', { class: i < lauf.index ? 'an' : '' }, '★'))),
      knopf('Beenden', () => {
        if (confirm('Test beenden? Das Protokoll enthält dann nur die bisherigen Aufgaben.')) testEnde(lauf, true);
      }, 'knopf klein leise')),
    h('main', { class: 'aufgabe' },
      h('div', { class: 'anweisung' }, vorlesen(anw.sprache), h('p', {}, anw.text)),
      anw.vorlage && h('div', { class: `vorlage${a.typ === 'rechnen' || a.typ === 'menge' ? ' breit' : ''}` }, anw.vorlage),
      a.typ === 'legen'
        ? legenSeite(lauf, a, anw, (wert) => waehle(wert, document.querySelector('.legezeile')))
        : h('div', { class: `optionen anzahl-${optionen.length} typ-${a.typ}` }, optionen)));
  // Zeit erst nach der Anweisung messen
  setTimeout(() => {
    sprich(anw.sprache);
    start = performance.now();
  }, 250);
}

function weiter(lauf) {
  if (!lauf.blockFertig) return aufgabeSeite(lauf);
  const naechste = lauf.naechsteStufe();
  if (naechste == null) return testEnde(lauf, false);
  zeige(
    h('main', { class: 'mitte kindansicht' },
      h('div', { class: 'pseudonym klein' }, '🎈'),
      h('h2', {}, 'Super! Jetzt kommen neue Aufgaben.'),
      knopf('Weiter', () => {
        lauf.starteStufe(naechste);
        aufgabeSeite(lauf);
      }, 'knopf riesig')));
  sprich('Super! Jetzt kommen neue Aufgaben. Tippe auf Weiter.');
}

function testEnde(lauf, abgebrochen) {
  const ergebnis = lauf.abschliessen(abgebrochen);
  const gespeichert = speicher.speichereTest(ergebnis);
  zeige(
    h('main', { class: 'mitte kindansicht' },
      h('div', { class: 'pseudonym klein' }, '🏆'),
      h('h2', {}, 'Geschafft! Das hast du toll gemacht.'),
      !gespeichert && h('p', { class: 'hinweis' }, 'Speichern im Browser nicht möglich. Bitte das Protokoll jetzt als Datei sichern.'),
      knopf('Für die Lehrkraft: Protokoll', () => schuelerProtokollSeite(ergebnis, startseite), 'knopf leise')));
  sprich('Geschafft! Das hast du toll gemacht.');
}

// ---------- Protokollanzeige ----------
function protokollSeite({ titel, text, json, basis, zurueck }) {
  const kopierKnopf = knopf('📋 In Zwischenablage kopieren', () => kopieren(text, kopierKnopf));
  const teilen = async () => {
    const datei = new File([JSON.stringify(json, null, 2)], basis + '.json', { type: 'application/json' });
    try {
      await navigator.share({ files: [datei], title: titel });
    } catch {
      /* abgebrochen */
    }
  };
  const kannTeilen = navigator.canShare?.({ files: [new File(['x'], 'x.json', { type: 'application/json' })] });
  zeige(
    kopf(titel, zurueck),
    h('main', { class: 'protokoll' },
      h('div', { class: 'reihe' },
        kopierKnopf,
        knopf('💾 Als Text speichern (.md)', () => laden(basis + '.md', text, 'text/markdown'), 'knopf leise'),
        knopf('💾 Als Datei speichern (.json)', () => laden(basis + '.json', JSON.stringify(json, null, 2), 'application/json'), 'knopf leise'),
        kannTeilen && knopf('📤 Teilen / in Dateien sichern', teilen, 'knopf leise')),
      hinweisSpeicher(),
      h('pre', { class: 'text' }, text),
      knopf('Zur Startseite', startseite, 'knopf leise')));
}

function schuelerProtokollSeite(test, zurueck) {
  protokollSeite({
    titel: 'Schülerprotokoll',
    text: schuelerText(test, speicher.tests(test.pseudonym)),
    json: test,
    basis: dateiname('schuelerprotokoll', test.pseudonym, test.bereich, '').replace(/\.$/, ''),
    zurueck,
  });
}

function bogenProtokollSeite(bogen, zurueck) {
  protokollSeite({
    titel: 'Kompetenzprotokoll',
    text: bogenText(bogen, daten.bogen),
    json: bogen,
    basis: dateiname('kompetenzprotokoll', bogen.pseudonym, '', '').replace(/\.$/, ''),
    zurueck,
  });
}

// ---------- Lehrkraftmodus: Kompetenzbogen ----------
function bogenSeite(p) {
  const def = daten.bogen;
  const bogen = speicher.bogen(p) || {
    typ: 'kompetenzprotokoll', version: 1, pseudonym: p, erstellt: new Date().toISOString(), aktualisiert: new Date().toISOString(), antworten: {}, notizen: {},
  };
  const status = h('span', { class: 'status' }, speicher.bogen(p) ? 'Vorhandener Bogen geladen.' : 'Neuer Bogen.');
  const sichern = () => {
    bogen.aktualisiert = new Date().toISOString();
    status.textContent = speicher.speichereBogen(bogen) ? '✓ Gespeichert' : 'Speichern nicht möglich, bitte als Datei sichern.';
  };

  const bereiche = def.bereiche.map((b) => {
    const zeilen = b.items.map((item) => {
      const key = `${b.id}.${item.id}`;
      if (item.typ === 'text') {
        const ta = h('textarea', { rows: 3, placeholder: item.platzhalter || '' }, bogen.antworten[key] || '');
        ta.addEventListener('input', () => {
          bogen.antworten[key] = ta.value.trim();
          sichern();
        });
        return h('label', { class: 'textzeile' }, item.text, ta);
      }
      const optionen = item.optionen || def.standardSkala;
      const knoepfe = optionen.map((o) => {
        const el = h('button', { type: 'button', class: 'wahl' + (bogen.antworten[key] === o ? ' an' : '') }, o);
        el.addEventListener('click', () => {
          const neu = bogen.antworten[key] === o ? null : o;
          if (neu) bogen.antworten[key] = neu;
          else delete bogen.antworten[key];
          knoepfe.forEach((k) => k.classList.toggle('an', k.textContent === neu));
          sichern();
        });
        return el;
      });
      return h('div', { class: 'zeile' }, h('span', { class: 'frage' }, item.text), h('div', { class: 'wahlen' }, knoepfe));
    });
    const hatText = b.items.some((i) => i.typ === 'text');
    let notiz = null;
    if (!hatText) {
      const ta = h('textarea', { rows: 2, placeholder: 'Notiz (optional, ohne identifizierende Angaben)' }, bogen.notizen[b.id] || '');
      ta.addEventListener('input', () => {
        bogen.notizen[b.id] = ta.value.trim();
        sichern();
      });
      notiz = ta;
    }
    return h('section', { class: 'karte' }, h('h2', {}, b.titel), zeilen, notiz);
  });

  zeige(
    kopf(`Kompetenzbogen: ${p}`, startseite),
    h('main', { class: 'bogen' },
      h('p', { class: 'unter' }, 'Antippen zum Auswählen, erneut antippen zum Entfernen. Alles wird automatisch auf diesem iPad gespeichert. ', status),
      bereiche,
      knopf('Fertig: Kompetenzprotokoll anzeigen', () => {
        sichern();
        bogenProtokollSeite(bogen, () => bogenSeite(p));
      })));
}

// ---------- Stimme ----------
function stimmenKarte() {
  const auswahl = h('select', { class: 'auswahl' });
  const fuelle = () => {
    const stimmen = deutscheStimmen();
    const aktiv = aktuelleStimme();
    auswahl.replaceChildren(...(stimmen.length
      ? stimmen.map((v) => h('option', { value: v.voiceURI, selected: aktiv && v.voiceURI === aktiv.voiceURI }, v.name))
      : [h('option', {}, 'Keine deutsche Stimme gefunden')]));
  };
  fuelle();
  window.speechSynthesis?.addEventListener?.('voiceschanged', fuelle);
  auswahl.addEventListener('change', () => {
    setzeStimme(auswahl.value);
    sprich('Hallo! So klinge ich.');
  });
  const regler = h('input', { type: 'range', min: '0.6', max: '1.2', step: '0.05', value: String(tempo()) });
  regler.addEventListener('change', () => {
    setzeTempo(regler.value);
    sprich('Hallo! So schnell spreche ich.');
  });
  return h('section', { class: 'karte' },
    h('h2', {}, 'Vorlesestimme'),
    h('label', { class: 'textzeile' }, 'Stimme', auswahl),
    h('label', { class: 'textzeile' }, 'Sprechtempo', regler),
    knopf('🔊 Probe hören', () => sprich('Hallo! Hör gut zu und tippe auf die richtige Antwort.'), 'knopf klein leise'),
    h('p', { class: 'unter' },
      'Bessere Stimmen auf dem iPad: Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch. ',
      'Dort z. B. „Anna (Premium)“ oder eine „Erweitert“-Stimme laden. Danach Safari neu öffnen und die Stimme hier auswählen. ',
      'Die beste verfügbare Stimme wird automatisch genommen.'));
}

// ---------- Verwaltung ----------
function verwaltung() {
  const liste = speicher.pseudonyme().map((p) => {
    const tests = speicher.tests(p);
    const bogen = speicher.bogen(p);
    const tag = (iso) => new Date(iso).toLocaleDateString('de-DE');
    return h('section', { class: 'karte' },
      h('h2', {}, p),
      tests.length
        ? h('ul', { class: 'eintraege' }, tests.map((t) =>
          h('li', {},
            h('span', {}, `${tag(t.datum)} · ${t.bereichTitel} · sicher: ${t.erreichteStufe ? 'Stufe ' + t.erreichteStufe : 'keine Stufe'}`),
            knopf('Anzeigen', () => schuelerProtokollSeite(t, verwaltung), 'knopf klein leise'))))
        : h('p', { class: 'unter' }, 'Noch kein Schülerprotokoll auf diesem iPad.'),
      h('div', { class: 'reihe' },
        bogen
          ? knopf(`Kompetenzbogen (Stand ${tag(bogen.aktualisiert)})`, () => bogenProtokollSeite(bogen, verwaltung), 'knopf klein leise')
          : h('span', { class: 'unter' }, 'Noch kein Kompetenzbogen.'),
        knopf('Kompetenzbogen bearbeiten', () => bogenSeite(p), 'knopf klein leise'),
        knopf('Gesamtprotokoll', () => {
          if (!tests.length || !bogen) {
            alert('Für das Gesamtprotokoll braucht es ein Schülerprotokoll und einen Kompetenzbogen. Importiere die fehlende Datei vom anderen iPad.');
            return;
          }
          protokollSeite({
            titel: 'Gesamtprotokoll',
            text: gesamtText(tests, bogen, daten.bogen),
            json: { typ: 'gesamtprotokoll', pseudonym: p, kompetenz: bogen, tests },
            basis: dateiname('gesamtprotokoll', p, '', '').replace(/\.$/, ''),
            zurueck: verwaltung,
          });
        }, 'knopf klein')));
  });

  const importFeld = h('input', { type: 'file', accept: '.json,application/json', multiple: true, hidden: true });
  const importMeldung = h('p', { class: 'status' });
  importFeld.addEventListener('change', async () => {
    let n = 0;
    const fehler = [];
    for (const datei of importFeld.files) {
      try {
        const d = JSON.parse(await datei.text());
        if (d.typ === 'schuelerprotokoll' && d.pseudonym && d.stufen) {
          speicher.speichereTest(d);
          n++;
        } else if (d.typ === 'kompetenzprotokoll' && d.pseudonym && d.antworten) {
          const alt = speicher.bogen(d.pseudonym);
          if (!alt || alt.aktualisiert <= d.aktualisiert || confirm(`Der Kompetenzbogen für ${d.pseudonym} auf diesem iPad ist neuer. Trotzdem ersetzen?`)) {
            speicher.speichereBogen(d);
            n++;
          }
        } else if (d.typ === 'gesamtprotokoll') {
          d.tests?.forEach((t) => speicher.speichereTest(t));
          if (d.kompetenz) speicher.speichereBogen(d.kompetenz);
          n++;
        } else fehler.push(datei.name);
      } catch {
        fehler.push(datei.name);
      }
    }
    verwaltung();
    alert(`${n} Protokoll(e) importiert.` + (fehler.length ? ` Nicht lesbar: ${fehler.join(', ')}` : ''));
  });

  const symbolStatus = h('p', { class: 'status' });
  const zeigeSymbolStatus = () => {
    symbolStatus.textContent = `ARASAAC: ${anzahlBilder('arasaac')} · Eigene Symbole: ${anzahlBilder('eigen')} · Eigene Fotos: ${anzahlBilder('foto')}`;
  };
  zeigeSymbolStatus();
  const bilderImport = (satz) => {
    const feld = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
    feld.addEventListener('change', async () => {
      const unbekannt = [];
      for (const datei of feld.files) {
        const key = wortAusDateiname(datei.name);
        if (key) await speichereBild(satz, key, datei);
        else unbekannt.push(datei.name);
      }
      zeigeSymbolStatus();
      aktualisiereFuss();
      if (unbekannt.length) alert(`Kein passendes Wort gefunden für: ${unbekannt.join(', ')}. Der Dateiname muss dem Wort entsprechen, z. B. „Maus.png“.`);
    });
    document.body.append(feld);
    feld.click();
    setTimeout(() => feld.remove(), 60000);
  };

  zeige(
    kopf('Protokolle und Einstellungen', startseite),
    h('main', { class: 'verwaltung' },
      hinweisSpeicher(),
      h('h2', {}, 'Protokolle auf diesem iPad'),
      liste.length ? liste : h('p', { class: 'unter' }, 'Noch keine Protokolle.'),
      h('section', { class: 'karte' },
        h('h2', {}, 'Protokolle importieren'),
        h('p', { class: 'unter' }, 'JSON-Dateien von einem anderen iPad oder einem früheren Test einlesen, z. B. den Kompetenzbogen vom Lehrkraft-iPad.'),
        importFeld, knopf('Dateien auswählen', () => importFeld.click(), 'knopf leise'), importMeldung),
      stimmenKarte(),
      h('section', { class: 'karte' },
        h('h2', {}, 'Symbole und Fotos'),
        symbolStatus,
        h('p', { class: 'unter' }, 'ARASAAC-Piktogramme einmalig herunterladen (Internet nötig). Danach funktionieren sie offline. Übertragen werden nur die Suchwörter, keine Daten der Kinder.'),
        knopf('ARASAAC-Symbole laden', async (e) => {
          const b = e.currentTarget;
          b.disabled = true;
          const r = await ladeArasaac((i, n) => (b.textContent = `Lade ${i} von ${n} …`));
          b.textContent = 'ARASAAC-Symbole laden';
          b.disabled = false;
          zeigeSymbolStatus();
          aktualisiereFuss();
          alert(`${r.ok} Symbole geladen.` + (r.fehler.length ? ` Nicht gefunden: ${r.fehler.join(', ')}` : ''));
        }, 'knopf leise'),
        h('p', { class: 'unter' }, 'Eigene Symbole (z. B. lizenzierte METACOM-Symbole) oder Fotos: Dateiname = Wort, z. B. „Maus.png“. Sie bleiben nur auf diesem iPad und werden nie veröffentlicht. Fotos erscheinen in Stufe 1 als Vorlage.'),
        h('div', { class: 'reihe' },
          knopf('Eigene Symbole hinzufügen', () => bilderImport('eigen'), 'knopf klein leise'),
          knopf('Eigene Fotos hinzufügen', () => bilderImport('foto'), 'knopf klein leise')),
        h('div', { class: 'reihe' },
          ['arasaac', 'eigen', 'foto'].map((s) =>
            knopf(`${{ arasaac: 'ARASAAC', eigen: 'Eigene Symbole', foto: 'Fotos' }[s]} löschen`, async () => {
              if (!confirm('Wirklich löschen?')) return;
              await loescheSatz(s);
              zeigeSymbolStatus();
              aktualisiereFuss();
            }, 'knopf klein leise'))),
        h('p', { class: 'unter' }, 'Benötigte Wörter: ', Object.keys(daten.woerter).map((k) => wortInfo(k).wort).join(', '))),
      h('section', { class: 'karte' },
        h('h2', {}, 'Daten löschen'),
        knopf('Alle Protokolle auf diesem iPad löschen', () => {
          if (confirm('Alle Protokolle und Kompetenzbögen auf diesem iPad löschen?') && confirm('Sicher? Das kann nicht rückgängig gemacht werden.')) {
            speicher.loescheAlles();
            verwaltung();
          }
        }, 'knopf klein warnung'))));
}

// ---------- Start ----------
async function init() {
  const lade = (pfad) => fetch(pfad).then((r) => r.json());
  const [woerter, lesen, rechtschreibung, mathe, bogen] = await Promise.all(
    ['woerter', 'lesen', 'rechtschreibung', 'mathe', 'kompetenzbogen'].map((n) => lade(`data/${n}.json`)));
  daten.woerter = woerter.woerter;
  daten.lesen = lesen;
  daten.rechtschreibung = rechtschreibung;
  daten.mathe = mathe;
  daten.bogen = bogen;
  await initSymbole(daten.woerter);
  startseite();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init().catch((e) => {
  app.replaceChildren(h('p', { class: 'hinweis' }, 'Die App konnte nicht starten: ' + e.message));
});
