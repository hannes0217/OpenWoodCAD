# OpenWoodCAD – Fahrplan

Status-Legende: ✅ fertig · 🔨 in Arbeit · ⏳ geplant

Standabgleich 20.10.2026 nach Aufgabentafel und [P1-Praxisabnahme](P1-ACCEPTANCE.md).
Die neue Praxisabnahme liegt auf `codex/P1` zur Prüfung; sie ist keine pauschale
Freigabe aller Bedien-, Fertigungs- oder Statikfunktionen.

## Bereits vorhanden

- ✅ Rechenkern: Bauteile (Balken/Platten) mit lokalem Koordinatensystem, Bearbeitungen (Schnitt, Polytop, Bohrung, Zapfenform)
- ✅ Holzverbindungen: Kappen, Gehrung, Verschneiden/Einlassung, Kerve, Blatt, Zapfen mit Holznagel, Schwalbenschwanz, Stirnversatz, Dübel, Konfirmat, Schrauben
- ✅ Geometriekern OpenCascade (Web Worker), STEP- und STL-Export
- ✅ Vorlagen Kommode, Regal, Schrank mit Türen, Werkbank, Holzrahmenwand, Carport, Pultdach und Satteldach
- ✅ Listen (Holz-/Zuschnittliste, Beschläge, Montagemaße), CSV
- ✅ Zuschnittoptimierung Platten (Guillotine, Maserung) und Stabware (Handelslängen)
- ✅ Einkaufsliste mit editierbaren Preisen, Kalkulation (Material, Arbeitszeit, Zuschläge, MwSt.)
- ✅ Technische Zeichnungen: Übersicht, Ansichten mit Maßen, Werkstattzeichnungen mit Bohrtabelle und Kantenkennzeichnung, Stückliste, Einkaufsliste, Zuschnittpläne – PDF, DXF, SVG, Drucken
- ✅ Bedienung: Startbildschirm, Werkzeugleiste mit Erklärungen, Verschieben/Drehen am Objekt, Maße am Objekt, Info beim Überfahren, Schubkästen per Doppelklick öffnen

## Meilenstein 1 – Regal und Holzrahmen frei konstruieren

Ziel: Ein kleines Regal und ein einfacher Holzrahmen lassen sich frei konstruieren, exakt bemaßen,
verbinden, speichern und als vollständige Werkstattunterlagen ausgeben.

1. ✅ Präzise Zeichenwerkzeuge: Fang (Endpunkt, Kantenmitte, Fläche, Raster, Achse), Länge/Maße eintippen,
   Achssperre X/Y/Z, Messen, exakt verschieben/drehen, ausrichten, spiegeln, Mehrfachkopie
   – ✅ Winkeleingabe/Maßausdrücke, Fang auf tatsächlichen Geometriekanten, feste XY/XZ/YZ- und erfasste Flächenebenen
2. ✅ Platten frei zeichnen: Rechteck, Kreis, Formteil (Umriss) auf Boden oder Bauteilfläche, Dicke,
   rechteckige und runde Ausschnitte; Bögen im Umriss (Datenmodell) – ⏳ Bogen-Werkzeug
3. ✅ Vorlagen: Regal, Holzrahmenwand, Werkbank, Carport, Pultdach und Satteldach
4. ✅ Konstruktionsprüfung: austretende Bohrungen, Überschneidungen, Plattenformat, Handelslänge,
   zu kurze Verbindungsmittel – mit Markierung, „Zeigen“ und Korrektur per Klick
5. ✅ Projektverwaltung: mehrere lokale Projekte (IndexedDB), Wiederherstellungspunkte, Speicherstatus,
   Speicherfehler werden gemeldet, strenge Importprüfung mit Versionsmigration
6. ✅ Einstiege „Möbel“, „Zimmerei & Holzbau“, „Frei zeichnen“ und geführte Kurztour
7. 🔨 Praxisabnahme freies Regal und Holzrahmen: zwei Ausgangs-/Änderungsstände,
   Speichern/Öffnen, Verbindungen, CSV und bemaßte PDF auf `codex/P1` geprüft.
   Offene Abnahmen: gehaltene mittlere Maustaste beim Zeichnen; P1-Rest Nut/Falz/Ablängen.
   Referenzen sind Bedienproben mit dokumentierten Montagegrenzen, keine freigegebenen Baupläne.

## Meilenstein 2 – Fachlich vertiefen

- ✅ Verbindungen direkt am Modell mit geprüfter Vorschau bearbeiten (C4)
- ✅ Treibende Rohteil-/Vorlagenmaße am Modell; parametrische gerade Linienprofile
  mit begrenztem Skizzensolver und Konfliktdiagnose (U4/U6)
- ⏳ Beziehungen zwischen Bauteilen, gleiche Abstände und assoziative Positionierung;
  Skizzenbögen/mehrere Inseln bleiben offen (P2)
- ✅ Eigene Zeichnungsmaße, Schnitte, Detailansichten und Hinweise sowie verknüpfte
  Positionsdaten und Ausgabeumfang (C5)
- ✅ Möbelbau: Schrank mit Türen/Topfbändern und Beschlagbibliothek (C6), vorhandene Lochreihen
- ⏳ Fertig-/Zuschnittmaß mit Kantenbandstärken und Materialstärkenabgleich (P2)
- ✅ Sattel-/Pultdach und Carport; ⏳ Walmdach und weitere Dachdetails
- ✅ Baugruppen und stabile fachliche Referenzen (U3); ⏳ Materiallager und Reststücke (T6)
- 🔨 Bedienausbau U9–U12 laut Aufgabentafel: Auswahlumfang, gezielte Vorlagen-
  Einzelteilbearbeitung, Bezugsflächenpositionierung und ergänzende Gesamtabnahme

## Meilenstein 3 – Statik und Maschinen

- ✅ Statik-Rechenkern und Oberfläche für begrenzte 2D-Vorbemessung (T1/C3).
  Nachweisumfang und Vereinfachungen stehen in TASKS.md; keine vollständige Ausführungsstatik.
- 🔨 BTLx-Export (T2); Schema-/Maschinenabnahme noch offen
- ⏳ IFC-Export (BIM)
- ⏳ PWA: installierbar und offline nutzbar
