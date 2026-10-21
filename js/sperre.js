// Lehrkraft-Sperre: Lehrkraft-Bereiche öffnen sich nur per PIN oder durch langes Drücken.
import { h } from './dom.js';

const SCHLUESSEL = 'fd1:pin';
const HALTEZEIT = 1500;

async function hash(pin) {
  const daten = new TextEncoder().encode('foerderdiagnostik:' + pin);
  const digest = await crypto.subtle.digest('SHA-256', daten);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const pinGesetzt = () => {
  try {
    return !!localStorage.getItem(SCHLUESSEL);
  } catch {
    return false;
  }
};

export async function setzePin(pin) {
  localStorage.setItem(SCHLUESSEL, await hash(pin));
}

export function entfernePin() {
  localStorage.removeItem(SCHLUESSEL);
}

async function pinRichtig(pin) {
  return (await hash(pin)) === localStorage.getItem(SCHLUESSEL);
}

// Zahlenfeld zur PIN-Eingabe; ruft weiter() bei richtiger PIN auf
export function pinDialog(weiter, titel = 'PIN der Lehrkraft') {
  let eingabe = '';
  const punkte = h('div', { class: 'pin-punkte' });
  const male = () => punkte.replaceChildren(...[0, 1, 2, 3].map((i) => h('span', { class: i < eingabe.length ? 'voll' : '' })));
  const schliessen = () => overlay.remove();
  const taste = (z) => h('button', { type: 'button', class: 'pin-taste', onclick: async () => {
    if (eingabe.length >= 4) return;
    eingabe += z;
    male();
    if (eingabe.length === 4) {
      if (await pinRichtig(eingabe)) {
        schliessen();
        weiter();
      } else {
        punkte.classList.add('falsch');
        setTimeout(() => {
          punkte.classList.remove('falsch');
          eingabe = '';
          male();
        }, 600);
      }
    }
  } }, z);
  const overlay = h('div', { class: 'pin-overlay lehrkraft' },
    h('div', { class: 'pin-box' },
      h('h2', {}, titel),
      punkte,
      h('div', { class: 'pin-feld' },
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(String).map(taste),
        h('button', { type: 'button', class: 'pin-taste leise', onclick: schliessen }, 'Abbrechen'),
        taste('0'),
        h('button', { type: 'button', class: 'pin-taste leise', 'aria-label': 'Löschen', onclick: () => {
          eingabe = eingabe.slice(0, -1);
          male();
        } }, '⌫'))));
  male();
  document.body.append(overlay);
}

function hinweis(el, text) {
  const t = h('div', { class: 'sperr-hinweis' }, text);
  document.body.append(t);
  const r = el.getBoundingClientRect();
  t.style.left = Math.max(8, Math.min(window.innerWidth - 260, r.left)) + 'px';
  t.style.top = r.bottom + window.scrollY + 8 + 'px';
  setTimeout(() => t.remove(), 1800);
}

// Schützt ein Element: mit PIN → Tippen öffnet PIN-Feld; ohne PIN → lange drücken.
export function schuetze(el, fn) {
  el.classList.add('lehrkraft', 'geschuetzt');
  let timer = null;
  let gehalten = false;
  const ende = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    el.classList.remove('halten');
  };
  el.addEventListener('pointerdown', () => {
    if (pinGesetzt()) return;
    gehalten = false;
    el.style.setProperty('--halte', HALTEZEIT + 'ms');
    el.classList.add('halten');
    timer = setTimeout(() => {
      ende();
      gehalten = true;
      fn();
    }, HALTEZEIT);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => el.addEventListener(t, ende));
  el.addEventListener('contextmenu', (ev) => ev.preventDefault());
  el.addEventListener('click', (ev) => {
    ev.preventDefault();
    if (pinGesetzt()) pinDialog(fn);
    else if (!gehalten) hinweis(el, 'Für die Lehrkraft: lange drücken');
    gehalten = false;
  });
  return el;
}
