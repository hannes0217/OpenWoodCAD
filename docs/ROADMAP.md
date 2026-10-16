# OpenWoodCAD – Fahrplan

Status-Legende: ✅ fertig · 🔨 in Arbeit · ⏳ geplant

## Bereits vorhanden

- ✅ Rechenkern: Bauteile (Balken/Platten) mit lokalem Koordinatensystem, Bearbeitungen (Schnitt, Polytop, Bohrung, Zapfenform)
- ✅ Holzverbindungen: Kappen, Gehrung, Verschneiden/Einlassung, Kerve, Blatt, Zapfen mit Holznagel, Schwalbenschwanz, Stirnversatz, Dübel, Konfirmat, Schrauben
- ✅ Geometriekern OpenCascade (Web Worker), STEP- und STL-Export
- ✅ Vorlage Kommode
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
   – ⏳ noch offen: Winkeleingabe, Fang auf Bauteilkanten (nicht nur Ecken/Mitten)
2. ✅ Platten frei zeichnen: Rechteck, Kreis, Formteil (Umriss) auf Boden oder Bauteilfläche, Dicke,
   rechteckige und runde Ausschnitte; Bögen im Umriss (Datenmodell) – ⏳ Bogen-Werkzeug
3. ✅ Vorlagen: Regal, Holzrahmenwand, Werkbank – ⏳ Carport, Pultdach, Satteldach
4. ✅ Konstruktionsprüfung: austretende Bohrungen, Überschneidungen, Plattenformat, Handelslänge,
   zu kurze Verbindungsmittel – mit Markierung, „Zeigen“ und Korrektur per Klick
5. ✅ Projektverwaltung: mehrere lokale Projekte (IndexedDB), Wiederherstellungspunkte, Speicherstatus,
   Speicherfehler werden gemeldet, strenge Importprüfung mit Versionsmigration
6. ✅ Einstiege „Möbel“, „Zimmerei & Holzbau“, „Frei zeichnen“ und geführte Kurztour

## Meilenstein 2 – Fachlich vertiefen

- ⏳ Verbindungen direkt am Modell mit Vorschau bearbeiten
- ⏳ Mit dem Modell verknüpfte Bemaßungen/Beziehungen (Abstand festlegen, gleichmäßig verteilen)
- ⏳ Werkstattunterlagen ergänzen: eigene Maße, Schnitte, Detailansichten, Hinweise; Positionsnummern
  zwischen Modell, Zeichnung und Liste verknüpft
- ⏳ Möbelbau: Beschlagbibliothek, Lochreihen (System 32), Kantenbandstärken, Fugen, Schubkastenfreiräume, Türen mit Topfbändern
- ⏳ Zimmerei: Dachgeometrie (Sattel-, Pult-, Walmdach), Sparrenverteilung, Kerven, Pfetten, Streben, Abbundzeichnungen
- ⏳ Allgemeiner Holzbau: Baugruppen, Materiallager, Reststücke

## Meilenstein 3 – Statik und Maschinen

- ⏳ Statik-Vorbemessung: Stabwerk 2D, Lasten nach EN 1991 (Schnee, Wind, Eigengewicht), Nachweise EN 1995 – klar als Vorbemessung gekennzeichnet
- ⏳ BTLx-Export (Abbundmaschinen), geprüft gegen das offizielle Schema
- ⏳ IFC-Export (BIM)
- ⏳ PWA: installierbar und offline nutzbar
