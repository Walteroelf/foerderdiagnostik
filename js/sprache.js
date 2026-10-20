// Sprachausgabe über die Web Speech API (läuft lokal auf dem iPad).
let stimme = null;

function waehleStimme() {
  if (!('speechSynthesis' in window)) return;
  const stimmen = window.speechSynthesis.getVoices();
  stimme =
    stimmen.find((v) => v.lang === 'de-DE' && /Anna|Helena|Petra|Marlene/i.test(v.name)) ||
    stimmen.find((v) => v.lang === 'de-DE') ||
    stimmen.find((v) => (v.lang || '').toLowerCase().startsWith('de')) ||
    null;
}

if ('speechSynthesis' in window) {
  waehleStimme();
  window.speechSynthesis.addEventListener?.('voiceschanged', waehleStimme);
}

export const spracheVerfuegbar = () => 'speechSynthesis' in window;

export function sprich(text) {
  if (!spracheVerfuegbar() || !text) return;
  const s = window.speechSynthesis;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  if (stimme) u.voice = stimme;
  u.rate = 0.85;
  s.speak(u);
}

export function stopp() {
  if (spracheVerfuegbar()) window.speechSynthesis.cancel();
}
