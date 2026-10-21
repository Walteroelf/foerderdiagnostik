// Eigene Wörter und Vorlesetexte der Lehrkraft (nur auf diesem Gerät, übertragbar per QR-Code)
const WOERTER = 'fd1:eigeneWoerter';
const TEXTE = 'fd1:eigeneTexte';

const lies = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null') ?? d;
  } catch {
    return d;
  }
};
const schreib = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
};

export const eigeneWoerter = () => lies(WOERTER, {});
export const eigeneTexte = () => lies(TEXTE, []);

export const schluesselFuer = (wort) =>
  'e_' + wort.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '');

export function speichereWort(eintrag) {
  const alle = eigeneWoerter();
  alle[schluesselFuer(eintrag.wort)] = { ...eintrag, eigen: true };
  return schreib(WOERTER, alle);
}

export function loescheWort(key) {
  const alle = eigeneWoerter();
  delete alle[key];
  return schreib(WOERTER, alle);
}

export function speichereText(t) {
  const alle = eigeneTexte().filter((x) => x.id !== t.id);
  alle.push({ ...t, eigen: true });
  return schreib(TEXTE, alle);
}

export function loescheText(id) {
  return schreib(TEXTE, eigeneTexte().filter((x) => x.id !== id));
}

// Übernimmt eigene Inhalte von einem anderen Gerät (vorhandene gleichen Namens werden ersetzt)
export function uebernehmeEigenes({ woerter = {}, texte = [] }) {
  schreib(WOERTER, { ...eigeneWoerter(), ...woerter });
  const ids = new Set(texte.map((t) => t.id));
  schreib(TEXTE, [...eigeneTexte().filter((t) => !ids.has(t.id)), ...texte]);
  return Object.keys(woerter).length + texte.length;
}

// Zerlegt ein Wort in Buchstabenkärtchen (sch, ch, ei, au, eu, äu, ie, qu bleiben zusammen)
export function graphemeVon(wort) {
  const teile = wort.match(/sch|ch|ei|au|eu|äu|ie|qu|./gi) || [];
  return teile.map((t, i) => (i === 0 ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t.toLowerCase()));
}
