import { h, knopf } from './dom.js';
import { anweisung, optionInhalt, legenSeite, satzLegenSeite, tastaturSeite, vorlageKlasse } from './aufgaben.js';
import { aktivierbar, neueSeite, scanStopp, einstellungen, speichereEinstellungen, wendeAn } from './bedienung.js';
import { speicher } from './storage.js';
import { erzeugePseudonym, siehtAusWiePseudonym, schoenesPseudonym } from './pseudonym.js';
import { sprich, stopp, spracheVerfuegbar, deutscheStimmen, setzeStimme, aktuelleStimme, tempo, setzeTempo } from './sprache.js';
import {
  initSymbole, bildElement, wortInfo, anzahlBilder, speichereBild, loescheSatz, wortAusDateiname, ladeArasaac,
} from './symbole.js';
import { Testlauf } from './testlauf.js';
import { hatAufgaben } from './generatoren.js';
import { schuelerText, bogenText, gesamtText, lautleseText, dateiname } from './protokoll.js';
import { schuetze, pinGesetzt, setzePin, entfernePin, pinDialog } from './sperre.js';
import { eigeneWoerter, eigeneTexte, speichereWort, loescheWort, speichereText, loescheText, schluesselFuer } from './eigenes.js';
import { erstellePaket, importierePaket, zusammenfassung, zeigeQr, starteScanner } from './uebertragung.js';

const daten = {};
const app = document.getElementById('app');

// ---------- Hilfsfunktionen ----------
function zeige(...knoten) {
  stopp();
  scanStopp();
  app.replaceChildren(...knoten);
  window.scrollTo(0, 0);
  aktualisiereFuss();
}

const kopf = (titel, zurueck) =>
  h('header', { class: 'kopf' },
    zurueck ? knopf('← Zurück', zurueck, 'knopf klein leise') : h('span'),
    h('h1', {}, titel),
    h('span'));

// Knopf für die Lehrkraft: öffnet sich nur per PIN oder durch langes Drücken
const lehrkraftKnopf = (text, fn, klasse = 'knopf klein leise') => schuetze(h('button', { class: klasse, type: 'button' }, text), fn);

// Alle Vorlesetexte: mitgelieferte und eigene
const alleTexte = () => [...daten.lautlesen.texte, ...eigeneTexte()];

// Großer Knopf in der Kinderansicht (auch per Taster/Haltezeit bedienbar)
const kinderKnopf = (text, fn) => aktivierbar(h('button', { class: 'knopf riesig', type: 'button' }, text), fn);

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
        schuetze(h('button', { class: 'kachel', type: 'button' },
          h('span', { class: 'gross' }, '📋'), 'Lehrkraftmodus', h('small', {}, pinGesetzt() ? 'mit PIN' : 'lange drücken')), () => pseudonymSeite('lehrkraft'))),
      lehrkraftKnopf('Protokolle und Einstellungen', verwaltung, 'knopf leise'),
      !spracheVerfuegbar() && h('p', { class: 'hinweis' }, 'Dieser Browser hat keine Sprachausgabe. Bitte Safari verwenden.')));
}

