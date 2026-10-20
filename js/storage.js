// Lokale Speicherung im Browser (localStorage). Es wird nichts übertragen.
const PREFIX = 'fd1:';

export const normPseudonym = (p) => String(p || '').trim().replace(/\s+/g, ' ').toLowerCase();

function lies(key, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function schreibe(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const speicher = {
  pseudonyme() {
    return lies('pseudonyme', []);
  },
  merkePseudonym(p) {
    const liste = this.pseudonyme();
    if (!liste.some((x) => normPseudonym(x) === normPseudonym(p))) {
      liste.push(p);
      schreibe('pseudonyme', liste);
    }
  },
  kenntPseudonym(p) {
    return this.pseudonyme().some((x) => normPseudonym(x) === normPseudonym(p));
  },
  // Schülertests: Liste je Pseudonym
  tests(p) {
    return lies('tests:' + normPseudonym(p), []);
  },
  speichereTest(test) {
    this.merkePseudonym(test.pseudonym);
    const liste = this.tests(test.pseudonym);
    const i = liste.findIndex((t) => t.id === test.id);
    if (i >= 0) liste[i] = test;
    else liste.push(test);
    liste.sort((a, b) => a.datum.localeCompare(b.datum));
    return schreibe('tests:' + normPseudonym(test.pseudonym), liste);
  },
  // Lautes Lesen: Liste je Pseudonym
  lautlesen(p) {
    return lies('lautlesen:' + normPseudonym(p), []);
  },
  speichereLautlesen(r) {
    this.merkePseudonym(r.pseudonym);
    const liste = this.lautlesen(r.pseudonym).filter((x) => x.id !== r.id);
    liste.push(r);
    liste.sort((a, b) => a.datum.localeCompare(b.datum));
    return schreibe('lautlesen:' + normPseudonym(r.pseudonym), liste);
  },
  // Kompetenzbogen: aktuelle Fassung je Pseudonym
  bogen(p) {
    return lies('bogen:' + normPseudonym(p), null);
  },
  speichereBogen(bogen) {
    this.merkePseudonym(bogen.pseudonym);
    return schreibe('bogen:' + normPseudonym(bogen.pseudonym), bogen);
  },
  loescheAlles() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignorieren */
    }
  },
};
