# P1 – Praxisabnahme: Regal und Holzrahmen

Stand: 20.10.2026 · Codex · Zweig `codex/P1`, Basis `main` (`1e55f80`).
Dieser Bericht betrifft freie Konstruktion, Änderungen und Ausgabe. Er schließt
weder P1 insgesamt noch den parallelen U9–U12-Ausbau ab. Kein Merge nach main.

## Referenzen und Wiederholung

Die Dateien unter [examples/practice-p1](../examples/practice-p1/) wurden im
Browser über die normalen Zeichen-, Kopier-, Eigenschafts- und Verbindungswerkzeuge
erstellt und heruntergeladen. Sie enthalten freie Bauteile, keine Generatoren.

| Projekt | Ausgangsdatei | Geänderter Stand | Ausgabe |
|---|---|---|---|
| Regal | `regal-800.owc` | `regal-900.owc` | `regal-900.csv`, `regal-900.pdf` (8 A3-Blätter) |
| Holzrahmen | `holzrahmen-2000.owc` | `holzrahmen-2000-edited.owc` | `holzrahmen-2000-edited.csv`, `holzrahmen-2000-edited.pdf` (7 A3-Blätter) |

PNG-Dateien zeigen die wieder geöffneten Modelle und die gerenderten
PDF-Ansichtsblätter. CSV und PDF sind über die vorhandene Oberfläche exportiert,
nicht als Ersatz für eine fehlende Ausgabe von Hand geschrieben.

Gezielte Wiederholung ohne neue Abhängigkeiten:

```sh
node scripts/check-practice-p1.mjs
npm test -- --maxWorkers=1 --minWorkers=1
npm run build
```

Das Skript prüft die gespeicherten Referenzen und vorhandene Sicherheitsfälle.
Es zeichnet die Modelle nicht automatisch im Browser und überschreibt keine
Referenzdateien. Bei absichtlichen Modelländerungen CSV/PDF erneut über die
Oberfläche erzeugen und visuell prüfen; die Tests vergleichen sie mit dem Modell.

## Tatsächlich ausgeführte Browserabläufe

Testinstanz: `http://127.0.0.1:5191/`, isolierter Browser-Origin. Bestehende
Vorschauen auf anderen Ports und parallele U9-Arbeit wurden nicht verändert.

### Regal

1. Frei zeichnen → Platte, feste YZ-Ebene, senkrechte Ansicht. Startpunkt am
   Ebenenursprung, Maßausdruck `300x1200`, Stärke 19. Als „Seite links“ benennen.
2. Über Bearbeiten → Duplizieren kopieren. Rechte Seite auf X=781, Y=300, Z=0
   setzen. Die YZ-Platten haben lokale Länge entlang Z, Breite entlang −Y.
3. Auf XY eine Platte `762x300` zeichnen; Ursprung X=19, Y=0, Z=0. Durch Kopieren
   Deckel bei Z=1181 und Einlegeböden bei Z=400/800 erstellen.
4. Boden/Deckel jeweils mit beiden Seiten über Konfirmat verbinden. Im Dialog
   A/B so wählen, dass der horizontale Boden A und die Seite B ist. Jede Vorschau
   vor Übernehmen durch den Geometriekern prüfen lassen. Vier Verbindungen,
   insgesamt acht Konfirmatschrauben und acht Kappen.
5. Ausgangsstand 800×300×1200 als OWC speichern. Rechte Seite auf X=881 und alle
   vier horizontalen Platten auf Länge 862 ändern. Unteren Einlegeboden auf Z=450.
   Freie Teile besitzen keine automatische Beziehung „Korpusbreite“; alle
   betreffenden Maße wurden ausdrücklich geändert.
6. Direkten Modellmaßentwurf 950 per Escape verwerfen: 862 bleibt. Entwurf 850
   übernehmen, einmal Undo: 862; Redo und Undo ebenfalls ausgeführt.
7. Nach dem unten beschriebenen Eingabefehler die Länge im Eigenschaftenfeld
   auf 999 setzen, Escape, anderes Feld anklicken: 862 bleibt, Auswahl bleibt.
   Dieselbe Prüfung mit einem geänderten Bauteilnamen ausgeführt.
8. Als „P1 Regal 900“ speichern, CSV und alle PDF-Blätter erzeugen. Seite neu
   laden und anschließend gespeicherte `regal-900.owc` über Datei öffnen importieren.
   Sechs Teile, vier Verbindungen, Länge 862 und Bodenhöhe 450 bleiben erhalten.

### Holzrahmen

1. Neues freies Projekt, feste XZ-Ebene mit Y=0. Balkenquerschnitt 120×60:
   120 mm in der Rahmenebene, 60 mm Tiefe entlang −Y.
