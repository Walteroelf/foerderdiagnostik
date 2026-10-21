// Protokolle als KI-freundlicher Text (Markdown) und als JSON-Datei.
import { SICHER_AB } from './testlauf.js';
import { foerderziele } from './foerderziele.js';

const datumText = (iso) =>
  new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
const tagText = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const sek = (ms) => (ms / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' s';
const prozent = (x) => Math.round(x * 100) + ' %';
const median = (werte) => {
  if (!werte.length) return 0;
  const s = [...werte].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const TYP_NAMEN = {
  zuordnen: 'Bild-Symbol-Zuordnung',
  buchstabe: 'Buchstaben erkennen',
  anlaut: 'Anlaute hören',
  endlaut: 'Endlaute hören',
  vokal: 'Vokale im Wort hören',
  silben: 'Silben gliedern',
  wortbild: 'Wörter lesen',
  buchstabezuordnen: 'Buchstaben zuordnen',
  legen: 'Wörter legen',
  menge: 'Mengen vergleichen',
  simultan: 'Mengen auf einen Blick erfassen',
  zahlmenge: 'Zahl und Menge zuordnen',
  rechnen: 'Rechnen',
  satz: 'Sätze verstehen',
  textfrage: 'Textverständnis',
  schreibweise: 'Rechtschreibmuster',
  satzlegen: 'Diktierte Sätze legen',
  beschriften: 'Bilder beschriften',
  stellenwert: 'Zehner und Einer',
  geld: 'Geld zählen',
  uhr: 'Uhr lesen',
  textaufgabe: 'Textaufgaben',
  hoeren: 'Hörverstehen',
};

// Hinweise auf zählendes Rechnen und nicht-simultane Mengenerfassung (über die Bearbeitungszeit)
function matheHinweise(test) {
  const alle = Object.values(test.stufen).flatMap((s) => s.antworten);
  const out = [];
  const gross = alle.filter((a) => a.typ === 'simultan' && a.richtig && /^[4-9]/.test(a.aufgabe));
  if (gross.length >= 2 && median(gross.map((a) => a.zeitMs)) > 4000) {
    out.push(`Mengen ab 4 wurden richtig, aber langsam erkannt (Median ${sek(median(gross.map((a) => a.zeitMs)))}). Das spricht für Abzählen statt simultaner Erfassung.`);
  }
  const ohneBild = alle.filter((a) => a.typ === 'rechnen' && !a.aufgabe.includes('Bildern'));
  if (ohneBild.length >= 2) {
    const m = median(ohneBild.map((a) => a.zeitMs));
    const einsDaneben = ohneBild.filter((a) => a.fehlerTyp?.startsWith('Abweichung um 1')).length;
    if (m > 6000 || einsDaneben >= 2) {
      out.push(`Hinweis auf zählendes Rechnen: Aufgaben ohne Bilder dauerten im Median ${sek(m)}` + (einsDaneben ? `, ${einsDaneben}× lag das Ergebnis um 1 daneben.` : '.'));
    }
  }
  return out;
}

export function stufenBewertung(antworten) {
  const r = antworten.filter((a) => a.richtig).length;
  const q = antworten.length ? r / antworten.length : 0;
  const urteil = q >= SICHER_AB ? 'sicher' : q >= 0.5 ? 'teilweise sicher' : 'noch nicht sicher';
  return { r, n: antworten.length, q, urteil };
}

export function schuelerText(test, fruehere = []) {
  const z = [];
  z.push(`# Schülerprotokoll Förderdiagnostik: ${test.bereichTitel}`);
  z.push('');
  z.push(`- Pseudonym: ${test.pseudonym}`);
  z.push(`- Datum: ${datumText(test.datum)}`);
  z.push(`- Bereich: ${test.bereichTitel}`);
  z.push(`- Einstiegsstufe: ${test.einstiegsstufe}`);
  z.push(`- Durchlaufene Stufen: ${test.verlauf.join(' → ')}`);
  const erreicht = test.erreichteStufe
    ? `Stufe ${test.erreichteStufe} (${test.stufen[test.erreichteStufe].name})`
    : `keine Stufe sicher (unterhalb von Stufe ${Math.min(...test.verlauf)})`;
  z.push(`- Sicher erreichte Stufe: ${erreicht}`);
  if (test.bedienung) z.push(`- Bedienung: ${test.bedienung}`);
  if (test.abgebrochen) z.push('- Hinweis: Der Test wurde vorzeitig beendet.');
  z.push('');
  z.push('## Ergebnisse je Stufe');
  const alleFehler = {};
  for (const s of Object.keys(test.stufen).map(Number).sort((a, b) => a - b)) {
    const st = test.stufen[s];
    if (!st.antworten.length) continue;
    const b = stufenBewertung(st.antworten);
    const zeit = median(st.antworten.map((a) => a.zeitMs));
    z.push('');
    z.push(`### Stufe ${s} – ${st.name}`);
    z.push(`${b.r} von ${b.n} richtig (${prozent(b.q)}), Bewertung: ${b.urteil}. Mittlere Bearbeitungszeit (Median): ${sek(zeit)}.`);
    const art = (a) => a.kategorie || TYP_NAMEN[a.typ] || a.typ;
    const typen = [...new Set(st.antworten.map(art))];
    if (typen.length > 1) {
      for (const t of typen) {
        const tb = stufenBewertung(st.antworten.filter((a) => art(a) === t));
        z.push(`- ${t}: ${tb.r} von ${tb.n} richtig`);
      }
    }
    const falsch = st.antworten.filter((a) => !a.richtig);
    if (falsch.length) {
      z.push('- Fehler:');
      for (const f of falsch) {
        z.push(`  - ${f.aufgabe}: ${f.fehler}${f.gesprochen ? ` (gesagt: „${f.gesprochen}“)` : ''} (${sek(f.zeitMs)})`);
        alleFehler[f.fehlerTyp] = (alleFehler[f.fehlerTyp] || 0) + 1;
      }
    } else {
      z.push('- Keine Fehler.');
    }
    const langsam = st.antworten.filter((a) => a.zeitMs > Math.max(2 * zeit, 8000));
    if (langsam.length) z.push(`- Auffällig lange Bearbeitungszeit bei: ${langsam.map((a) => a.aufgabe).join('; ')}`);
  }
  if (test.bereich === 'mathe') {
    const hinweise = matheHinweise(test);
    if (hinweise.length) {
      z.push('');
      z.push('## Hinweise aus der Bearbeitungszeit');
      hinweise.forEach((x) => z.push(`- ${x}`));
    }
  }
  z.push('');
  z.push('## Fehlermuster');
  const muster = Object.entries(alleFehler).sort((a, b) => b[1] - a[1]);
  if (muster.length) muster.forEach(([t, n]) => z.push(`- ${t}: ${n}×`));
  else z.push('- Keine Fehler aufgetreten.');
  const ziele = foerderziele(test);
  if (ziele.length) {
    z.push('');
    z.push('## Vorschläge für Förderziele');
    const punkt = (t) => (/[.!?]$/.test(t) ? t : t + '.');
    ziele.forEach((f, i) => z.push(`${i + 1}. ${punkt(f.ziel)} Grund: ${f.warum}. Übungsidee: ${f.idee}.`));
  }
  const vorher = fruehere.filter((t) => t.id !== test.id && t.bereich === test.bereich && t.datum < test.datum);
  if (vorher.length) {
    z.push('');
    z.push('## Frühere Tests (gleiches Pseudonym, gleicher Bereich)');
    for (const t of vorher) {
      z.push(`- ${tagText(t.datum)}: Einstieg Stufe ${t.einstiegsstufe}, sicher erreicht: ${t.erreichteStufe ? 'Stufe ' + t.erreichteStufe : 'keine Stufe'}`);
    }
  }
  z.push('');
  z.push('## Hinweis für die KI');
  z.push(
    'Dies ist ein informelles Förderdiagnostik-Protokoll aus einer Förderschule mit dem Schwerpunkt körperliche und motorische Entwicklung (NRW), keine standardisierte Diagnostik. ' +
      'Bitte leite daraus passgenaues Arbeitsmaterial auf der Stufe knapp oberhalb der sicher erreichten Stufe ab, greife die Fehlermuster und die vorgeschlagenen Förderziele gezielt auf und ' +
      'berücksichtige, falls vorhanden, das Kompetenzprotokoll der Lehrkraft (Motorik, Antwortformen, bearbeitbare Formate, Wahrnehmung).'
  );
  return z.join('\n');
}

export function bogenText(bogen, bogenDef) {
  const z = [];
  z.push('# Kompetenzprotokoll der Lehrkraft');
  z.push('');
  z.push(`- Pseudonym: ${bogen.pseudonym}`);
  z.push(`- Stand: ${datumText(bogen.aktualisiert)}`);
  for (const bereich of bogenDef.bereiche) {
    const zeilen = [];
    for (const item of bereich.items) {
      const wert = bogen.antworten[`${bereich.id}.${item.id}`];
      if (wert) zeilen.push(`- ${item.text}: ${wert}`);
    }
    const notiz = bogen.notizen?.[bereich.id];
    if (notiz) zeilen.push(`- Notiz: ${notiz}`);
    if (zeilen.length) {
      z.push('');
      z.push(`## ${bereich.titel}`);
      z.push(...zeilen);
    }
  }
  z.push('');
  z.push('## Hinweis für die KI');
  z.push(
    'Diese Einschätzung der Lehrkraft beschreibt, unter welchen Bedingungen das Kind arbeiten kann. ' +
      'Bitte richte Format, Umfang, Schriftgröße, Abstraktionsebene und Antwortform des Materials danach aus.'
  );
  return z.join('\n');
}

export function lautleseText(r, fruehere = []) {
  const z = [];
  z.push('# Protokoll lautes Lesen');
  z.push('');
  z.push(`- Pseudonym: ${r.pseudonym}`);
  z.push(`- Datum: ${datumText(r.datum)}`);
  z.push(`- Text: „${r.titel}“ (${r.niveau}, ${r.woerterGesamt} Wörter)`);
  z.push(`- Gelesen: ${r.woerterGelesen} von ${r.woerterGesamt} Wörtern in ${r.zeitSek} Sekunden`);
  z.push(`- Lesetempo: ${r.wpm} Wörter pro Minute, davon ${r.wcpm} richtig gelesen`);
  z.push(`- Genauigkeit: ${r.genauigkeit} %`);
  z.push(`- Fehler: ${r.fehler.length ? r.fehler.map((f) => `„${f.wort}“`).join(', ') : 'keine'}`);
  z.push(`- Selbstkorrekturen: ${r.korrigiert.length ? r.korrigiert.map((f) => `„${f.wort}“`).join(', ') : 'keine'}`);
  if (r.notiz) z.push(`- Beobachtung der Lehrkraft: ${r.notiz}`);
  const vorher = fruehere.filter((x) => x.id !== r.id && x.datum < r.datum);
  if (vorher.length) {
    z.push('');
    z.push('## Frühere Messungen');
    vorher.forEach((x) => z.push(`- ${tagText(x.datum)}: „${x.titel}“, ${x.wcpm} richtig gelesene Wörter pro Minute, ${x.genauigkeit} % Genauigkeit`));
  }
  z.push('');
  z.push('## Hinweis für die KI');
  z.push('Das Kind hat den Text laut vorgelesen, die Lehrkraft hat Fehler mitgetippt. Bitte leite passende Leseübungen ab (z. B. Silbenlesen, Blitzlesen, Lautlesetandem) und greife die falsch gelesenen Wörter auf.');
  return z.join('\n');
}

export function gesamtText(tests, bogen, bogenDef, lesen = []) {
  const ebene = (text) => text.replace(/^# /m, '## ').replace(/\n### /g, '\n#### ').replace(/\n## /g, '\n### ');
  const teile = ['# Gesamtprotokoll Förderdiagnostik', '', `Pseudonym: ${(bogen || tests[0] || lesen[0]).pseudonym}`, ''];
  if (bogen) teile.push(ebene(bogenText(bogen, bogenDef)));
  for (const t of tests) teile.push('', ebene(schuelerText(t, tests)));
  for (const r of lesen) teile.push('', ebene(lautleseText(r, lesen)));
  teile.push('', '## Auftrag an die KI');
  teile.push(
    'Bitte erstelle auf Grundlage des Kompetenzprotokolls und der Schüler- und Leseprotokolle konkretes, sofort einsetzbares Arbeitsmaterial ' +
      '(z. B. 2–3 Arbeitsblätter) sowie kurze Förderhinweise für die Lehrkraft.'
  );
  return teile.join('\n');
}

const slug = (s) =>
  s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function dateiname(art, pseudonym, zusatz, endung) {
  const tag = new Date().toISOString().slice(0, 10);
  return [art, slug(pseudonym), zusatz, tag].filter(Boolean).join('_') + '.' + endung;
}
