// Gesamtexport aller Daten eines Pseudonyms. Jeder Export bekommt einen Zeitstempel und wird gemerkt,
// damit spätere Exporte zeigen, was seitdem neu ist. Ein Export enthält immer den kompletten Stand.
import { speicher } from './storage.js';
import { gesamtText, dateibasis, istNeu } from './protokoll.js';

export function erstelleGesamtexport(p, bogenDef) {
  const exportiertAm = new Date().toISOString();
  const tests = speicher.tests(p);
  const lesen = speicher.lautlesen(p);
  const bogen = speicher.bogen(p);
  const vorher = speicher.exporte(p);
  const letzterExport = vorher.length ? vorher[vorher.length - 1] : null;
  const exportNr = vorher.length + 1;
  const neu = (liste) => liste.filter((x) => istNeu(x, letzterExport)).map((x) => x.id);
  const json = {
    typ: 'gesamtexport',
    version: 2,
    pseudonym: p,
    exportiertAm,
    exportNr,
    vorherigerExport: letzterExport?.zeitpunkt || null,
    neuSeitLetztemExport: {
      tests: neu(tests),
      lautlesen: neu(lesen),
      kompetenzbogen: !!bogen && istNeu(bogen, letzterExport),
    },
    kompetenz: bogen,
    tests,
    lautlesen: lesen,
  };
  const anzahlNeu = json.neuSeitLetztemExport.tests.length + json.neuSeitLetztemExport.lautlesen.length + (json.neuSeitLetztemExport.kompetenzbogen ? 1 : 0);
  return {
    leer: !tests.length && !lesen.length && !bogen,
    json,
    text: gesamtText({ pseudonym: p, tests, bogen, bogenDef, lesen, exportiertAm, letzterExport, exportNr }),
    basis: dateibasis('gesamtexport', p, '', exportiertAm),
    exportiertAm,
    exportNr,
    letzterExport,
    anzahlNeu,
    laufend: tests.filter((t) => t.status === 'laufend').length,
    // Erst beim tatsächlichen Sichern, Kopieren oder Teilen aufrufen
    merken: () => speicher.merkeExport(p, { zeitpunkt: exportiertAm, nr: exportNr, tests: tests.length, lautlesen: lesen.length, kompetenzbogen: !!bogen }),
  };
}