// ---------- Pseudonym ----------
function pseudonymSeite(modus) {
  const weiter = (p) => {
    speicher.merkePseudonym(p);
    if (modus === 'schueler') bereichSeite(p);
    else lehrkraftMenue(p);
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
  const vorlesen = h('button', { class: 'kachel', type: 'button', onclick: () => vorleseAuswahl(p) },
    h('span', { class: 'gross' }, '🗣️'), 'Vorlesen', h('small', {}, 'Text zum lauten Lesen'));
  zeige(
    kopf(p, startseite),
    h('main', { class: 'mitte' },
      h('h2', {}, 'Was möchtest du machen?'),
      h('div', { class: 'kacheln' },
        bereiche.map((b) =>
          h('button', { class: 'kachel', type: 'button', disabled: !b.bereit, onclick: () => stufeSeite(p, daten[b.id]) },
            h('span', { class: 'gross' }, b.symbol), b.titel, !b.bereit && h('small', {}, 'folgt bald'))), vorlesen)));
}

// Schülermodus: Text zum lauten Lesen, ohne Bedienelemente für das Kind
function vorleseAuswahl(p) {
  zeige(
    kopf('Vorlesen: Text wählen', () => bereichSeite(p)),
    h('main', { class: 'mitte' },
      h('p', { class: 'unter' }, 'Für die Lehrkraft: Wähle denselben Text wie auf deinem iPad im Lehrkraftmodus.'),
      h('div', { class: 'stufen' },
        alleTexte().map((t) =>
          h('button', { class: 'stufe', type: 'button', onclick: () => vorleseText(p, t) },
            h('strong', {}, t.niveau), h('span', {}, t.titel))))));
}

function vorleseText(p, t) {
  zeige(
    h('div', { class: 'testleiste' }, h('span'), lehrkraftKnopf('Fertig', () => bereichSeite(p))),
    h('main', { class: 'kindtext' }, h('h2', {}, t.titel), h('p', {}, t.text)));
}

// Druckfassung des Lesetextes für das Kind (große Schrift)
function druckeText(t) {
  document.getElementById('druck')?.remove();
  document.body.append(h('div', { id: 'druck' }, h('h1', {}, t.titel), h('p', {}, t.text)));
  window.print();
}

function stufeSeite(p, def) {
  zeige(
    kopf(`${def.titel}: Einstiegsstufe`, () => bereichSeite(p)),
    h('main', { class: 'mitte' },
      h('p', { class: 'unter' }, 'Für die Lehrkraft: Mit welcher Stufe soll das Kind beginnen? Die App passt die Stufe danach selbst an.'),
      h('div', { class: 'stufen' },
        def.stufen.map((s) =>
          h('button', { class: 'stufe', type: 'button', disabled: !hatAufgaben(s), onclick: () => testStarten(p, def, s.stufe) },
            h('strong', {}, `Stufe ${s.stufe}`), h('span', {}, s.name), !hatAufgaben(s) && h('small', {}, 'folgt bald'))))));
}

function testStarten(p, def, stufe) {
  const lauf = new Testlauf(def, p, stufe);
  zeige(
    h('main', { class: 'mitte kindansicht' },
      h('div', { class: 'pseudonym klein' }, '🌟'),
      h('h2', {}, 'Hallo! Los geht\'s.'),
      h('p', {}, 'Hör gut zu und tippe auf die richtige Antwort.'),
      kinderKnopf('Start', () => aufgabeSeite(lauf))));
  neueSeite();
  sprich('Hallo! Hör gut zu und tippe auf die richtige Antwort. Tippe auf Start.');
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

  const sonderform = { legen: legenSeite, satzlegen: satzLegenSeite, beschriften: tastaturSeite }[a.typ];
  const optionen = sonderform ? [] : a.optionen.map((o) => {
    const [wert, inhalt] = optionInhalt(a, o);
    const el = h('button', { class: `option typ-${a.typ}`, type: 'button' }, inhalt);
    aktivierbar(el, () => waehle(wert, el));
    return el;
  });

  zeige(
    h('div', { class: 'testleiste' },
      h('div', { class: 'sterne', 'aria-label': `Aufgabe ${lauf.index + 1} von ${gesamt}` },
        Array.from({ length: gesamt }, (_, i) => h('span', { class: i < lauf.index ? 'an' : '' }, '★'))),
      lehrkraftKnopf('Beenden', () => testEnde(lauf, true))),
    h('main', { class: 'aufgabe' },
      h('div', { class: 'anweisung' }, vorlesen(anw.sprache), h('p', {}, anw.text)),
      anw.vorlage && h('div', { class: `vorlage ${vorlageKlasse(a)}` }, anw.vorlage),
      sonderform
        ? sonderform(a, (wert) => waehle(wert, document.querySelector('.legezeile')))
        : h('div', { class: `optionen anzahl-${optionen.length} typ-${a.typ}` }, optionen)));
  neueSeite();
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
      kinderKnopf('Weiter', () => {
        lauf.starteStufe(naechste);
        aufgabeSeite(lauf);
      })));
  neueSeite();
  sprich('Super! Jetzt kommen neue Aufgaben. Tippe auf Weiter.');
}

