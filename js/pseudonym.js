// Kindgerechte Pseudonyme aus Farbe, Tier und Zahl, z. B. „Blauer Fuchs 47“.
// Nur männliche Tiernamen, damit die Farbform immer passt.
const FARBEN = ['Blauer', 'Roter', 'Grüner', 'Gelber', 'Bunter', 'Goldener', 'Silberner', 'Weißer', 'Brauner', 'Schwarzer'];
const TIERE = ['Fuchs', 'Bär', 'Igel', 'Hase', 'Löwe', 'Tiger', 'Pinguin', 'Delfin', 'Biber', 'Dachs',
  'Elch', 'Falke', 'Frosch', 'Wal', 'Uhu', 'Luchs', 'Otter', 'Panda', 'Koala', 'Papagei'];

const zufall = (liste) => liste[Math.floor(Math.random() * liste.length)];

export function erzeugePseudonym(vorhanden = []) {
  const belegt = new Set(vorhanden.map((p) => p.toLowerCase()));
  for (let i = 0; i < 50; i++) {
    const p = `${zufall(FARBEN)} ${zufall(TIERE)} ${10 + Math.floor(Math.random() * 90)}`;
    if (!belegt.has(p.toLowerCase())) return p;
  }
  return `${zufall(FARBEN)} ${zufall(TIERE)} ${100 + Math.floor(Math.random() * 900)}`;
}

// Prüft, ob eine Eingabe wie ein App-Pseudonym aussieht (Schutz vor Klarnamen).
export function siehtAusWiePseudonym(text) {
  const teile = String(text).trim().split(/\s+/);
  if (teile.length !== 3) return false;
  const [farbe, tier, zahl] = teile;
  const gleich = (a, b) => a.toLowerCase() === b.toLowerCase();
  return FARBEN.some((f) => gleich(f, farbe)) && TIERE.some((t) => gleich(t, tier)) && /^\d{2,3}$/.test(zahl);
}

// Schreibweise vereinheitlichen: „blauer fuchs 47“ → „Blauer Fuchs 47“
export function schoenesPseudonym(text) {
  return String(text)
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
