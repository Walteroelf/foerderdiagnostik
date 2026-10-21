// Motorische Hilfen für die Kinderansicht: Größe, Haltezeit, Sperrzeit und Tasterbedienung (Scanning).
// Die Einstellungen gelten für dieses Gerät.
const SCHLUESSEL = 'fd1:bedienung';
const STANDARD = { groesse: 'normal', haltezeit: 0, sperrzeit: 0, taster: 'aus', scanTempo: 2000, sprachantwort: 'aus' };

export function einstellungen() {
  try {
    return { ...STANDARD, ...JSON.parse(localStorage.getItem(SCHLUESSEL) || '{}') };
  } catch {
    return { ...STANDARD };
  }
}

export function speichereEinstellungen(neu) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify({ ...einstellungen(), ...neu }));
  } catch {
    /* ignorieren */
  }
  wendeAn();
}

export function wendeAn() {
  document.documentElement.dataset.groesse = einstellungen().groesse;
}

const sek = (ms) => (ms / 1000).toLocaleString('de-DE') + ' s';

// Kurzbeschreibung für das Protokoll
export function beschreibung() {
  const e = einstellungen();
  const teile = [];
  teile.push(e.taster === '1' ? `1 Taster mit automatischem Scanning (${sek(e.scanTempo)})` : e.taster === '2' ? '2 Taster (weiter / auswählen)' : 'Antippen');
  if (e.haltezeit) teile.push(`Haltezeit ${sek(e.haltezeit)}`);
  if (e.sperrzeit) teile.push(`Sperrzeit ${sek(e.sperrzeit)} nach jeder Aufgabe`);
  if (e.sprachantwort !== 'aus') teile.push(e.sprachantwort === 'auto' ? 'Antwort per Sprache (Mikrofon hört automatisch zu)' : 'Antwort per Sprache (Mikrofon-Knopf)');
  if (e.groesse !== 'normal') teile.push(e.groesse === 'gross' ? 'große Darstellung' : 'sehr große Darstellung');
  return teile.join(', ');
}

let sperreBis = 0;
const gesperrt = () => performance.now() < sperreBis;

// Macht ein Element in der Kinderansicht auswählbar (Tippen, Halten oder Taster).
export function aktivierbar(el, fn) {
  el.classList.add('scanbar');
  el._aktiviere = () => {
    if (!el.disabled && !gesperrt()) fn();
  };
  const { haltezeit } = einstellungen();
  if (haltezeit > 0) {
    let timer = null;
    const ende = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      el.classList.remove('halten');
    };
    el.addEventListener('pointerdown', (ev) => {
      if (el.disabled || gesperrt() || scan.aktiv && einstellungen().taster === '1') return;
      ev.preventDefault();
      el.style.setProperty('--halte', haltezeit + 'ms');
      el.classList.add('halten');
      timer = setTimeout(() => {
        ende();
        el._aktiviere();
      }, haltezeit);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => el.addEventListener(t, ende));
    el.addEventListener('contextmenu', (ev) => ev.preventDefault());
  } else {
    el.addEventListener('click', () => el._aktiviere());
  }
  return el;
}

// ---------- Scanning ----------
const scan = { aktiv: false, i: -1, timer: null, schluckeKlick: false };

// Reihenfolge: zuerst Antwortfelder und Kärtchen, dann Löschen und Fertig
const liste = () =>
  [...document.querySelectorAll('.scanbar')]
    .filter((el) => !el.disabled && el.isConnected)
    .map((el, i) => [el.matches('.option, .kaertchen, .taste') ? 0 : 1, i, el])
    .sort((x, y) => x[0] - y[0] || x[1] - y[1])
    .map((x) => x[2]);

function markiere() {
  document.querySelectorAll('.scanfokus').forEach((el) => el.classList.remove('scanfokus'));
  const l = liste();
  if (!l.length) return;
  scan.i = ((scan.i % l.length) + l.length) % l.length;
  const el = l[scan.i];
  el.classList.add('scanfokus');
  el.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
}

function schritt() {
  scan.i++;
  markiere();
}

function auswahl() {
  const el = liste()[scan.i];
  if (!el || gesperrt()) return;
  el._aktiviere?.();
  // Nach dem Auswählen (z. B. Buchstabenkärtchen) Markierung neu setzen
  setTimeout(() => scan.aktiv && markiere(), 50);
}

// Nach jedem Aufbau einer Kinderseite aufrufen
export function neueSeite() {
  sperreBis = performance.now() + einstellungen().sperrzeit;
  scanStopp();
  const e = einstellungen();
  if (e.taster === 'aus') return;
  scan.aktiv = true;
  scan.i = 0;
  document.activeElement?.blur?.();
  markiere();
  if (e.taster === '1') scan.timer = setInterval(schritt, e.scanTempo);
}

export function scanStopp() {
  scan.aktiv = false;
  clearInterval(scan.timer);
  scan.timer = null;
  document.querySelectorAll('.scanfokus').forEach((el) => el.classList.remove('scanfokus'));
}

// Leertaste/Eingabe sollen nicht zusätzlich einen fokussierten Knopf auslösen
document.addEventListener('keyup', (ev) => {
  if (scan.aktiv && [' ', 'Enter'].includes(ev.key)) ev.preventDefault();
});

document.addEventListener('keydown', (ev) => {
  if (!scan.aktiv) return;
  if (ev.repeat) return ev.preventDefault();
  const modus = einstellungen().taster;
  const weiterTaste = [' ', 'Tab', 'ArrowRight', 'ArrowDown', '1'].includes(ev.key);
  const auswahlTaste = ['Enter', 'ArrowLeft', '2'].includes(ev.key);
  if (modus === '1' && (weiterTaste || auswahlTaste)) {
    ev.preventDefault();
    auswahl();
  } else if (modus === '2') {
    if (weiterTaste) {
      ev.preventDefault();
      schritt();
    } else if (auswahlTaste) {
      ev.preventDefault();
      auswahl();
    }
  }
});

// 1-Taster-Modus: Tippen irgendwo auf den Bildschirm wählt das markierte Feld (außer Lehrkraft-Knöpfe).
document.addEventListener(
  'pointerdown',
  (ev) => {
    if (!scan.aktiv || einstellungen().taster !== '1' || ev.target.closest('.lehrkraft')) return;
    ev.preventDefault();
    ev.stopPropagation();
    scan.schluckeKlick = true;
    auswahl();
  },
  true
);
document.addEventListener(
  'click',
  (ev) => {
    if (scan.schluckeKlick && !ev.target.closest('.lehrkraft')) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    scan.schluckeKlick = false;
  },
  true
);
