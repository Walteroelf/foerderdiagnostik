// Darstellung der Aufgaben in der Kinderansicht
import { h } from './dom.js';
import { bildElement, wortInfo } from './symbole.js';
import { aktivierbar } from './bedienung.js';
import { euro } from './testlauf.js';

const w = (k) => wortInfo(k).wort;
const opZeichen = (op) => ({ '-': '−', '+': '+', '·': '·' })[op];
const opWort = (op) => ({ '-': 'minus', '+': 'plus', '·': 'mal' })[op];
const hatBild = (k) => k && wortInfo(k).emoji !== '❓';

export function anweisung(a) {
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
    case 'satz':
      return {
        text: 'Lies den Satz. Stimmt das?',
        sprache: 'Lies den Satz. Stimmt das, oder stimmt das nicht?',
        vorlage: h('span', { class: 'satzvorlage' }, a.bild && bildElement(a.bild, 'symbol'), h('span', { class: 'lesesatz' }, a.satz)),
      };
    case 'textfrage':
      return {
        text: 'Lies den Text und die Frage.',
        sprache: 'Lies den Text und die Frage. Tippe dann auf die richtige Antwort.',
        vorlage: h('span', { class: 'textvorlage' }, h('span', { class: 'lesetext' }, a.text), h('strong', { class: 'frage-text' }, a.frage)),
      };
    case 'buchstabezuordnen':
      return a.art === 'gross'
        ? { text: 'Finde den großen Buchstaben.', sprache: 'Hier ist ein kleiner Buchstabe. Finde den passenden großen Buchstaben.', vorlage: h('span', { class: 'buchstabe' }, a.zeige) }
        : { text: 'Finde den gleichen Buchstaben.', sprache: 'Finde den gleichen Buchstaben.', vorlage: h('span', { class: 'buchstabe' }, a.zeige) };
    case 'legen':
      return { text: 'Schreib das Wort.', sprache: `Schreib das Wort ${w(a.wort)}. Tippe die Buchstaben nacheinander an.` };
    case 'schreibweise': {
      const wort = a.optionen.find((o) => !o.fehler).text;
      return { text: 'Welches Wort ist richtig geschrieben?', sprache: `${wort}. Wie schreibt man ${wort}? Tippe auf das richtig geschriebene Wort.`, vorlage: hatBild(a.wort) ? bildElement(a.wort, 'symbol') : null };
    }
    case 'satzlegen':
      return { text: 'Hör gut zu und lege den Satz.', sprache: `Lege den Satz: ${a.satz.replace(/[.!?]$/, '')}.` };
    case 'beschriften':
      return { text: 'Schreib, was du siehst.', sprache: 'Was ist das? Schreib das Wort mit den Buchstaben.' };
    case 'menge':
      return { text: `Wo sind ${a.frage}?`, sprache: `Wo sind ${a.frage}? Tippe auf die Seite mit ${a.frage} Bildern.` };
    case 'simultan':
      return { text: 'Wie viele Punkte?', sprache: 'Wie viele Punkte siehst du?', vorlage: wuerfel(a.ziel) };
    case 'zahlmenge':
      return { text: `Wo sind ${a.ziel}?`, sprache: `Wo sind ${a.ziel}? Tippe auf das passende Bild.`, vorlage: h('span', { class: 'zahl-gross' }, a.ziel) };
    case 'rechnen': {
      const term = `${a.a} ${opZeichen(a.op)} ${a.b} = ?`;
      return {
        text: 'Rechne.',
        sprache: `Wie viel ist ${a.a} ${opWort(a.op)} ${a.b}?`,
        vorlage: a.bilder
          ? h('span', { class: 'rechenbild-mit-text' }, rechenBild(a), h('span', { class: 'rechentext' }, term))
          : h('span', { class: 'rechentext gross' }, term),
      };
    }
    case 'stellenwert':
      return { text: 'Welche Zahl ist das?', sprache: 'Ein langer Streifen sind zehn. Ein Punkt ist eins. Welche Zahl ist das?', vorlage: stellenwertBild(a.zehner, a.einer) };
    case 'geld':
      return { text: 'Wie viel Geld ist das?', sprache: 'Wie viel Geld ist das zusammen?', vorlage: geldBild(a.stuecke) };
    case 'uhr':
      return { text: 'Wie spät ist es?', sprache: 'Schau auf die Uhr. Wie spät ist es?', vorlage: uhrBild(a.stunde, a.minute) };
    case 'textaufgabe':
      return { text: 'Hör gut zu und rechne.', sprache: a.text, vorlage: h('span', { class: 'lesetext' }, a.text) };
    case 'hoeren':
      return { text: 'Hör gut zu. Tippe auf das richtige Bild.', sprache: a.sprache, vorlage: h('span', { class: 'ohr', 'aria-hidden': 'true' }, '👂') };
    default:
      return { text: '', sprache: '' };
  }
}