2. Schwelle mit `2000@0` zeichnen, Rohteilursprung auf [0,0,0] setzen. Kopie als
   Rähm auf [0,0,2280] platzieren.
3. Ständer mit `2400@90` zeichnen; Ursprung [120,0,0], lokale Querachse −X.
   Rechten Ständer als Kopie auf [2000,0,0] setzen.
4. Zwei weitere Kopien auf Länge 2160 setzen, Ursprünge [746,0,120] und
   [1374,0,120]. Lichte Zwischenräume 506/508/506 mm; bewusst ganzzahlige Positionen.
5. Vier Eckkontakte der äußeren Ständer mit Schwelle/Rähm als Überblattung
   verbinden. Grundzustand jeweils Anteil 0,5. Außenmaße 2000×60×2400.
6. Linke untere Verbindung öffnen, Anteil 0,4 einstellen und abbrechen. Beim
   erneuten Öffnen steht wieder 0,5. Dann auf 0,6 ändern, übernehmen, Undo/Redo.
   OWC speichern und wieder über Datei öffnen importieren: 0,6 bleibt erhalten.
   Die zugehörigen Bearbeitungstiefen sind komplementär 24/36 mm.
7. Holzliste als CSV und vollständige PDF ausgeben. Sechs Bauteile, fünf
   Positionen; die unterschiedlichen Bearbeitungen trennen gleich lange Rohteile.

### Projektwechsel

Den geöffneten Rahmen vorübergehend eindeutig „P1 Wechselprobe Holzrahmen“
benannt, inneren rechten Ständer auf X=1380 geändert, ohne OWC-Export über die
lokale Projektverwaltung zum Regal gewechselt und den Rahmen wieder geöffnet.
X=1380 blieb erhalten: der Wechsel sichert den ausgehenden Stand automatisch.
Diese Probe ist unabhängig von der finalen Referenzdatei mit X=1374.
Nach der Probe wurden X=1374 und der normale Projektname wiederhergestellt.

Ein zusätzlicher Versuch Datei → Neu führte nach einer Browsersteuerungs-
Zeitüberschreitung zu einem leeren Projekt. Der Bestätigungsdialog war im
Werkzeug nicht beobachtbar; sein manuelles Abbrechen gilt deshalb nicht als
Browsernachweis. Abbruch und Erhalt von Dokument/History/Projekt-ID beim
Dateiimport werden durch `persistence.test.ts` separat automatisiert geprüft.

## Befund und Korrektur

**P1-B01: Escape übernimmt später trotzdem den Entwurf im Eigenschaftenpanel.**

- Reproduktion: Einlegeboden mit Länge 862 wählen, im Eigenschaftenfeld Länge
  999 eingeben, Escape, anschließend Z-Feld anklicken. Vor der Korrektur wurde
  die Länge 999 gespeichert und erschien als Modellmaß. Textfelder hatten
  denselben fehlenden Abbruchpfad.
- Ursache: Zahlen-/Texteingaben speicherten auf Blur; Escape setzte den Entwurf
  nicht zurück und verhinderte den folgenden Commit nicht.
- Korrektur in `src/ui/components/Field.tsx`: Escape verwirft den Entwurf,
  beendet den Fokus und unterdrückt den zugehörigen Blur-Commit. Das Ereignis
  wird nicht an globale Auswahl-/Dialogbefehle weitergegeben. Enter und normales
  Verlassen des Feldes übernehmen weiterhin.
- Regression: drei Tests in `test/field-cancel.test.tsx`, mit tatsächlichen
  Komponentenhandlern und Store/Undo; synchroner Blur vor einem React-Neurendern
  wird ausdrücklich geprüft. Ein kleiner Hook-Testadapter ersetzt den DOM,
  die native Fokuswirkung wurde zusätzlich im Browser geprüft.

**P1-B02: Einpassen verlässt die gewählte Zeichenansicht.**

- Reproduktion: Balkenwerkzeug → XZ-Ebene → senkrecht auf Ebene schauen →
  Alles zeigen (F). Vor der Korrektur sprang die Ansicht in die Isometrie.
- Korrektur: Einpassen über Werkzeugleiste, Taste F und Kontextmenü erhält
  Blickrichtung und Up-Achse. Auswahl einpassen verwendet denselben Weg.
  Explizite Ansichten wie Iso/Vorne/Oben ändern die Richtung weiterhin bewusst.
- Zwei neue Kameratests prüfen Perspektive und Parallelprojektion, drei
  Standardebenen sowie eine geneigte Ebene: Ausrichtung bleibt erhalten, alle
  acht Kastenecken passen ins Bild. Wiederholte Browserprobe mit XZ/Normalansicht
  und F erfolgreich; anschließender Balkenentwurf `500@0` per Escape verworfen,
  weiterhin sechs Bauteile. Bild: `holzrahmen-fit-front.png`.

