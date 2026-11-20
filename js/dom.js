// Kleine Helfer zum Bauen der Oberfläche

// Diese Zeichen erscheinen als Linien-Symbole aus dem Sprite in index.html (statt Emoji).
// Bilder für Aufgaben und Pseudonyme (Tiere, Wortbilder) bleiben Inhalt und werden nicht ersetzt.
const SYMBOLE = {
  '\u{1F50A}': 'lautsprecher',
  '\u{26A0}': 'warnung',
  '\u{2713}': 'haken',
  '\u{2705}': 'haken',
  '\u{1F9D2}': 'kind',
  '\u{1F4CB}': 'klemmbrett',
  '\u{1F504}': 'wechseln',
  '\u{2728}': 'stern',
  '\u{1F511}': 'schluessel',
  '\u{1F4D6}': 'buch',
  '\u{270F}': 'stift',
  '\u{1F522}': 'zahlen',
  '\u{1F442}': 'ohr',
  '\u{23F3}': 'sanduhr',
  '\u{1F5E3}': 'sprechen',
  '\u{2605}': 'stern',
  '\u{2B50}': 'stern',
  '\u{1F31F}': 'stern',
  '\u{1F4E6}': 'paket',
  '\u{1F3A4}': 'mikro',
  '\u{1F388}': 'stern',
  '\u{25B6}': 'abspielen',
  '\u{1F3C6}': 'pokal',
  '\u{1F4BE}': 'speichern',
  '\u{1F4E4}': 'senden',
  '\u{1F3AF}': 'ziel',
  '\u{25A0}': 'stopp',
  '\u{1F5A8}': 'drucker',
  '\u{1F4E5}': 'empfangen',
  '\u{2190}': 'pfeil-links',
  '\u{232B}': 'ruecktaste',
  '\u{21E7}': 'umschalt'
};
const SYMBOL_RE = new RegExp('(' + Object.keys(SYMBOLE).map((z) => z.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\uFE0F?', 'gu');

export function symbol(name) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'symbol');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', '#i-' + name);
  svg.append(use);
  return svg;
}

// Text mit Symbolen statt Emoji, als Liste von Knoten
function textKnoten(text) {
  const teile = [];
  let letzte = 0;
  SYMBOL_RE.lastIndex = 0;
  for (let m; (m = SYMBOL_RE.exec(text)); ) {
    if (m.index > letzte) teile.push(text.slice(letzte, m.index));
    teile.push(symbol(SYMBOLE[m[1]]));
    letzte = m.index + m[0].length;
  }
  if (letzte < text.length) teile.push(text.slice(letzte));
  return teile;
}

// Ersetzt den Inhalt eines Elements durch Text (mit Symbolen)
export function setzeText(el, text) {
  el.replaceChildren(...textKnoten(String(text)));
}

export function h(tag, attrs = {}, ...kinder) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kind of kinder.flat()) {
    if (kind == null || kind === false) continue;
    if (kind instanceof Node) el.append(kind);
    else el.append(...textKnoten(String(kind)));
  }
  return el;
}

export const knopf = (text, onclick, klasse = 'knopf') => h('button', { class: klasse, type: 'button', onclick }, text);