export const vorlageKlasse = (a) =>
  ['rechnen', 'menge', 'stellenwert', 'geld', 'textaufgabe', 'satz', 'textfrage'].includes(a.typ) ? 'breit' : '';

// Gibt [Wert für die Bewertung, Inhalt des Antwortfelds] zurück
export function optionInhalt(a, o) {
  switch (a.typ) {
    case 'zuordnen':
      return [o, bildElement(o, 'symbol')];
    case 'hoeren':
      return [o, h('span', { class: 'bildgruppe' }, o.split('+').map((k) => bildElement(k, 'symbol')))];
    case 'buchstabe':
    case 'anlaut':
    case 'buchstabezuordnen':
    case 'simultan':
    case 'rechnen':
    case 'stellenwert':
    case 'textaufgabe':
      return [o, h('span', { class: String(o).length > 2 ? 'zahl-mittel' : 'buchstabe' }, o)];
    case 'silben':
      return [o, h('span', { class: 'silben' }, h('span', { class: 'zahl' }, o), h('span', {}, '👏'.repeat(o)))];
    case 'wortbild':
    case 'schreibweise':
      return [o.text, h('span', { class: 'wort' }, o.text)];
    case 'uhr':
    case 'textfrage':
      return [o.text, h('span', { class: 'wort klein' }, o.text)];
    case 'satz':
      return [o, h('span', { class: 'wort' }, o === 'stimmt' ? '👍 stimmt' : '👎 stimmt nicht')];
    case 'geld':
      return [o, h('span', { class: 'zahl-mittel' }, euro(o))];
    case 'menge':
      return [o, menge(o === 'links' ? a.links : a.rechts, a.ding)];
    case 'zahlmenge':
      return [o, menge(o, a.ding)];
    default:
      return [o, String(o)];
  }
}

