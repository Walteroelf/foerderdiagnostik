# Förderdiagnostik-App

Informelles Förderdiagnostik-Werkzeug für die Förderschule KME. Läuft im Browser auf dem iPad (Safari), ohne Server, ohne Tracking. Alle Eingaben bleiben auf dem Gerät. Ersetzt keine standardisierte Diagnostik.

## Funktionen

- **Schülermodus:** Pseudonym erzeugen oder eingeben, Bereiche Lesen, Schreiben und Mathe mit je 5 Stufen und adaptiver Stufenanpassung, Schülerprotokoll.
  - Lesen: 1 Bild–Symbol, 2 Buchstaben/Anlaute/Silben, 3 Wort zum Bild, 4 Sätze „stimmt / stimmt nicht“, 5 kurze Texte mit Fragen.
  - Schreiben: 1 Buchstaben zuordnen, 2 Anfangsbuchstaben, 3 Wörter aus Kärtchen legen, 4 Rechtschreibmuster (Doppelkonsonant, ie, ck, Großschreibung), 5 diktierte Sätze legen und Bilder mit einer Buchstabentastatur beschriften. Fehleranalyse: ausgelassen, hinzugefügt, vertauscht, ersetzt, Großschreibung, Wortreihenfolge.
  - Mathe: 1 Mengen vergleichen, 2 Würfelbilder und Zahl–Menge, 3 Plus/Minus bis 20, 4 Zehner/Einer, Plus/Minus bis 100, Einmaleins, 5 Geld, Uhr, Textaufgaben. Hinweise auf zählendes Rechnen, Zahlendreher und Stellenwertfehler.
  - Viele Aufgaben werden bei jedem Test neu erzeugt (Mathe, Buchstaben, Anlaute, Silben, Bildzuordnung), damit Wiederholungstests vergleichbar bleiben, ohne dass sich Aufgaben wiederholen.
- **Lehrkraftmodus:**
  - Kompetenzbogen, unabhängig vom Schülertest und auf einem anderen iPad nutzbar.
  - Lautes Lesen: Das Kind liest einen Text vom iPad vor, die Lehrkraft tippt Fehler und Selbstkorrekturen mit. Ergebnis: richtig gelesene Wörter pro Minute, Genauigkeit, Fehlerwörter.
- **Protokolle:** Text zum Kopieren für Claude, Download als `.md` und `.json`, Import, Gesamtprotokoll aus Kompetenzbogen, Schüler- und Leseprotokollen.
- **Fortschritt:** Unter „Protokolle und Einstellungen“ zeigt jede Pseudonym-Karte die erreichten Stufen je Test und das Lesetempo im Verlauf.
- **Bedienung für das Kind** (motorische Hilfen, pro iPad): größere Antwortfelder, Haltezeit gegen versehentliches Tippen, Sperrzeit nach jeder Aufgabe, Tasterbedienung mit 1 Taster (automatisches Scanning, auch Tippen irgendwo) oder 2 Tastern (weiter/auswählen). Die gewählte Bedienung steht im Protokoll.
- **Vorlesestimme:** Die App nimmt automatisch die beste deutsche Stimme. In den Einstellungen lassen sich Stimme und Tempo wählen. Bessere Stimmen auf dem iPad: Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch (z. B. „Anna (Premium)“ laden).
- **Symbole:** Emoji als Ersatz; ARASAAC-Piktogramme lassen sich in der App einmalig laden; eigene Symbole (z. B. METACOM) und Fotos werden nur lokal gespeichert.

## Adaptive Logik

Je Stufe 6 Aufgaben. Ab 80 % richtig geht es eine Stufe hoch, unter 50 % eine Stufe runter, sonst endet der Test. Jede Stufe wird höchstens einmal bearbeitet. „Sicher erreicht“ ist die höchste Stufe mit mindestens 80 %. Das Kind bekommt nach jeder Antwort ein ermutigendes Feedback, das nicht verrät, ob die Antwort richtig war.

## Veröffentlichen über GitHub Pages

1. Auf github.com ein neues Repository anlegen (z. B. `foerderdiagnostik`).
2. Alle Dateien aus diesem Ordner hochladen („Add file“ → „Upload files“), sodass `index.html` direkt im Hauptverzeichnis liegt.
3. Im Repository: **Settings → Pages → Source: Deploy from a branch → Branch: main / (root) → Save**.
4. Nach ein bis zwei Minuten ist die App unter `https://<benutzername>.github.io/foerderdiagnostik/` erreichbar.
5. Auf dem iPad in Safari öffnen, **Teilen → Zum Home-Bildschirm**. Danach funktioniert die App auch offline.

Nach Änderungen an der App in `sw.js` die `VERSION` erhöhen, damit die iPads die neue Fassung laden.

## Lokal testen

Die App braucht einen kleinen Webserver (Dateien direkt per Doppelklick öffnen funktioniert nicht):

```
python3 -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen.

## Aufbau

```
index.html               Einstieg
css/app.css              Gestaltung (reizarm, große Schaltflächen)
js/main.js               Bildschirme und Ablauf
js/testlauf.js           Adaptive Stufenlogik und Bewertung
js/protokoll.js          Protokolltexte für die KI
js/pseudonym.js          Pseudonyme „Farbe Tier Zahl“
js/storage.js            Lokale Speicherung (localStorage)
js/symbole.js            Bilder: eigene Fotos/Symbole, ARASAAC, Emoji (IndexedDB)
js/sprache.js            Sprachausgabe (Web Speech API)
data/lesen.json          Aufgaben Lesen
data/rechtschreibung.json Aufgaben Schreiben
data/mathe.json          Aufgaben Mathe
data/lautlesen.json      Texte für das laute Lesen
js/aufgaben.js           Darstellung der Aufgaben
js/generatoren.js        Automatisch erzeugte Aufgaben
js/bedienung.js          Motorische Hilfen und Tasterbedienung
data/woerter.json        Wortschatz mit Emoji und ARASAAC-Suchwort
data/kompetenzbogen.json Fragen des Kompetenzbogens
sw.js, manifest.webmanifest  Offline-Nutzung (PWA)
```

Neue Aufgaben werden in den JSON-Dateien ergänzt. Neue Wörter brauchen einen Eintrag in `data/woerter.json`.

## Datenschutz

- Keine Klarnamen: Die App fragt nie nach Namen oder Geburtsdaten und warnt, wenn etwas eingegeben wird, das nicht wie ein Pseudonym aussieht.
- Die Zuordnung Pseudonym → Kind steht nur auf dem Papier der Lehrkraft.
- Daten liegen im Browser. Beim Löschen der Safari-Daten sind sie weg, deshalb Protokolle als Datei sichern.
- Einzige Internetverbindung: das freiwillige Laden der ARASAAC-Symbole. Dabei werden nur die Suchwörter (z. B. „Maus“) übertragen.

## Lizenzen

Piktogramme: Sergio Palao. Herkunft: ARASAAC (https://arasaac.org). Lizenz: CC BY-NC-SA 4.0. Eigentum: Regierung von Aragonien (Spanien). Die Piktogramme sind nicht in diesem Repository enthalten, sondern werden auf dem Gerät geladen. Eigene Symbolsätze wie METACOM werden nur lokal gespeichert und nie veröffentlicht.