## Automatisierte und visuelle Nachweise

- Acht neue Referenztests lesen die real gespeicherten OWC-Dateien: strenger
  Import ohne Reparaturen, JSON-Roundtrip, stabile IDs, geänderte Maße und
  Verbindungstiefen, vollständige Beschaffung und sechs verschachtelte Teile.
- Alle vier Modellstände werden mit echten OCCT-Körpern aufgebaut. Keine
  fehlgeschlagenen Bearbeitungen; paarweise Volumenschnittmengen unter 1 mm³.
  Volumen-Handkontrolle im Test: Rahmenrohvolumen 94.464.000 mm³ abzüglich
  vier Ecküberschneidungen à 120×120×60; Regal abzüglich acht Ø7-Durchgangs-
  und acht Ø5-Sackbohrungen mit den tatsächlichen Tiefen.
- Für beide Endstände entstehen die Zeichnungen im Test erneut über OCCT.
  Außenmaße, Positionsnamen, CSV-Maße/Mengen und PDF-Seitenzahlen werden mit
  den Fertigungsdaten verglichen. PDF-Text wurde zusätzlich extrahiert;
  Ansichtsblätter wurden aus den heruntergeladenen PDFs gerendert und geprüft.
- Bestehende Tests decken reale OrbitControls-Ereignisse ohne WebGL, Kantenfang,
  feste Ebenen, Werkzeugabbruch, Maßtransaktionen, Speicherfehler/-Rennen,
  Workerfehler/-Timeout/-Neustart und die Exportsperre bei Bearbeitungsfehlern ab.
  Fehlerfälle des Workers wurden nicht zusätzlich im sichtbaren Browser injiziert.
- Abschließendes Browserprotokoll für die Referenzabläufe: keine Warnungen/Fehler.
  Einzelne CDP-Eingabezeitüberschreitungen waren durch erneute Zustandsabfrage
  behebbar; daraus wird keine gesicherte Anwendungshänger-Ursache abgeleitet.

Beim ersten parallelen Gesamttest/Build kam es zu nativen Speicherabbrüchen.
Deshalb die abschließenden Gesamttests mit einem Worker und den Build getrennt
ausführen. Keine Veränderung der globalen Testkonfiguration oder Abhängigkeiten.

Abschluss am endgültigen Code: `npm test -- --maxWorkers=1 --minWorkers=1`
**210/210**, 36 Testdateien einschließlich all-generators; `npx tsc --noEmit`
fehlerfrei und `npm run build` erfolgreich. Bestehender Vite-Hinweis zur
Browser-Externalisierung von `node:module` aus dem OCCT-Paket bleibt bestehen.

## Grenzen und verbleibende Aufgaben

- **Offene manuelle Abnahme:** gehaltene mittlere Maus beim Zeichnen, einschließlich
  Fokus-/Capture-Verlust. Das verfügbare Browserwerkzeug bietet kein gehaltenes
  MMB-Ziehen. Die automatisierten OrbitControls-Tests ersetzen diese Abnahme nicht.
- P1-Restpunkte Nut/Falz und fachliches Ablängen über die UI bleiben offen.
  Bloßes Ändern einer Rohteillänge gilt hier nicht als vollständiges Ablängwerkzeug.
- Die Referenzen sind Bedien-/Fertigungsdatenproben, keine freigegebenen Baupläne:
  Regal ohne Rückwand, Einlegeböden ohne modellierte Bodenträger; innere
  Rahmenständer ohne zusätzliche Verbindungsmittel. Tragfähigkeit, Aussteifung,
  Beschlagvollständigkeit und vollständige Montageanweisungen sind nicht nachgewiesen.
- Verbesserungsbedarf für P2: zusammengehörige freie Teile über treibende
  Abstände/Beziehungen ändern können; die Regalverbreiterung erforderte fünf
  einzelne Änderungen. Bestehende Skizzenbedingungen allein lösen das nicht.
- U12 kann diese zwei Referenzen weiterverwenden; parametrischer Schrank und
  die noch folgenden U9/U10/U11-Abläufe bleiben dort gesondert abzunehmen.
- Integration: Während P1 lief, wurden U9/U10 separat zur Prüfung übergeben.
  P1 enthält diese Zweige nicht. Beim späteren Zusammenführen `Field.tsx`
  mit U10 kombinieren: sowohl dessen Zurücksetzen abgewiesener numerischer
  Übernahmen (`onCommit` liefert false) als auch den P1-Escape-Abbruch erhalten.
  In `Viewport.tsx` die U9-Auswahlanzeige und den P1-Einpassweg zusammen erhalten.
- Keine neue Laufzeitabhängigkeit, keine Modell-/Format-/öffentliche Kern-API-/
  Übersetzungsänderung. Interne UI-Kamerahilfe zum richtungserhaltenden Einpassen.
