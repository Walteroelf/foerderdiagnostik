// Vorschläge für Förderziele aus einem Schülerprotokoll (regelbasiert, keine KI).
// Jede Regel verbindet ein Fehlermuster mit einem konkreten Ziel und einer Übungsidee.
const REGELN = [
  [/^Zuordnung$/, 'Bilder und Symbole sicher zuordnen', 'mit echten Gegenständen beginnen, dann Foto, dann Symbol'],
  [/^Buchstabenverwechslung$/, 'Formähnliche Buchstaben unterscheiden (z. B. b/d/p, m/n)', 'Buchstaben nachfahren, tasten, im Sand schreiben; immer nur ein Paar gleichzeitig'],
  [/^Groß-Klein-Zuordnung$/, 'Groß- und Kleinbuchstaben einander zuordnen', 'Memory mit Groß- und Kleinbuchstaben'],
  [/^Anlaut$|\(Anlaut\)/, 'Anlaute sicher heraushören', 'Anlauttabelle, Bild-Anlaut-Sortieren, Lautgebärden'],
  [/^Endlaut$/, 'Endlaute heraushören', 'Wörter gedehnt sprechen und auf das Ende achten, Reimpaare, Endlaut-Bingo'],
  [/^Vokal im Wort$/, 'Vokale im Wort heraushören (Selbstlaute)', 'Vokale gedehnt sprechen, Vokal-Handzeichen oder Lautgebärden, Wörter mit Vokalwechsel legen (Hut, Hat, Hit)'],
  [/^Silbengliederung$/, 'Wörter in Silben gliedern', 'Silben klatschen oder schwingen, Silbenbögen einzeichnen'],
  [/\((Vokal|Wortmitte)\)/, 'Wörter vollständig durchlesen, besonders die Vokale in der Wortmitte', 'Silbenlesen mit farbigen Silben, Wörter mit Vokalwechsel (Hase/Hose)'],
  [/\((Endlaut|Wortende|Zusätzlicher Laut)\)/, 'Wörter bis zum Ende genau lesen', 'Wortpaare mit unterschiedlichem Ende vergleichen, Blitzlesen mit Kontrolle'],
  [/^Laut ausgelassen$/, 'Alle Laute eines Wortes verschriften', 'Wort langsam mitsprechen (gedehnt), Laute mit Lautgebärden oder Klötzen abzählen'],
  [/^Laut hinzugefügt$/, 'Nur die hörbaren Laute schreiben', 'Wörter mit Lautklötzen legen und kontrollieren'],
  [/^Laute vertauscht$/, 'Reihenfolge der Laute im Wort sichern', 'Anlaut, Inlaut, Endlaut einzeln bestimmen, Laute in Kästchen eintragen'],
  [/^(Laut ersetzt|Mehrere Laute ersetzt|Wort stark abweichend)$/, 'Laut-Buchstaben-Zuordnung festigen', 'Anlauttabelle nutzen, lautgetreue Wörter legen'],
  [/^Rechtschreibung: .*Übergeneralisierung/, 'Rechtschreibregeln gezielt statt überall anwenden', 'Wörter sortieren: mit und ohne Markierung, Vokallänge abhören (Punkt für kurz, Strich für lang), immer nur ein Muster gleichzeitig'],
  [/^Rechtschreibung: Doppelkonsonant/, 'Doppelkonsonanten nach kurzem Vokal', 'kurze und lange Vokale unterscheiden (Punkt und Strich), Silbenschwingen'],
  [/^Rechtschreibung: ie/, 'Langes i als „ie“ schreiben', 'Wörter mit ie sammeln und sortieren'],
  [/^Rechtschreibung: ck/, '„ck“ nach kurzem Vokal', 'kurze Vokale abhören, ck-Wörter sammeln'],
  [/^Rechtschreibung: Verlängern/, 'Wörter verlängern, um den Endbuchstaben zu finden (Hund – Hunde)', 'Verlängerungsspiel: Einzahl und Mehrzahl, Wortpaare legen (Zug – Züge), Strategie-Symbol auf dem Tisch'],
  [/^Rechtschreibung: Großschreibung: Satzanfang/, 'Satzanfang groß schreiben', 'Sätze mit Wortkarten legen, Anfang und Punkt markieren'],
  [/^(Großschreibung|Rechtschreibung: Großschreibung)/, 'Nomen erkennen und groß schreiben', 'Artikelprobe (der, die, das), Dinge im Raum benennen'],
  [/^Lautgetreu geschrieben, Rechtschreibmuster fehlt$/, 'Von der lautgetreuen zur richtigen Schreibung: Rechtschreibmuster einführen', 'lautgetreue Schreibung loben, dann ein Muster (z. B. Doppelkonsonant) gezielt üben, Stufe 4 der App wiederholen'],
  [/^Großschreibung oder Satzzeichen$/, 'Satzanfang groß, Punkt am Satzende', 'Sätze mit Wortkarten legen, Anfang und Punkt markieren'],
  [/^(Wortreihenfolge|Wort ausgelassen|Satz abweichend|Falsche Wortform gewählt)$/, 'Sätze vollständig und in richtiger Reihenfolge bilden', 'Sätze mit Wortkarten legen, Satz vorher laut sprechen'],
  [/^Satzverständnis: Satz mit Verneinung$/, 'Beim Lesen auf „nicht“ und „kein“ achten', 'Satzpaare mit und ohne Verneinung zu Bildern (Das ist ein Hund / Das ist kein Hund), Verneinungswörter farbig markieren'],
  [/^Satzverständnis: Satz mit Vergleich$/, 'Vergleichssätze verstehen (größer als, kleiner als)', 'Gegenstände real vergleichen und dazu Sätze lesen und legen'],
  [/^Satzverständnis/, 'Sätze sinnentnehmend lesen', 'Lesen und Malen, „stimmt / stimmt nicht“-Sätze zu Bildern'],
  [/^Textverständnis: Schlussfolgern$/, 'Aus Texten Schlüsse ziehen („zwischen den Zeilen lesen“)', 'Warum-Fragen und „Woher weißt du das?“ besprechen, Lesestrategien nach dem Prinzip der Textdetektive, Bilder zum Gelesenen auswählen'],
  [/^Textverständnis/, 'Informationen in kurzen Texten finden und W-Fragen beantworten', 'Text abschnittsweise lesen, Antworten im Text markieren, Fragewort (wer, wo, was) vorher klären'],
  [/^Hörverstehen: nur eine/, 'Zwei gehörte Angaben im Gedächtnis behalten', 'Aufträge mit zwei Dingen („Hol Ball und Stift“), anfangs mit Bildkarten als Stütze'],
  [/^Hörverstehen: Verneinung/, 'Verneinung verstehen („kein“, „nicht“)', 'Sortierspiele „ist ein Tier / ist kein Tier“, Wörter kein und nicht betonen'],
  [/^Hörverstehen: Eigenschaften/, 'Eigenschaftswörter verstehen (groß, klein, kalt, heiß, rund)', 'Gegenstände fühlen und vergleichen, Sortierspiele nach einer Eigenschaft, Gegensatzpaare'],
  [/^Hörverstehen: Geschichten: Reihenfolge/, 'Zeitliche Abfolge verstehen (zuerst, dann, bevor)', 'Handlungen mit Bildkarten in Reihenfolge legen, Tagesplan, Aufträge mit „zuerst … dann …“ ausführen'],
  [/^Hörverstehen: Geschichten: Schlussfolgern/, 'Aus Gehörtem Schlüsse ziehen', 'Rätsel („Ich bin gelb und krumm“), Warum-Fragen zu Alltagssituationen, Bilderbuch: Was passiert als Nächstes?'],
  [/^Hörverstehen: (Kurze )?Geschichten/, 'Kurze gehörte Geschichten verstehen und behalten', 'Geschichten mit Bildkarten nacherzählen, W-Fragen mit Bildauswahl'],
  [/^Hörverstehen: Funktionen/, 'Fragen zu Gebrauch und Oberbegriffen verstehen', 'Gegenstände nach Gebrauch sortieren (essen, anziehen, fahren), Wozu-Fragen im Alltag stellen'],
  [/^Hörverstehen: Wörter/, 'Alltagswörter verstehen (passiver Wortschatz)', 'echte Gegenstände und Bildkarten zeigen lassen, wenige Wörter gleichzeitig'],
  [/^Hörverstehen/, 'Gesprochene Sätze und Anweisungen verstehen', 'Anweisungen ausführen lassen (erst eine, dann zwei Angaben), Bilder zu gehörten Sätzen zeigen'],
  [/^Mengenvergleich/, 'Mengen vergleichen (mehr, weniger)', 'Eins-zu-eins-Zuordnung mit echten Gegenständen'],
  [/^Mengenerfassung/, 'Kleine Mengen auf einen Blick erfassen', 'Würfel- und Fingerbilder, Blitzblick mit Fünferstruktur'],
  [/^Nachbarzahl/, 'Zahlenreihe vorwärts und rückwärts sicher nutzen (Vorgänger, Nachfolger)', 'Zahlenstrahl und Hunderterkette, Zahlen-Treppe gehen, „eins mehr, eins weniger“ mit Plättchen'],
  [/^Zerlegung/, 'Zahlen zerlegen (Teil-Ganzes-Verständnis)', 'Schüttelbox, Zahlenhaus, verdeckte Plättchen („Wie viele sind unter dem Becher?“), Zerlegungen bis 10 auswendig'],
  [/^Zahl-Menge-Zuordnung$/, 'Zahl und Menge sicher verbinden', 'Zahlen legen und Mengen dazu zählen, Zahlenhaus'],
  [/^(Rechenfehler|Abweichung um 1)/, 'Vom zählenden Rechnen lösen', 'Zahlzerlegungen, Kraft der Fünf, Verdoppeln und Nachbaraufgaben'],
  [/^(Rechenart verwechselt|Plus statt mal)$/, 'Rechenzeichen beachten', 'Rechenzeichen vor dem Rechnen farbig markieren'],
  [/^Einmaleins/, 'Kernaufgaben des Einmaleins und Ableiten', 'zuerst 1·, 2·, 5·, 10·, dann Nachbaraufgaben ableiten'],
  [/^(Zahlendreher|Stellenwert|Zehner als Einer)/, 'Stellenwerte verstehen (Zehner und Einer)', 'Zehnerstangen und Einerwürfel, Stellenwerttafel, Zahlen sprechen und legen'],
  [/^Geldbetrag falsch$/, 'Geldbeträge bestimmen', 'Münzen sortieren, große Werte zuerst zählen, Kaufladen'],
  [/^Uhr: Halb-Verwechslung$/, 'Halbe Stunden lesen („halb 3“ = 2:30)', 'Lernuhr, halbe Stunde als „halb zur nächsten Stunde“ zeigen'],
  [/^Uhr: Viertel/, 'Viertelstunden lesen', 'Lernuhr mit Viertelteilen, Tagesablauf mit Uhrzeiten'],
  [/^Uhr:/, 'Stunden- und Minutenzeiger unterscheiden', 'Lernuhr mit farbigen Zeigern'],
  [/^Textaufgabe: Signalwort/, 'Sachaufgaben vom Inhalt her verstehen statt nach Signalwörtern zu rechnen', 'Rechengeschichten nachspielen oder zeichnen, Aufgaben mit „mehr“, die Minus verlangen, gezielt besprechen, eigene Rechengeschichten erfinden'],
  [/^Textaufgabe: eine Zahl aus dem Text/, 'Die Frage einer Sachaufgabe erfassen', 'Frage zuerst vorlesen und unterstreichen, Antwortsatz vorher anfangen („Ben hatte am Anfang …“)'],
  [/^Textaufgabe/, 'Textaufgaben verstehen', 'Aufgabe nachspielen oder zeichnen, Frage unterstreichen'],
];