function testEnde(lauf, abgebrochen) {
  const ergebnis = lauf.abschliessen(abgebrochen);
  const gespeichert = speicher.speichereTest(ergebnis);
  zeige(
    h('main', { class: 'mitte kindansicht' },
      h('div', { class: 'pseudonym klein' }, '🏆'),
      h('h2', {}, 'Geschafft! Das hast du toll gemacht.'),
      // Das Protokoll ist gespeichert und erscheint unter „Protokolle und Einstellungen“.
      h('div', { class: 'ende-lehrkraft' },
        // Nur falls der Browser nicht speichern konnte: Protokoll direkt sichern
        !gespeichert && knopf('Speichern fehlgeschlagen: Protokoll sichern', () => schuelerProtokollSeite(ergebnis, startseite), 'knopf klein warnung lehrkraft'),
        lehrkraftKnopf('Fertig', startseite))));
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

// ---------- Lehrkraftmodus ----------
function lehrkraftMenue(p) {
  zeige(
    kopf(`Lehrkraftmodus: ${p}`, startseite),
    h('main', { class: 'mitte' },
      h('div', { class: 'kacheln' },
        h('button', { class: 'kachel', type: 'button', onclick: () => bogenSeite(p) },
          h('span', { class: 'gross' }, '📋'), 'Kompetenzbogen', h('small', {}, 'Einschätzung ausfüllen oder aktualisieren')),
        h('button', { class: 'kachel', type: 'button', onclick: () => lautLesenAuswahl(p) },
          h('span', { class: 'gross' }, '🗣️'), 'Lautes Lesen', h('small', {}, 'Kind liest vor, du tippst Fehler mit')))));
}

// ---------- Lehrkraftmodus: Lautes Lesen ----------
const woerterVon = (text) => text.split(/\s+/).filter(Boolean);

function lautLesenAuswahl(p) {
  zeige(
    kopf('Lautes Lesen: Text wählen', () => lehrkraftMenue(p)),
    h('main', { class: 'mitte' },
      h('div', { class: 'karte ablauf' },
        h('h2', {}, 'So läuft es ab'),
        h('ol', {},
          h('li', {}, 'Das Kind bekommt den Text getrennt von dir: auf einem zweiten iPad (Schülermodus → Vorlesen) oder ausgedruckt.'),
          h('li', {}, 'Du siehst den Text auf deinem iPad und tippst Start, sobald das Kind beginnt.'),
          h('li', {}, 'Liest das Kind ein Wort falsch, tippst du es auf deinem iPad an. Das Kind sieht davon nichts.'),
          h('li', {}, 'Am Ende tippst du Stopp. Das Ergebnis wird gespeichert.'))),
      h('div', { class: 'stufen' },
        alleTexte().map((t) =>
          h('button', { class: 'stufe', type: 'button', onclick: () => lautLesenSeite(p, t) },
            h('strong', {}, t.niveau), h('span', {}, t.titel), h('small', {}, `${woerterVon(t.text).length} Wörter`))))));
}

function lautLesenSeite(p, t) {
  const woerter = woerterVon(t.text);
  const status = woerter.map(() => null); // null | 'fehler' | 'korrigiert'
  let start = null;
  let ende = null;
  let endeIndex = woerter.length - 1;
  let endeModus = false;
  let uhrTimer = null;
  const uhr = h('span', { class: 'stoppuhr' }, '0:00');
  const zeit = () => ((ende || performance.now()) - start) / 1000;
  const zeigeZeit = () => {
    const s = Math.floor(zeit());
    uhr.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const spans = woerter.map((wort, i) => {
    const el = h('span', { class: 'lesewort' }, wort);
    el.addEventListener('click', () => {
      if (!start || ende) return;
      if (endeModus) {
        endeIndex = i;
        endeModus = false;
        endeKnopf.classList.remove('an');
        spans.forEach((x, j) => x.classList.toggle('nicht-gelesen', j > endeIndex));
        return;
      }
      status[i] = status[i] === null ? 'fehler' : status[i] === 'fehler' ? 'korrigiert' : null;
      el.className = 'lesewort' + (status[i] ? ' ' + status[i] : '') + (i > endeIndex ? ' nicht-gelesen' : '');
    });
    return el;
  });
  const startKnopf = knopf('▶ Start', () => {
    if (!start) {
      start = performance.now();
      uhrTimer = setInterval(zeigeZeit, 250);
      startKnopf.textContent = '■ Stopp';
      textFeld.classList.add('laeuft');
    } else if (!ende) {
      ende = performance.now();
      clearInterval(uhrTimer);
      zeigeZeit();
      lautLesenErgebnis(p, t, woerter, status, endeIndex, zeit());
    }
  });
  const endeKnopf = knopf('Hier aufgehört …', () => {
    endeModus = !endeModus;
    endeKnopf.classList.toggle('an', endeModus);
  }, 'knopf klein leise');
  const textFeld = h('div', { class: 'lautlesetext' }, spans.flatMap((s) => [s, ' ']));
  zeige(
    kopf(`Lautes Lesen: ${t.titel}`, () => {
      clearInterval(uhrTimer);
      lautLesenAuswahl(p);
    }),
    h('main', { class: 'lautlesen' },
      h('div', { class: 'reihe' }, startKnopf, uhr, endeKnopf, knopf('🖨 Text für das Kind drucken', () => druckeText(t), 'knopf klein leise')),
      h('p', { class: 'unter' }, 'Lehrkraft-Ansicht. Nach dem Start: Wort 1× antippen = Fehler (rot), 2× = selbst korrigiert (orange), 3× = zurücksetzen. Liest das Kind nicht bis zum Ende, tippe „Hier aufgehört …“ und dann das letzte gelesene Wort.'),
      textFeld));
}

function lautLesenErgebnis(p, t, woerter, status, endeIndex, zeitSek) {
  const gelesen = endeIndex + 1;
  const fehler = status.map((s, i) => (s === 'fehler' && i <= endeIndex ? { index: i, wort: woerter[i] } : null)).filter(Boolean);
  const korrigiert = status.map((s, i) => (s === 'korrigiert' && i <= endeIndex ? { index: i, wort: woerter[i] } : null)).filter(Boolean);
  const minuten = Math.max(zeitSek, 1) / 60;
  const ergebnis = {
    typ: 'lautleseprotokoll',
    version: 1,
    id: `l-${Date.now().toString(36)}`,
    pseudonym: p,
    datum: new Date().toISOString(),
    textId: t.id,
    titel: t.titel,
    niveau: t.niveau,
    woerterGesamt: woerter.length,
    woerterGelesen: gelesen,
    zeitSek: Math.round(zeitSek),
    fehler,
    korrigiert,
    wpm: Math.round(gelesen / minuten),
    wcpm: Math.round((gelesen - fehler.length) / minuten),
    genauigkeit: Math.round(((gelesen - fehler.length) / gelesen) * 100),
    notiz: '',
  };
  const notiz = h('textarea', { rows: 3, placeholder: 'Beobachtungen, z. B. liest silbierend, rät Wortenden (ohne identifizierende Angaben)' });
  zeige(
    kopf('Lautes Lesen: Ergebnis', () => lautLesenAuswahl(p)),
    h('main', { class: 'bogen' },
      h('section', { class: 'karte' },
        h('h2', {}, t.titel),
        h('ul', { class: 'kennzahlen' },
          h('li', {}, h('strong', {}, ergebnis.wcpm), ' richtig gelesene Wörter pro Minute'),
          h('li', {}, h('strong', {}, `${ergebnis.genauigkeit} %`), ' Genauigkeit'),
          h('li', {}, h('strong', {}, `${ergebnis.zeitSek} s`), ` für ${gelesen} von ${woerter.length} Wörtern`),
          h('li', {}, h('strong', {}, fehler.length), ' Fehler, ', h('strong', {}, korrigiert.length), ' Selbstkorrekturen')),
        h('label', { class: 'textzeile' }, 'Notiz', notiz)),
      knopf('Speichern und Protokoll anzeigen', () => {
        ergebnis.notiz = notiz.value.trim();
        speicher.speichereLautlesen(ergebnis);
        lautleseProtokollSeite(ergebnis, () => lehrkraftMenue(p));
      })));
}

function lautleseProtokollSeite(r, zurueck) {
  protokollSeite({
    titel: 'Protokoll lautes Lesen',
    text: lautleseText(r, speicher.lautlesen(r.pseudonym)),
    json: r,
    basis: dateiname('lautlesen', r.pseudonym, '', '').replace(/\.$/, ''),
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
    kopf(`Kompetenzbogen: ${p}`, () => lehrkraftMenue(p)),
    h('main', { class: 'bogen' },
      h('p', { class: 'unter' }, 'Antippen zum Auswählen, erneut antippen zum Entfernen. Alles wird automatisch auf diesem iPad gespeichert. ', status),
      bereiche,
      knopf('Fertig: Kompetenzprotokoll anzeigen', () => {
        sichern();
        bogenProtokollSeite(bogen, () => bogenSeite(p));
      })));
}

// ---------- Übertragung per QR-Code ----------
function senden() {
  const pseudonyme = speicher.pseudonyme();
  const auswahl = h('select', { class: 'auswahl' },
    h('option', { value: '' }, `Alle Kinder auf diesem iPad (${pseudonyme.length})`),
    pseudonyme.map((p) => h('option', { value: p }, p)));
  const mitEigenem = h('input', { type: 'checkbox', checked: true });
  const flaeche = h('div', { class: 'qr-flaeche' });
  let stopp = () => {};
  const zeigen = async () => {
    stopp();
    const liste = auswahl.value ? [auswahl.value] : pseudonyme;
    stopp = await zeigeQr(flaeche, erstellePaket(liste, mitEigenem.checked));
  };
  auswahl.addEventListener('change', zeigen);
  mitEigenem.addEventListener('change', zeigen);
  zeige(
    kopf('Senden', () => {
      stopp();
      verwaltung();
    }),
    h('main', { class: 'mitte' },
      h('label', { class: 'textzeile' }, 'Was soll übertragen werden?', auswahl),
      h('label', { class: 'checkzeile' }, mitEigenem, ' Eigene Wörter und Vorlesetexte mitsenden'),
      flaeche,
      h('p', { class: 'unter' }, 'Auf dem anderen iPad: Protokolle und Einstellungen → Empfangen.')));
  zeigen();
}

function empfangen() {
  const flaeche = h('div', { class: 'qr-flaeche' });
  let stopp = () => {};
  const zurueck = () => {
    stopp();
    verwaltung();
  };
  zeige(kopf('Empfangen', zurueck), h('main', { class: 'mitte' }, flaeche));
  starteScanner(flaeche, (paket) => {
    const z = importierePaket(paket);
    Object.assign(daten.woerter, eigeneWoerter());
    flaeche.replaceChildren(
      h('div', { class: 'pseudonym klein' }, '✅'),
      h('h2', {}, 'Übertragung fertig'),
      h('p', {}, `Übernommen: ${zusammenfassung(z)}.`),
      knopf('Zu den Protokollen', verwaltung));
  }, (meldung) => flaeche.replaceChildren(h('p', { class: 'hinweis' }, meldung), knopf('Zurück', verwaltung, 'knopf leise')))
    .then((fn) => (stopp = fn));
}

// ---------- Eigene Wörter und Texte ----------
function eigenesSeite() {
  const woerter = eigeneWoerter();
  const texte = eigeneTexte();
  const wort = h('input', { type: 'text', class: 'eingabe klein', placeholder: 'z. B. Feuerwehr', autocapitalize: 'off' });
  const silben = h('input', { type: 'text', class: 'eingabe klein', placeholder: 'z. B. Feu-er-wehr' });
  const emoji = h('input', { type: 'text', class: 'eingabe klein', placeholder: 'z. B. 🚒 (Emoji-Tastatur)' });
  const foto = h('input', { type: 'file', accept: 'image/*' });
  const legen = h('input', { type: 'checkbox' });
  const meldung = h('p', { class: 'status' });
  wort.addEventListener('input', () => {
    if (!silben.dataset.geaendert) silben.value = wort.value.trim();
  });
  silben.addEventListener('input', () => (silben.dataset.geaendert = '1'));

  const wortSpeichern = async () => {
    const w = wort.value.trim();
    if (!w) return (meldung.textContent = 'Bitte ein Wort eingeben.');
    if (!emoji.value.trim() && !foto.files[0]) return (meldung.textContent = 'Bitte ein Emoji oder ein Bild wählen.');
    const eintrag = { wort: w, silben: silben.value.trim() || w, emoji: emoji.value.trim() || '🖼️', arasaac: w, legen: legen.checked };
    speichereWort(eintrag);
    if (foto.files[0]) await speichereBild('eigen', schluesselFuer(w), foto.files[0]);
    Object.assign(daten.woerter, eigeneWoerter());
    eigenesSeite();
  };

  const titel = h('input', { type: 'text', class: 'eingabe klein', placeholder: 'Titel, z. B. Unser Ausflug' });
  const niveau = h('select', { class: 'auswahl' }, ['sehr leicht', 'leicht', 'mittel', 'schwer'].map((n) => h('option', { value: n }, n)));
  const text = h('textarea', { rows: 5, placeholder: 'Text zum lauten Lesen. Bitte keine echten Namen von Kindern.' });
  const textSpeichern = () => {
    if (!titel.value.trim() || !text.value.trim()) return;
    speichereText({ id: 'e' + Date.now().toString(36), titel: titel.value.trim(), niveau: niveau.value, text: text.value.trim().replace(/\s+/g, ' ') });
    eigenesSeite();
  };

  zeige(
    kopf('Eigene Wörter und Texte', verwaltung),
    h('main', { class: 'bogen' },
      h('section', { class: 'karte' },
        h('h2', {}, 'Eigene Wörter'),
        h('p', { class: 'unter' }, 'Eigene Wörter kommen automatisch in die Aufgaben: Bildzuordnung, Anlaute und Silben. Wenn das Häkchen „lautgetreu“ gesetzt ist, auch ins Wörterlegen und Bilderbeschriften.'),
        Object.keys(woerter).length
          ? h('ul', { class: 'eintraege' }, Object.entries(woerter).map(([key, e]) =>
            h('li', {},
              h('span', { class: 'eigen-wort' }, bildElement(key, 'symbol'), ` ${e.wort} (${e.silben})${e.legen ? ' · lautgetreu' : ''}`),
              knopf('Löschen', () => {
                loescheWort(key);
                delete daten.woerter[key];
                eigenesSeite();
              }, 'knopf klein leise'))))
          : h('p', { class: 'unter' }, 'Noch keine eigenen Wörter.'),
        h('h3', {}, 'Neues Wort'),
        h('label', { class: 'textzeile' }, 'Wort (Nomen groß schreiben)', wort),
        h('label', { class: 'textzeile' }, 'Silben mit Bindestrich', silben),
        h('label', { class: 'textzeile' }, 'Bild als Emoji', emoji),
        h('label', { class: 'textzeile' }, 'oder eigenes Foto/Symbol (bleibt nur auf diesem iPad)', foto),
        h('label', { class: 'checkzeile' }, legen, ' lautgetreu (zum Wörterlegen und Beschriften geeignet)'),
        meldung,
        knopf('Wort speichern', wortSpeichern)),
      h('section', { class: 'karte' },
        h('h2', {}, 'Eigene Vorlesetexte'),
        texte.length
          ? h('ul', { class: 'eintraege' }, texte.map((t) =>
            h('li', {}, h('span', {}, `${t.titel} (${t.niveau})`), knopf('Löschen', () => {
              loescheText(t.id);
              eigenesSeite();
            }, 'knopf klein leise'))))
          : h('p', { class: 'unter' }, 'Noch keine eigenen Texte.'),
        h('h3', {}, 'Neuer Text'),
        h('label', { class: 'textzeile' }, 'Titel', titel),
        h('label', { class: 'textzeile' }, 'Schwierigkeit', niveau),
        h('label', { class: 'textzeile' }, 'Text', text),
        knopf('Text speichern', textSpeichern)),
      h('p', { class: 'hinweis' }, 'Damit eigene Wörter und Texte auch auf dem Schüler-iPad erscheinen: Protokolle und Einstellungen → Senden (mit Häkchen „Eigene Wörter und Vorlesetexte“).')));
}

// ---------- Lehrkraft-Sperre ----------
function sperrKarte() {
  const status = h('p', { class: 'unter' }, pinGesetzt()
    ? 'PIN ist aktiv. Lehrkraft-Bereiche öffnen sich nur mit PIN.'
    : 'Keine PIN gesetzt. Lehrkraft-Bereiche öffnen sich durch langes Drücken (1,5 Sekunden).');
  const neuePin = () => {
    const feld = h('input', { type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '4', class: 'eingabe klein', placeholder: '4 Ziffern' });
    const ok = knopf('PIN speichern', async () => {
      if (!/^\d{4}$/.test(feld.value)) return alert('Bitte genau 4 Ziffern eingeben.');
      await setzePin(feld.value);
      verwaltung();
    }, 'knopf klein');
    karte.append(h('div', { class: 'reihe' }, feld, ok));
    feld.focus();
  };
  const karte = h('section', { class: 'karte' },
    h('h2', {}, 'Lehrkraft-Sperre'),
    status,
    h('div', { class: 'reihe' },
      pinGesetzt()
        ? [knopf('PIN ändern', () => pinDialog(neuePin, 'Alte PIN eingeben'), 'knopf klein leise'),
          knopf('PIN entfernen', () => pinDialog(() => {
            entfernePin();
            verwaltung();
          }, 'PIN zum Entfernen eingeben'), 'knopf klein leise')]
        : knopf('PIN festlegen', neuePin, 'knopf klein leise')),
    h('p', { class: 'unter' }, 'Gilt für dieses iPad. PIN vergessen? Dann in Safari die Website-Daten löschen; dabei gehen aber auch die Protokolle verloren, also vorher sichern.'));
  return karte;
}

// ---------- Fortschritt ----------
function fortschritt(tests, lesen) {
  const tag = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const bereiche = [...new Set(tests.map((t) => t.bereichTitel))];
  if (!bereiche.length && !lesen.length) return h('p', { class: 'unter' }, 'Noch keine Ergebnisse auf diesem iPad.');
  return h('div', { class: 'fortschritt' },
    bereiche.map((b) =>
      h('div', { class: 'verlauf' },
        h('h3', {}, b),
        tests.filter((t) => t.bereichTitel === b).map((t) =>
          h('div', { class: 'verlaufzeile' },
            h('span', { class: 'datum' }, tag(t.datum)),
            h('span', { class: 'balken', 'aria-label': `sicher bis Stufe ${t.erreichteStufe || 0}` },
              [1, 2, 3, 4, 5].map((n) => {
                const st = t.stufen[n];
                const q = st?.antworten.length ? st.antworten.filter((x) => x.richtig).length / st.antworten.length : null;
                const klasse = n <= (t.erreichteStufe || 0) ? 'sicher' : q != null && q >= 0.5 ? 'teilweise' : q != null ? 'versucht' : '';
                return h('span', { class: klasse }, n);
              })),
            h('span', { class: 'unter' }, t.erreichteStufe ? `Stufe ${t.erreichteStufe}` : '–'))))),
    lesen.length > 0 && h('div', { class: 'verlauf' },
      h('h3', {}, 'Lautes Lesen'),
      lesen.map((r) =>
        h('div', { class: 'verlaufzeile' },
          h('span', { class: 'datum' }, tag(r.datum)),
          h('span', {}, `${r.wcpm} Wörter/Min. · ${r.genauigkeit} % · „${r.titel}“`)))),
    h('p', { class: 'legende' },
      h('span', { class: 'sicher' }, ' '), ' sicher ', h('span', { class: 'teilweise' }, ' '), ' teilweise ', h('span', { class: 'versucht' }, ' '), ' noch nicht'));
}

// ---------- Bedienung (motorische Hilfen) ----------
function bedienungKarte() {
  const e = einstellungen();
  const auswahl = (schluessel, optionen) => {
    const sel = h('select', { class: 'auswahl' },
      optionen.map(([wert, text]) => h('option', { value: wert, selected: String(e[schluessel]) === String(wert) }, text)));
    sel.addEventListener('change', () => speichereEinstellungen({ [schluessel]: isNaN(sel.value) ? sel.value : Number(sel.value) }));
    return sel;
  };
  return h('section', { class: 'karte' },
    h('h2', {}, 'Bedienung für das Kind'),
    h('p', { class: 'unter' }, 'Gilt für dieses iPad. Die gewählte Bedienung steht im Schülerprotokoll, damit Bearbeitungszeiten richtig eingeordnet werden.'),
    h('label', { class: 'textzeile' }, 'Größe der Antwortfelder',
      auswahl('groesse', [['normal', 'normal'], ['gross', 'groß'], ['sehrgross', 'sehr groß (2 Felder pro Reihe)']])),
    h('label', { class: 'textzeile' }, 'Haltezeit (Feld muss kurz gehalten werden, verhindert versehentliches Tippen)',
      auswahl('haltezeit', [[0, 'aus, einfaches Antippen'], [500, '0,5 Sekunden'], [1000, '1 Sekunde'], [1500, '1,5 Sekunden'], [2000, '2 Sekunden']])),
    h('label', { class: 'textzeile' }, 'Sperrzeit nach jeder neuen Aufgabe (gegen Doppeltippen)',
      auswahl('sperrzeit', [[0, 'aus'], [500, '0,5 Sekunden'], [1000, '1 Sekunde'], [2000, '2 Sekunden']])),
    h('label', { class: 'textzeile' }, 'Tasterbedienung (Scanning)',
      auswahl('taster', [['aus', 'aus'], ['1', '1 Taster: Markierung wandert automatisch, Taster wählt aus'], ['2', '2 Taster: Taster 1 = weiter, Taster 2 = auswählen']])),
    h('label', { class: 'textzeile' }, 'Tempo der Markierung (1 Taster)',
      auswahl('scanTempo', [[1500, '1,5 Sekunden'], [2000, '2 Sekunden'], [3000, '3 Sekunden'], [4000, '4 Sekunden']])),
    h('p', { class: 'unter' },
      'Taster: Bluetooth-Taster, die als Tastatur arbeiten (Leertaste und Eingabe). Im 1-Taster-Modus reicht auch Tippen irgendwo auf den Bildschirm. ',
      'Alternativ kann die iPad-eigene Schaltersteuerung genutzt werden (Einstellungen → Bedienungshilfen → Schaltersteuerung).'));
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
  const tag = (iso) => new Date(iso).toLocaleDateString('de-DE');
  const liste = speicher.pseudonyme().map((p) => {
    const tests = speicher.tests(p);
    const bogen = speicher.bogen(p);
    const lesen = speicher.lautlesen(p);
    return h('section', { class: 'karte' },
      h('h2', {}, p),
      fortschritt(tests, lesen),
      h('details', {},
        h('summary', {}, `Einzelne Protokolle (${tests.length + lesen.length})`),
        h('ul', { class: 'eintraege' },
          tests.map((t) =>
            h('li', {},
              h('span', {}, `${tag(t.datum)} · ${t.bereichTitel} · sicher: ${t.erreichteStufe ? 'Stufe ' + t.erreichteStufe : 'keine Stufe'}`),
              knopf('Anzeigen', () => schuelerProtokollSeite(t, verwaltung), 'knopf klein leise'))),
          lesen.map((r) =>
            h('li', {},
              h('span', {}, `${tag(r.datum)} · Lautes Lesen „${r.titel}“ · ${r.wcpm} Wörter/Min.`),
              knopf('Anzeigen', () => lautleseProtokollSeite(r, verwaltung), 'knopf klein leise'))))),
      h('div', { class: 'reihe' },
        bogen
          ? knopf(`Kompetenzbogen (Stand ${tag(bogen.aktualisiert)})`, () => bogenProtokollSeite(bogen, verwaltung), 'knopf klein leise')
          : h('span', { class: 'unter' }, 'Noch kein Kompetenzbogen.'),
        knopf('Kompetenzbogen bearbeiten', () => bogenSeite(p), 'knopf klein leise'),
        knopf('Gesamtprotokoll', () => {
          if (!(tests.length || lesen.length) || !bogen) {
            alert('Für das Gesamtprotokoll braucht es ein Schüler- oder Leseprotokoll und einen Kompetenzbogen. Importiere die fehlende Datei vom anderen iPad.');
            return;
          }
          protokollSeite({
            titel: 'Gesamtprotokoll',
            text: gesamtText(tests, bogen, daten.bogen, lesen),
            json: { typ: 'gesamtprotokoll', pseudonym: p, kompetenz: bogen, tests, lautlesen: lesen },
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
        } else if (d.typ === 'lautleseprotokoll' && d.pseudonym) {
          speicher.speichereLautlesen(d);
          n++;
        } else if (d.typ === 'gesamtprotokoll') {
          d.tests?.forEach((t) => speicher.speichereTest(t));
          d.lautlesen?.forEach((r) => speicher.speichereLautlesen(r));
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
      h('section', { class: 'karte' },
        h('h2', {}, 'Zwischen iPads übertragen'),
        h('p', { class: 'unter' }, 'Per QR-Code, ohne Internet: Ein iPad zeigt den Code, das andere scannt ihn mit der Kamera. Vorhandenes wird ergänzt, nicht gelöscht.'),
        h('div', { class: 'reihe' },
          knopf('📤 Senden', senden, 'knopf leise'),
          knopf('📥 Empfangen', empfangen, 'knopf leise'))),
      h('section', { class: 'karte' },
        h('h2', {}, 'Eigene Wörter und Texte'),
        h('p', { class: 'unter' }, `${Object.keys(eigeneWoerter()).length} eigene Wörter, ${eigeneTexte().length} eigene Vorlesetexte.`),
        knopf('Bearbeiten', eigenesSeite, 'knopf leise')),
      sperrKarte(),
      bedienungKarte(),
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
  const [woerter, lesen, rechtschreibung, mathe, bogen, lautlesen] = await Promise.all(
    ['woerter', 'lesen', 'rechtschreibung', 'mathe', 'kompetenzbogen', 'lautlesen'].map((n) => lade(`data/${n}.json`)));
  daten.lautlesen = lautlesen;
  daten.woerter = woerter.woerter;
  Object.assign(daten.woerter, eigeneWoerter());
  daten.lesen = lesen;
  daten.rechtschreibung = rechtschreibung;
  daten.mathe = mathe;
  daten.bogen = bogen;
  await initSymbole(daten.woerter);
  wendeAn();
  startseite();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init().catch((e) => {
  app.replaceChildren(h('p', { class: 'hinweis' }, 'Die App konnte nicht starten: ' + e.message));
});