// Was das Kind sagen könnte, um eine Antwort zu wählen (für die Antwort per Sprache)
export function optionSprechtext(a, o) {
  switch (a.typ) {
    case 'zuordnen':
      return { art: 'wort', text: w(o) };
    case 'hoeren':
      return { art: 'wort', text: o.split('+').map(w).join(' ') };
    case 'buchstabe':
    case 'anlaut':
    case 'buchstabezuordnen':
      return { art: 'buchstabe', text: String(o) };
    case 'silben':
    case 'simultan':
    case 'rechnen':
    case 'stellenwert':
    case 'textaufgabe':
    case 'zahlmenge':
      return { art: 'zahl', text: String(o) };
    case 'geld':
      return { art: 'geld', text: String(o) };
    case 'wortbild':
    case 'uhr':
    case 'textfrage':
      return { art: 'wort', text: o.text };
    case 'satz':
    case 'menge':
      return { art: 'wahl', text: o };
    default:
      return null;
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

// Zehnerstreifen und Einerpunkte
function stellenwertBild(zehner, einer) {
  return h('span', { class: 'stellenwert', 'aria-label': `${zehner} Zehner, ${einer} Einer` },
    h('span', { class: 'zehner' }, Array.from({ length: zehner }, () => h('span', { class: 'streifen' }, Array.from({ length: 10 }, () => h('i'))))),
    h('span', { class: 'einer' }, Array.from({ length: einer }, () => h('i'))));
}

function geldBild(stuecke) {
  return h('span', { class: 'geld' },
    stuecke.map((c) => (c >= 500
      ? h('span', { class: 'schein' }, euro(c))
      : h('span', { class: `muenze ${c >= 100 ? 'euro' : 'cent'}` }, c >= 100 ? `${c / 100} €` : `${c} ct`))));
}

function uhrBild(stunde, minute) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('class', 'uhr');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Uhr');
  const el = (tag, attrs) => {
    const e = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    svg.append(e);
    return e;
  };
  el('circle', { cx: 100, cy: 100, r: 94, class: 'zifferblatt' });
  for (let i = 1; i <= 12; i++) {
    const wkl = (i * 30 - 90) * (Math.PI / 180);
    const t = el('text', { x: 100 + 76 * Math.cos(wkl), y: 100 + 76 * Math.sin(wkl) + 7, 'text-anchor': 'middle', class: 'ziffer' });
    t.textContent = i;
  }
  const zeiger = (winkel, laenge, klasse) => {
    const r = (winkel - 90) * (Math.PI / 180);
    el('line', { x1: 100, y1: 100, x2: 100 + laenge * Math.cos(r), y2: 100 + laenge * Math.sin(r), class: klasse });
  };
  zeiger(((stunde % 12) + minute / 60) * 30, 46, 'stundenzeiger');
  zeiger(minute * 6, 70, 'minutenzeiger');
  el('circle', { cx: 100, cy: 100, r: 6, class: 'mitte-punkt' });
  return svg;
}

// Gemeinsame Legefläche für Buchstaben- und Wortkärtchen
function legeflaeche(teile, trenner, fertig, klasse = '') {
  const gelegt = [];
  const zeile = h('div', { class: `gelegt ${klasse}` });
  const male = () => {
    zeile.replaceChildren(...(gelegt.length ? gelegt.map((g) => h('span', { class: 'teil' }, g.t)) : [h('span', { class: 'leer' }, '…')]));
  };
  const knoepfe = teile.map((t) => {
    const el = h('button', { class: `kaertchen ${klasse}`, type: 'button' }, t);
    aktivierbar(el, () => {
      gelegt.push({ t, el });
      el.disabled = true;
      male();
    });
    return el;
  });
  male();
  const loeschen = aktivierbar(h('button', { class: 'knopf leise gross-knopf', type: 'button', 'aria-label': 'Löschen' }, '⌫'), () => {
    const g = gelegt.pop();
    if (g) g.el.disabled = false;
    male();
  });
  const ok = aktivierbar(h('button', { class: 'knopf gross-knopf', type: 'button' }, '✓ Fertig'), () => fertig(gelegt.map((g) => g.t).join(trenner)));
  return [h('div', { class: 'legezeile' }, zeile, loeschen), h('div', { class: 'kaertchen-feld' }, knoepfe), ok];
}

const AEHNLICH = { a: 'o', o: 'u', u: 'o', e: 'i', i: 'e', m: 'n', n: 'm', b: 'd', d: 'b', p: 'b', t: 'd', k: 'g', g: 'k', l: 'r', r: 'l', s: 'z', f: 'w', w: 'f', h: 'n', z: 's' };
const mische = (l) => [...l].sort(() => Math.random() - 0.5);

// Schreiben: Wort aus Buchstabenkärtchen legen
export function legenSeite(a, fertig) {
  const extra = a.extra || mische(a.teile.slice(1)).slice(0, 2).map((t) => AEHNLICH[t.toLowerCase()] || 'a');
  const teile = mische([...a.teile.map((t, i) => (i === 0 ? t : t.toLowerCase())), ...extra]);
  return [h('div', { class: 'vorlage klein' }, bildElement(a.wort, 'symbol')), ...legeflaeche(teile, '|', fertig)];
}

// Schreiben: diktierten Satz aus Wortkärtchen legen
export function satzLegenSeite(a, fertig) {
  return legeflaeche(mische([...a.woerter, ...a.extra]), '|', fertig, 'wortkarte');
}

// Schreiben: Bild beschriften mit einer Buchstabentastatur (ABC-Reihenfolge)
export function tastaturSeite(a, fertig) {
  let text = '';
  let gross = true;
  const anzeige = h('div', { class: 'gelegt' });
  const male = () => {
    anzeige.replaceChildren(text ? h('span', { class: 'teil' }, text) : h('span', { class: 'leer' }, '…'));
    umschalt.classList.toggle('an', gross);
    tasten.forEach((t) => (t.textContent = gross && t.dataset.b !== 'ß' ? t.dataset.b.toUpperCase() : t.dataset.b));
  };
  const tasten = [...'abcdefghijklmnopqrstuvwxyzäöüß'].map((b) => {
    const el = h('button', { class: 'taste', type: 'button', 'data-b': b }, b);
    aktivierbar(el, () => {
      text += gross && b !== 'ß' ? b.toUpperCase() : b;
      gross = false;
      male();
    });
    return el;
  });
  const umschalt = aktivierbar(h('button', { class: 'taste breit', type: 'button', 'aria-label': 'Großbuchstabe' }, '⇧ Groß'), () => {
    gross = !gross;
    male();
  });
  const loeschen = aktivierbar(h('button', { class: 'knopf leise gross-knopf', type: 'button', 'aria-label': 'Löschen' }, '⌫'), () => {
    text = text.slice(0, -1);
    male();
  });
  const ok = aktivierbar(h('button', { class: 'knopf gross-knopf', type: 'button' }, '✓ Fertig'), () => fertig(text));
  male();
  return [
    h('div', { class: 'vorlage klein' }, bildElement(a.wort, 'symbol')),
    h('div', { class: 'legezeile' }, anzeige, loeschen),
    h('div', { class: 'tastatur' }, tasten, umschalt),
    ok,
  ];
}