function regelFuer(fehlerTyp) {
  return REGELN.find(([muster]) => muster.test(fehlerTyp || ''));
}

// Liefert bis zu vier Ziele: { ziel, warum, idee }
export function foerderziele(test) {
  const ziele = [];
  const n = test.naechsteStufe || naechsteAusProtokoll(test);
  if (n) {
    ziele.push({
      ziel: n.kompetenz || n.name,
      warum: `nächste Stufe, Stufe ${n.stufe}: ${n.name}`,
      idee: 'Material auf dieser Stufe anbieten, erst mit Hilfe, dann selbstständig',
    });
  }
  const zaehler = new Map();
  for (const st of Object.values(test.stufen)) {
    for (const a of st.antworten) {
      if (a.richtig) continue;
      const regel = regelFuer(a.fehlerTyp);
      if (!regel) continue;
      const eintrag = zaehler.get(regel) || { anzahl: 0, beispiele: [] };
      eintrag.anzahl++;
      if (eintrag.beispiele.length < 2) eintrag.beispiele.push(a.fehler);
      zaehler.set(regel, eintrag);
    }
  }
  const sortiert = [...zaehler.entries()].sort((a, b) => b[1].anzahl - a[1].anzahl);
  for (const [[, ziel, idee], e] of sortiert) {
    if (ziele.length >= 4) break;
    if (ziele.some((z) => z.ziel === ziel)) continue;
    ziele.push({ ziel, warum: `${e.anzahl}× im Test, z. B. ${e.beispiele.join('; ')}`, idee });
  }
  return ziele;
}

// Für ältere Protokolle ohne „naechsteStufe“: erste nicht sichere, bearbeitete Stufe oberhalb der erreichten
function naechsteAusProtokoll(test) {
  const ab = test.erreichteStufe || 0;
  const kandidat = Object.keys(test.stufen).map(Number).sort((a, b) => a - b).find((s) => s > ab);
  return kandidat ? { stufe: kandidat, ...test.stufen[kandidat] } : null;
}
