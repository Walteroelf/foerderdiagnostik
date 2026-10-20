// Sprachausgabe über die Web Speech API (läuft lokal auf dem iPad).
// Bevorzugt hochwertige Stimmen (Premium/Erweitert). Die Lehrkraft kann in den Einstellungen eine Stimme wählen.
const SCHLUESSEL = 'fd1:stimme';
const TEMPO_SCHLUESSEL = 'fd1:tempo';
let stimme = null;

const lies = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const schreib = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignorieren */
  }
};

// Bewertung: höhere Zahl = natürlicher klingende Stimme
function qualitaet(v) {
  const n = v.name.toLowerCase();
  let p = 0;
  if (/premium/.test(n)) p += 40;
  if (/enhanced|erweitert|verbessert|neural|natural|online/.test(n)) p += 30;
  if (/google/.test(n)) p += 15;
  if (/anna|helena|petra|marlene|vicki|katja|amala|seraphina/.test(n)) p += 5;
  if (v.lang === 'de-DE') p += 3;
  if (v.localService) p += 1;
  return p;
}

export function deutscheStimmen() {
  if (!spracheVerfuegbar()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => (v.lang || '').toLowerCase().replace('_', '-').startsWith('de'))
    .sort((a, b) => qualitaet(b) - qualitaet(a));
}

function waehleStimme() {
  const stimmen = deutscheStimmen();
  const gewuenscht = lies(SCHLUESSEL);
  stimme = stimmen.find((v) => v.voiceURI === gewuenscht) || stimmen[0] || null;
}

export function setzeStimme(voiceURI) {
  schreib(SCHLUESSEL, voiceURI);
  waehleStimme();
}

export const aktuelleStimme = () => stimme;
export const tempo = () => Number(lies(TEMPO_SCHLUESSEL)) || 0.9;
export const setzeTempo = (t) => schreib(TEMPO_SCHLUESSEL, String(t));

export const spracheVerfuegbar = () => 'speechSynthesis' in window;

if (spracheVerfuegbar()) {
  waehleStimme();
  window.speechSynthesis.addEventListener?.('voiceschanged', waehleStimme);
}

export function sprich(text) {
  if (!spracheVerfuegbar() || !text) return;
  const s = window.speechSynthesis;
  if (!stimme) waehleStimme();
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = stimme?.lang || 'de-DE';
  if (stimme) u.voice = stimme;
  u.rate = tempo();
  u.pitch = 1;
  s.speak(u);
}

export function stopp() {
  if (spracheVerfuegbar()) window.speechSynthesis.cancel();
}
