# Aufgabentafel

Ablauf und Regeln: siehe `AGENTS.md`. Status: `frei` · `in Arbeit` · `zur Prüfung` · `erledigt`.

| ID | Aufgabe | Owner | Status | Zweig |
|---|---|---|---|---|
| T1 | Statik-Rechenkern (Stabwerk 2D, Lasten, EC5-Nachweise) | Codex | erledigt | codex/T1 |
| T2 | BTLx-Export (Abbundmaschinen) | Codex | in Arbeit | codex/T2 |
| T3 | IFC4-Export (BIM) | Codex | frei | codex/T3 |
| T4 | PWA: installierbar + offline | Codex | frei | codex/T4 |
| T5 | Übersetzungen: Vollständigkeitstest + Englisch prüfen | Codex | frei | codex/T5 |
| T6 | Reststücke-Lager im Zuschnitt | Codex | frei | codex/T6 |
| C1 | Dach-Generatoren Satteldach (Pfetten-/Kehlbalkendach), Pultdach | Claude | erledigt | main |
| C2 | Carport-Generator | Claude | erledigt | main |
| C3 | Statik-Oberfläche (nach T1) | Codex | erledigt | codex/C3 |
| C4 | Verbindungen am Modell mit Vorschau bearbeiten | Codex | frei | codex/C4 |
| C5 | Werkstattunterlagen: eigene Maße, Schnitte, Detailansichten | Codex | frei | codex/C5 |
| C6 | Möbel: Schrank mit Türen/Topfbändern, Beschlagbibliothek | Codex | frei | codex/C6 |
| U1 | CAD-Arbeitsplatz: Navigation, Projektion, Befehlsuche, flexible Panels und Projektbaum | Codex | erledigt | codex/U1 |
| U2 | Präzises Konstruieren: Auswahlfilter, Kantenfang, Arbeitsebenen, direkte Maße und Werkzeugvorschauen | Codex | in Arbeit | codex/U2 |
| U1b | Kontextwerkzeuge, QuickPick, Auswahlpriorität und temporäre Sichtbarkeit | Codex | erledigt | codex/U1b |
| U3 | Bearbeitungsbaum, Baugruppen und stabile Geometriereferenzen | Codex | frei | codex/U3 |
| U4 | Freie parametrische Skizzen, Beziehungen und nachträgliche Bearbeitung | Codex | frei | codex/U4 |

Reihenfolge-Empfehlung für Codex: **T1 → T2 → T5 → T4 → T3 → T6**.

## Erweiterter Umbauauftrag – 2026-10-15

Der Nutzer hat den umfassenden CAD-/UI-Umbau ausdrücklich beauftragt. U1 wird jetzt vorgezogen; T2 bleibt auf seinem bestehenden Zweig in Arbeit. Danach Zuverlässigkeit P0 und Präzisionsbedienung U2/P1 mit C4, anschließend U3 und U4/P2. Fachliche Restaufgaben C6/C5/T5/T4/T3/T6 bleiben erhalten. Überschneidende Anforderungen nur einmal umsetzen. Kein Merge nach main ohne Nutzerentscheidung.

- **U1 erlaubt:** `src/ui/App.tsx`, `Viewport.tsx`, `store.ts`, `styles.css`, `panels/Tree.tsx`, `panels/Toolbar.tsx`, `panels/Dialogs.tsx` (Tastenkürzel), neue UI-Komponenten und Hilfsmodule, `src/ui/i18n*.ts`, passende UI-Tests und diese Aufgabentafel. Ziel: echte Orthogonal-/Perspektivprojektion, sechs Ansichten, Navigation mit CAD-Mausprofil, Auswahl einpassen, Befehlsuche mit Tastatur, flexible einklappbare Panels, durchsuchbarer Projektbaum. Keine Änderung des Dokumentformats; nur validierte Benutzerpräferenzen lokal speichern.
- **U2 erlaubt:** `src/ui/tools.ts`, `Viewport.tsx`, `store.ts`, Werkzeugdialoge und UI-Komponenten, `src/ui/i18n*.ts`, `src/core/math.ts`, passende Tests. Präzisionsauswahl, sichtbare aktive XY/XZ/YZ-Ebene, Kantenfang, Länge/Winkel, Ausdrücke mit Einheiten, eindeutiges Übernehmen/Abbrechen und ein Undo-Schritt pro Werkzeug. Sicherheitsgrenzen und Eingabevalidierung testen.
- **U3/U4 benötigen zuerst einen konkreten Modell-/Migrationsentwurf:** Persistente Bauteil-/Bearbeitungsreferenzen, echte Baugruppen und Abhängigkeitsgraph; anschließend Skizzenelemente und geometrische Beziehungen mit Diagnose unter-/überbestimmter Systeme. Ein Undo-Stapel ist keine parametrische Historie. Datenmodell, Validierung, Auswertung, Geometrie und Tests dürfen für diese Aufgaben nach dokumentiertem Entwurf erweitert werden; bestehende Dateien müssen migrierbar bleiben. Keine neuen Laufzeitabhängigkeiten ohne Rückfrage.
- **Bedienabnahme:** Frei gezeichnetes Regal und Holzrahmen, Maße mehrfach ändern, Verbindungen bearbeiten, speichern/neu öffnen und konsistente Werkstattunterlagen ausgeben. Bestehende Tests, Typprüfung und all-generators weiterhin verpflichtend. Jede Teilaufgabe separat zur Prüfung übergeben; der gesamte Umbau ist erst nach diesen Abnahmen fertig.

---

## U1b – Konkurrenzvergleich und Bedienung

U1b wurde aus dem ausdrücklich gewünschten Konkurrenzvergleich abgeleitet und folgt auf P0. Erlaubte Dateien: `src/ui/App.tsx`, `Viewport.tsx`, `store.ts`, `styles.css`, `commands.ts`, `panels/Tree.tsx`, `panels/Toolbar.tsx`, neue UI-Komponenten/Hilfsmodule, `src/ui/i18n*.ts`, passende Tests und TASKS.md. Kontextmenü mit passenden Aktionen, reale Tiefenauswahl aus Mesh-Treffern, Bauteilfilter Balken/Platten, Isolieren/Ausblenden nur in der Ansicht; keine vorgespiegelte Feature-Historie oder Flächenauswahl. Sichtbarkeit darf Fertigungsdaten nicht verändern. Quellen: [Fusion-Auswahlfilter](https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/files/SLD-SELECTION-FILTERS.htm), [Fusion-Kontextmenü](https://help.autodesk.com/cloudhelp/ENU/Fusion-GetStarted/files/GUID-6514ABC1-CB75-4F0B-AB0E-316FAD36BA93.htm), [Solid Edge QuickPick](https://blogs.sw.siemens.com/solidedge/Right-Click-Commands-in-Solid-Edge-Part-1-User-Interface/), [Solid Edge kontextbezogene Werkzeugleisten](https://blogs.sw.siemens.com/solidedge/new-in-solid-edge-2025-ui-ux/). Die Platzierung der vorhandenen Werkzeuge wird zugleich kompakter und nach Aufgabe gegliedert.

## T1 – Statik-Rechenkern

**Ziel:** Statische Vorbemessung von Holzbauteilen (Sparren, Pfetten, Balken, einfache Rahmen) im reinen Kern,
ohne Oberfläche. Die Oberfläche (C3) baut Claude danach darauf auf.

**Eingabe-Datenmodell (vorhanden, nicht ändern ohne Rückfrage):** `src/core/statics/model.ts`
(`StaticSystem`, `SNode`, `SMember`, `SSupport`, `LoadCase`, `MemberLoad`, `NodeLoad`, `CATEGORY_DURATION`, `PSI`)
und `src/core/timber.ts` (Festigkeitsklassen EN 338/EN 14080, `kmod`, `kdef`, `GAMMA_M = 1.3`).
Standortdaten: `SiteInfo` in `src/core/model.ts` (Höhe ü. NN, Schneelastzone, Windzone, Lage).
Beispiel-System erzeugt `src/core/generators/roof.ts` (Funktion `rafterSystem`): geneigter Sparren mit Kragarm,
Lastfälle `g` (Eigengewicht + Eindeckung), `s` (Schnee, `site: 'snow'`, je Grundrissprojektion), `w` (Wind, `site: 'wind'`, senkrecht zum Stab).

**Neue Dateien:** `src/core/statics/fem2d.ts`, `src/core/statics/loads.ts`, `src/core/statics/ec5.ts`,
`src/core/statics/analyze.ts`, Tests `test/statics-*.test.ts`. Keine anderen Dateien ändern.

**Umfang:**
1. `fem2d.ts` – ebenes Stabwerk nach dem Weggrößenverfahren (3 Freiheitsgrade je Knoten: ux, uz, ry),
   Biegestäbe (Euler-Bernoulli) mit E = E0,mean und G (Schub optional vernachlässigt, dokumentieren),
   Momentengelenke an Stabenden (`hingeStart`/`hingeEnd`), Auflager aus `SSupport`, Knotenlasten,
   Streckenlasten global (`qx`, `qz`), je Grundrissprojektion (`projected`) und senkrecht zum Stab (`normal`).
   Ergebnis je Stab: N, V, M an mind. 21 Stellen, Verformungen (lokal senkrecht zum Stab), Auflagerkräfte.
   Fehler bei kinematischen Systemen klar melden (singuläre Matrix).
2. `loads.ts` –
   - Schnee nach DIN EN 1991-1-3 mit NA Deutschland: `sk(zone, altitude)` für Zonen 1, 1a, 2, 2a, 3
     (Sockelbeträge 0,65 / 0,81 / 0,85 / 1,06 / 1,10 kN/m², Formeln mit (A+140)/760 aus dem NA),
     Formbeiwert μ1 nach Dachneigung (≤ 30°: 0,8; 30–60°: linear; ≥ 60°: 0), s = μ1 · sk (Ce = Ct = 1).
   - Wind vereinfacht nach DIN EN 1991-1-4/NA (Geschwindigkeitsdruck q_p nach Windzone, Lage Binnenland/Küste/Inseln
     und Gebäudehöhe ≤ 10 / 18 / 25 m aus Tabelle NA.B.3), Winddruck = q_p · c_pe mit `system.cpe` (Standard 0,6).
     Ausdrücklich als vereinfachtes Verfahren dokumentieren.
   - Auflösen der `site`-Lasten: q = Faktor · Lastwert [kN/m² = 1e-3 N/mm²] · `system.loadWidth` [mm].
   - Kombinationen nach EN 1990/NA: GZT (STR) mit γG = 1,35 (bzw. 1,0 günstig), γQ = 1,5, ψ0 aus `PSI`, jede veränderliche
     Einwirkung einmal führend; GZG charakteristisch und quasi-ständig (ψ2). Maßgebende Lasteinwirkungsdauer (kürzeste
     Dauer in der Kombination) für kmod mitliefern.
3. `ec5.ts` – Nachweise nach EN 1995-1-1 (mit NA Deutschland, γM = 1,3) für Rechteckquerschnitte:
   Biegung (6.11, mit kh für Vollholz/BSH), Schub (6.13 mit kcr = 0,67), Zug, Druck mit Knicken (kc, 6.23/6.24,
   Knicklänge = Stablänge × `bucklingFactor`, Standard 1,0), Biegedrillknicken (kcrit, 6.33, mit `lateralSpacing`,
   Standard: seitlich gehalten → kcrit = 1), Durchbiegung w_inst (char.) und w_fin = w_inst,G·(1+kdef) + w_inst,Q·(1+ψ2·kdef)
   mit Grenzwerten L/`limitInst` und L/`limitFin` (Kragarm: doppelte Länge).
   Jeder Nachweis liefert Ausnutzung η, die verwendeten Zwischenwerte (für einen nachvollziehbaren Bericht) und die Fundstelle.
4. `analyze.ts` – öffentliche Funktion
   `analyzeSystem(sys: StaticSystem, site: SiteInfo): StaticsReport` mit Kombinationen, Schnittgrößen-Umhüllende je Stab,
   Nachweisliste je Stab, maximaler Ausnutzung, Warnungen (z. B. „Wind vereinfacht“, „Schnee: Zone/Höhe außerhalb“).
   Typen exportieren, Funktionen rein (keine Seiteneffekte).

**Tests (Pflicht):** Einfeldträger mit Gleichlast (M = qL²/8, w = 5qL⁴/384EI), Kragarm, Zweifeldträger (Stützmoment −qL²/8),
Gelenk-Fall, geneigter Stab mit Projektionslast, `sk` für mind. 3 Zonen/Höhen gegen Handrechnung, eine vollständige
Sparrenbemessung (Ausnutzungen plausibel, Quelle der Vergleichswerte im Kommentar).

**Grenzen (bewusst):** keine Brandbemessung, keine Verbindungsmittelnachweise, keine Schwingungsnachweise,
Windlasten vereinfacht. In der Übergabe notieren.

---

## T2 – BTLx-Export

**Ziel:** Abbunddaten für CNC-Abbundanlagen im Format **BTLx 2.3** aus dem ausgewerteten Modell.

**Grundlagen:** Spezifikation http://www.design2machine.com/btlx/documentation23/BTLx_2_3_0.html, Schema
https://www.design2machine.com/btlx/BTLx_2_3_1.xsd (liegt lokal unter `vendor/btlx/` – NICHT committen, Nutzungsbedingungen unklar;
lege ein Skript `scripts/fetch-btlx.mjs` + npm-Skript `fetch-btlx` an, das es herunterlädt).
Bauteil-Koordinaten in OpenWoodCAD entsprechen BTLx: lokales x = Länge, y = Breite, z = Höhe, Grundkörper `[0,L]×[0,B]×[0,H]`
(`src/core/model.ts`, `Element.frame`). Bearbeitungen: `Processing` mit fachlichem `type` (Namen bewusst an BTLx angelehnt) und
Geometrie (`cut` = Halbraum, `polytope` = konvexer Bereich aus Ebenen, `drill`, `cutExcept` = Zapfen).
Erzeugt werden sie in `src/core/joints.ts`; das ausgewertete Modell liefert `evaluate()` aus `src/core/evaluate.ts`
(`EvalElement.all` = alle Bearbeitungen in lokalen Koordinaten, `pos` = Positionsnummer).

**Neue Dateien:** `src/core/export/btlx.ts`, `test/btlx.test.ts`, `scripts/fetch-btlx.mjs`. Erlaubt: Eintrag `fetch-btlx` in `package.json`,
ein dev-Paket für XSD-Validierung (z. B. `xmllint-wasm`) – vorher in TASKS.md unter „Fragen“ nennen.

**Umfang:**
- `exportBtlx(ev: Evaluated, project: ProjectInfo, opts?): string` – nur Stabbauteile (`kind === 'beam'`), je Position ein `Part`
  mit `Count`, Abmessungen, Material/Festigkeitsklasse, Transformation (Lage im Projekt aus `frame`).
- Abbildung der Bearbeitungen (mindestens): `endCut`/`jackRafterCut` → JackRafterCut, `drilling` → Drilling,
  `lap` → Lap, `birdsMouth` → BirdsMouth, `house`/`notch` → House oder Lap (begründen), `tenon` → Tenon, `mortise` → Mortise,
  `dovetailTenon`/`dovetailMortise` → DovetailTenon/DovetailMortise, `stepJoint` → StepJoint, `stepJointNotch` → StepJointNotch.
  Parameter aus der Geometrie berechnen (Referenzseite, StartX/StartY, Winkel, Tiefen). Nicht abbildbare Fälle: als Warnung
  zurückgeben, nicht stillschweigend weglassen.
- Tests: Satteldach (`satteldach` aus `src/core/generators/roof.ts`), Werkbank (`werkbank`), einzelne Verbindungen
  (siehe `test/joints.test.ts`). Ausgabe gegen das XSD validieren (Test überspringen, wenn `vendor/` fehlt, mit Hinweis).
  Für JackRafterCut und Drilling Parameter gegen Handrechnung prüfen.

---

## T3 – IFC4-Export

**Ziel:** Modell als IFC4-Datei (STEP-Format, ISO 10303-21) für BIM-Programme.
**Neue Dateien:** `src/geom/ifc.ts` (nutzt Netze aus `src/geom/kernel.ts` `meshShape` bzw. `src/geom/solids.ts` `solidFor`),
`test/ifc.test.ts`. Später ruft Claude es über den Worker auf (Protokoll-Erweiterung macht Claude).
**Umfang:** IfcProject/IfcSite/IfcBuilding/IfcBuildingStorey, je Bauteil IfcBeam/IfcColumn/IfcMember/IfcPlate (nach `role`/Lage),
Geometrie als IfcTriangulatedFaceSet in lokalen Koordinaten + IfcLocalPlacement aus `frame`, IfcMaterial, Eigenschaftssatz
`Pset_OpenWoodCAD` (Position, Material, L/B/H). Einheiten mm. Test: Datei für Kommode und Satteldach erzeugen,
Struktur prüfen (Header, Anzahl Bauteile, gültige Referenzen #n). Keine neuen Laufzeit-Abhängigkeiten.

---

## T4 – PWA: installierbar und offline

**Neue Dateien:** `public/manifest.webmanifest`, `public/icons/*` (aus einem einfachen SVG-Logo, inkl. maskable),
`public/sw.js` (handgeschrieben: App-Shell + gehashte Assets inkl. `*.wasm` cache-first, Versionswechsel räumt alte Caches),
Registrierung in `src/main.tsx` nur im Produktionsbuild. Erlaubt: Änderungen an `index.html` (Manifest-Link, theme-color) und `src/main.tsx`.
**Prüfen:** `npm run build` + `npm run preview`, Offline-Fall (Netz aus) lädt die App inkl. Geometriekern. Kurz in README dokumentieren.

---

## T5 – Übersetzungen

**Ziel:** Kein Text ohne Übersetzung. Test `test/i18n.test.ts`, der alle in `src/` verwendeten Schlüssel
(`t('…')`, `tm(…)`-Schlüssel aus `src/core` wie `warn.*`, `note.*`, `check.*`, `proc.*`, `role.*`, `param.*`, `opt.*`, `jparam.*`, `gen.*`)
sammelt und prüft, dass sie in `de` und `en` vorhanden sind (`src/ui/i18n.ts`, `src/ui/i18n-gen.ts`).
Fehlende englische Texte ergänzen, holprige englische Fachbegriffe korrigieren (Zimmerei: rafter, purlin, birdsmouth, collar tie …).
Erlaubt: Änderungen an `src/ui/i18n.ts` und `src/ui/i18n-gen.ts`.

---

## T6 – Reststücke-Lager

**Ziel:** Vorhandene Reststücke (Platten und Stabware) im Zuschnitt zuerst verwenden.
**Dateien:** `src/core/offcuts.ts` (Datentyp `Offcut { materialId, length, width?, qty, label }`), Erweiterung von
`nestSheets`/`nestLinear` in `src/core/nesting.ts` um optionale Reststücke (vor neuen Platten/Stangen belegen),
Tests. Datenhaltung im Dokument (`OwcDocument.offcuts?`) und Oberfläche macht Claude – nur Kern + Tests.

---

## Übergabe Claude → Codex (laufend aktuell gehalten)

**Seit 2026-10-15 an Codex übergeben.** Codex übernimmt alle offenen Aufgaben (T1–T6, C3–C6). Da Claude vorerst nicht zusammenführt: Codex arbeitet weiter auf eigenen Zweigen; der Nutzer entscheidet über das Zusammenführen nach `main` (Bedingung: `npm test` und `npx tsc --noEmit` grün). Stand und Hinweise:

**Stand `main`:** Vorlagen Kommode, Regal, Werkbank, Holzrahmenwand, Satteldach (Pfetten-/Kehlbalkendach), Pultdach,
Carport; Zeichenwerkzeuge (`src/ui/tools.ts`), Konstruktionsprüfung (`src/core/checks.ts`, `src/ui/panels/Issues.tsx`),
Projektverwaltung (`src/ui/projects.ts`, IndexedDB), Zeichnungen (`src/drawing/`), Listen/Zuschnitt/Kalkulation.
Alle Tests grün (`npm test`), Typprüfung sauber.

**Wichtige Konventionen, die nicht offensichtlich sind:**
- Welt: Z oben, Vorderansicht blickt in +Y. Bauteil-Frame wie BTLx (x = Länge). `createBoxElement` (achsparallel) und
  `createBeam` (zwei Punkte) in `src/core/elements.ts`.
- OCCT-Projektion (`src/drawing/sheets.ts`, Funktion `cam`): `direction` zeigt vom Objekt ZUM Betrachter,
  Hochachse = direction × xAxis, Pfade kommen als (u, −v).
- replicad `makeCompound` verbraucht (löscht) die Eingangskörper – siehe `src/geom/solids.ts`.
- Jede neue Vorlage muss den Test „all generators“ (`test/generators.test.ts`: keine Warnungen, keine Überschneidungen)
  und die Konstruktionsprüfung ohne Befund bestehen.
- Store-Abonnements: in `subscribe`-Callbacks den alten Zustand vor Seiteneffekten fortschreiben (sonst Rekursion,
  siehe Viewport).
- Bash-Heredocs mit Python brechen hier gelegentlich ab → Patches als Skriptdatei im Scratchpad ausführen.

**Nächste Schritte in dieser Reihenfolge:** C3 (Statik-Oberfläche, sobald T1 gemergt), C4, C5, C6.
Für C3: Systeme kommen aus `ev.statics` (vom Dach/Carport erzeugt), Standort aus `doc.project.site`;
Reiter `statics` in `src/ui/views/registry.tsx` ersetzt den Platzhalter.

## Fragen

_(Hier Rückfragen eintragen – mit Aufgaben-ID.)_

## Übergaben

_(Je Aufgabe: Zweig, was umgesetzt, Grenzen, offene Punkte.)_

### T1 – Zwischenstand Codex
- In Arbeit auf `codex/T1`, Worktree: `C:/Users/Administrator/.codex/worktrees/statics-t1/OpenWoodCAD`.
- Geplante Schnittstelle: `analyzeSystem(sys, site, { buildingHeight? })` in `src/core/statics/analyze.ts`; Report enthält Kombinationen, Ergebnisse, Bauteilnachweise, Umhüllende, `maxUtilization`, `warnings: Msg[]` und Annahmen.
- Keine Änderung am gemeinsamen Datenmodell. Gebäudehöhe fehlt dort: optionaler Parameter, sonst konservative 25 m mit Warnung; Nordseeinseln ohne passende Höhenangabe werden abgewiesen.
- Neue `statics.warn.*`-Schlüssel werden bei Übergabe aufgeführt; Übersetzungen/UI-Integration bleiben bei Claude. Noch nicht zur Prüfung freigegeben.

## Planabgleich Codex – 2026-10-15

Auftrag des Nutzers: verbleibende Punkte aus dem früheren Verbesserungsplan ebenfalls umsetzen. Die Reihenfolge T1 → C3 → T2 → C4 → C6 → C5 → T5 → T4 → T3 → T6 bleibt bestehen; nachfolgende Restpunkte werden ergänzend geführt. Vorhandensein wurde am Quellcode geprüft, eine vollständige Bedienabnahme steht aus.

- Bereits vorhanden: sieben Vorlagen, freie Platten/Umrisse/Ausschnitte, Fang und Messen, Bearbeitungswerkzeuge, Konstruktionsprüfung, IndexedDB-Projekte/Wiederherstellung, strengerer Import mit Versionserkennung. Nicht erneut implementieren.
- C3 zusätzlich: `rafterSystem` in `src/core/generators/roof.ts` erzeugt doppelte End-/Auflagerknoten (Null-Längen-Stab am First). Knoten deduplizieren und Eigengewicht kontrollieren; Tests für erzeugte Systeme ergänzen. T1 weist ungültige Systeme ausdrücklich zurück.
- C4 zusätzlich: Kopieren freier Bauteile muss interne Verbindungen mitkopieren; Löschen von Vorlagen muss externe Verbindungen bereinigen; gedrehte Vorlagen müssen Bewegungsvektoren mittransformieren. Erlaubte Dateien zusätzlich: `src/ui/actions.ts`, `src/core/evaluate.ts`, passende Kern-/UI-Tests.
- C5 zusätzlich: veraltete Zeichnungsstände bei Änderungen/leeren Modellen und asynchronen Ergebnissen sperren; sichere Drucktitel; identischer Ausgabeumfang für Modell/Zeichnungen/Listen. Erlaubte Dateien zusätzlich: `src/ui/views/Drawings.tsx`, `src/drawing/*`, Ausgabeumfang in `src/core/model.ts`/`src/core/validate.ts` sowie Tests, Migration und Übergabe dokumentieren.

| ID | Aufgabe | Owner | Status | Zweig |
|---|---|---|---|---|
| P0 | Verbleibende Zuverlässigkeit: Dateiwechsel absichern, Workerfehler/-Timeout/Neustart und fehlgeschlagene Bearbeitungen inkl. Exportsperre, Übergrößen nicht als beschaffbar kalkulieren, Rohgewicht kennzeichnen, Lizenzangaben vereinheitlichen | Codex | erledigt | codex/P0 |
| P1 | Fehlende CAD-Grundfunktionen: Winkeleingabe, echter Kantenfang, orthogonale Ansichten, explizite XY/XZ/YZ-Arbeitsebenen, Nut/Falz und Ablängen über UI; zwei frei konstruierte Referenzprojekte als Bedienabnahme | Codex | frei | codex/P1 |
| P2 | Parametrische Beziehungen und Materialdetails: gebundene Maße, gleiche Abstände, Kantenbandstärke und Fertig-/Zuschnittmaß trennen, Materialstärkenabgleich | Codex | frei | codex/P2 |

Die Restaufgaben P0 → P1 → P2 folgen auf die vom Nutzer vorgegebene Reihenfolge. Neue Laufzeitabhängigkeiten nur nach Rückfrage; jede Aufgabe eigener Zweig, Tests und Typprüfung, Nutzer entscheidet über Merge.

P0-Dateigrenzen für den beauftragten Zuverlässigkeitsumbau: `src/ui/actions.ts`, `store.ts`, `geomClient.ts`, `App.tsx`, `Viewport.tsx`, `views/registry.tsx`, `views/Lists.tsx`, `panels/ProjectsDialog.tsx`, `panels/Issues.tsx`, `panels/Properties.tsx`, `panels/Dialogs.tsx`, `src/ui/i18n*.ts`, `styles.css`, neue reine UI-Hilfsmodule; `src/geom/solids.ts`, `protocol.ts`, `worker.ts`; `src/core/production.ts`, `shopping.ts`, `costing.ts`, `nesting.ts` und zugehörige Tests. Lizenz-Metadaten in `package.json`/`package-lock.json` an die vorhandene AGPL-3.0-or-later-Lizenz angleichen, keine Abhängigkeiten ändern. Wiederherstellungs-/Speicher-Rennen und fehlgeschlagene Bearbeitungen mit Regressionstests absichern.
P0 erlaubt zusätzlich `src/drawing/sheets.ts`: Rohgewicht und unvollständige Beschaffung auch in gedruckten Listen kennzeichnen; die umfassende Zeichnungsbearbeitung bleibt C5.

### T1 – Zur Prüfung (Codex, 2026-10-15)

- Zweig: `codex/T1`; Basis: `a79be85` (`main` bei Übergabe). Nur vier neue Kernmodule und vier Tests; gemeinsames Datenmodell unverändert.
- API: `analyzeSystem(sys, site, options?: { buildingHeight?: number }): StaticsReport`. Report: `preliminary`, `combinations`, `results` (Knoten, Auflager, Stabstationen), `members` (Umhüllende, Nachweise mit eta/Fundstelle/Zwischenwerten/Kombination), `maxUtilization`, `warnings: Msg[]`, technische `assumptions`. Ungültige/instabile/nicht unterstützte Systeme werfen `StaticsError` mit `code`.
- Weitere reine APIs: `solveFrame`, `resolveSiteLoads`, `sk`, `snowShape`, `roofSnow`, `windPressure`, `loadCombinations`, `checkMember`, `checkDeflection`, `resistance`.
- 33 neue Tests: Einfeld-/Krag-/Zweifeldträger, ein/zwei Gelenke, axiale Last, geneigte Projektions- und Normallast, Schnee/Windtabellen, Lastkombinationen inklusive günstiger/wegfallender Lasten, EC5-Handrechnungen, vollständiger Sparren und reale Generator-Systeme.
- Abschlussprüfung: `npm test` **82/82**, `npx tsc --noEmit` fehlerfrei; vorhandener all-generators-Test ebenfalls grün. Keine neue Vorlage, kein neues Paket.
- Grenzen: lineare Euler-Bernoulli-Rechnung ohne Schubverformung; Brutto-Rechteckquerschnitte ohne Kerven/Bohrungsabzug; keine Brand-, Schwingungs-, Verbindungs-, Auflagerpressungs- oder vollständigen räumlichen Stabilitätsnachweise. Instabilität wird erkannt, aber keine Theorie II. Ordnung.
- Knicklänge: physische Spannweite in geraden unverzweigten FE-Ketten × Faktor (Standard 1); bei Rahmenknoten Stablänge mit Warnung. Ohne `lateralSpacing` wird die Druckkante als seitlich gehalten angenommen (kcrit=1), ausdrücklich gewarnt. Gebrauchstauglichkeit: absolute lokale Durchbiegung, 201 Stationen; Kragarmgrenzwert bezogen auf doppelte Länge. Positive Rotation entspricht positiver Steigung in x/z.
- Standortgrenzen: regulärer Schnee bis 1500m als Hilfsfunktion, Kombinationen mit Standortschnee nur unter 1000m (vorhandene PSI-Tabelle). Keine Verwehung/außergewöhnliche Regionallasten/Schneefänge. Wind vereinfacht, äußerer Druck; ohne explizite Gebäudehöhe konservativ 25m mit Warnung. `islands` konservativ Nordsee: Zone4, bis10m; Ostsee kann ausdrücklich `coast` nutzen. Wind über800m nicht unterstützt. Keine automatische Ermittlung von cpe, Sog oder Innendruck; explizite Lastfälle erforderlich. Norm-/Materialsatz entspricht dem vorgegebenen Bestandsmodell, keine automatische Bestätigung aktueller bauaufsichtlicher Gültigkeit.
- C3-Integration offen: Satteldach-Null-Längen-Stab im bestehenden Generator beheben (siehe Planabgleich); T1-Test prüft bis dahin die ausdrückliche Ablehnung statt eines scheinbar erfolgreichen Berichts.
- Für C3 zu übersetzende Meldungen: `statics.warn.snowRegularOnly`, `snowLocalValues`, `windSimplified`, `windHeightAssumed` (height), `windCoefficientAssumed` (cpe), `northSeaIslands`, `preliminary`, `grossSection`, `independentActions`, `linearAnalysis`, `memberDesignLength` (member), `lateralRestraintAssumed` (member), `bucklingFactorAssumed` (member,factor). Alle mit Präfix `statics.warn.`.
- Merge nur auf Entscheidung des Nutzers, im Hauptprojekt: `git merge --no-ff codex/T1`.
### C3 – Zur Prüfung (Codex, 2026-10-15)
- Zweig `codex/C3`, abhängig von `codex/T1` (`5b90ff2`), kein Merge nach main.
- Statik-Reiter umgesetzt: Systemwahl, Standortbearbeitung, explizite Windhöhe/konservative25m, Nutzungsklassen-Override, Systemskizze, wählbare N/V/M/v-Diagramme, GZT-Umhüllenden, Nachweise mit Zwischenwerten/Fundstellen, Kombinationen und Auflagerkräfte. Verständliche Fehler, sichtbare Vorbemessungsgrenzen/Bruttoquerschnitt.
- JSON-Bericht enthält Projekt, System, verwendete Optionen und Ergebnisse; sicherer Drucktitel. Höhe und Nutzungsklasse gelten für diese Ansicht, wie angezeigt; kein neues Dateiformat.
- Neue DE/EN-Texte zentral in `src/ui/i18n-statics.ts`, registriert in der gemeinsam genutzten `i18n.ts`.
- Generatorfehler korrigiert: doppelte End-/Auflagerkoordinate am First (Null-Längen-Stab); Eigengewicht war zusätzlich durch1000 geteilt (jetzt b*h*4.2e-6 N/mm). Geometrie unverändert. Regressionstests und vollständige Berechnung aller erzeugten Statiksysteme.
- Prüfungen: `npm test`85/85; Typprüfung fehlerfrei; Produktionsbuild erfolgreich. All-generators und Dach-Konstruktionsprüfungen grün. Keine neue Vorlage oder Abhängigkeit.
- Browser: leeres Projekt, Satteldach, Höhenannahme/10m-Eingabe, Kombinations-/Diagrammwechsel, JSON-Download mit erneutem Einlesen geprüft (preliminary=true, 2Stäbe, Höhe10m). 655px-Ansicht ohne horizontalen Überlauf. Physischer Ausdruck nicht geprüft.
- Screenshot: `C:/Users/Administrator/.codex/visualizations/2026/10/15/01a13f98-f5ab-79a0-b297-2bf565f7f533/statics-c3.png`.
- Geänderte Dateien: `src/ui/views/Statics.tsx`, `registry.tsx`, `Project.tsx`, `src/ui/i18n*.ts`, `src/ui/styles.css`, `src/core/generators/roof.ts`, `test/roof.test.ts`, `test/statics-analyze.test.ts`, `test/statics-ui.test.tsx`.
- Grenzen wieT1: ausgewählter Sparren ist kein Nachweis sämtlicher Pfetten/Stützen/Verbindungen. Build parallel zuOCCT-Tests zunächst wegenRAM fehlgeschlagen, danach einzeln erfolgreich. Anschließend Datenträger voll; eigene temporäre npm-Installation und Build-WASM entfernt, Quellen erhalten. Aufgabentafel aus gesichertem T1-Stand rekonstruiert; nur eigene C3-Notizen ergänzt. Worktrees nutzen jetzt das vorhandene node_modules des Hauptprojekts.
- Merge nur nach Nutzerentscheidung: im Hauptprojekt zuerst `git stash push -m "coordination board before statics merge" -- docs/TASKS.md`; danach `git merge --no-ff codex/T1` und `git merge --no-ff codex/C3`. C3 enthält diesen Koordinationsstand. Stash zunächst als Sicherung behalten, nicht blind darüber anwenden.
### T2 – Vorbereitung begonnen (Codex)
- Zweig `codex/T2`, Worktree `C:/Users/Administrator/.codex/worktrees/btlx-t2/OpenWoodCAD`, Basis `codex/C3`.
- Offizielle BTLx-XSD 2.3.1 abgerufen und gelesen, lokal `vendor/btlx/BTLx_2_3_1.xsd` (nicht versioniert). Noch kein Exporter implementiert oder als fertig freigegeben.
- Das offizielle 2.3.1-Schema fordert ausdrücklich `Version="2.3.1"` und den Namensraum `https://www.design2machine.com`; Schema besteht aus 156842Bytes, Stand-Kommentar01.07.2025. Platzierungsdaten benötigen genau Count Transformationen mit je eigener GUID und Position/ReferencePoint/XVector/YVector.
- Bearbeitungsparameter müssen aus Geometrie und grafischer Definition verifiziert werden; XSD-Gültigkeit allein beweist keine richtige Maschinenbearbeitung. Komplexe Polytope dürfen nicht ersatzweise als mehrere unabhängige Halbraumschnitte exportiert werden (ändert die Geometrie). Keine ungeprüften Maschinenprogramme erzeugt.
- Verbleibende Folgearbeiten und Planrestpunkte sind weiterhin offen. Keine Zusammenführung nachmain ausgeführt.

### T1 + C3 – geprüft und zusammengeführt (Claude, 2026-10-15)
- Fachlich geprüft: Schnee-Formeln NA, Windtabelle NA.B.3, Kombinationen EN 1990 (kmod nach kürzester Dauer), EC5 (6.11, 6.13, 6.19, 6.23–6.29, 6.32–6.35, 7.2). Keine Einwände.
- Zusammengeführt nach main (Merge-Commits T1, C3). Stash „coordination board before statics merge“ als Sicherung behalten.

### P0 – Zur Prüfung (Codex, 2026-10-15)

- Zweig `codex/P0`, Worktree `C:/Users/Administrator/.codex/worktrees/reliability-p0/OpenWoodCAD`, abhängig von `codex/U1` (`07bf718`). Kein Merge nach main.
- Speichern serialisiert unveränderliche Dokument-Schnappschüsse. Projektwechsel warten auf den ausstehenden Schreibvorgang, fehlgeschlagene Schreibvorgänge lassen das alte Projekt aktiv. Alte Speicher-/Startlade-Ergebnisse überschreiben weder neue Bearbeitungen noch deren Speicherstatus. Änderungen während asynchronem Dateiöffnen brechen das Öffnen ab; ein bestätigter Austausch speichert das Ausgangsdokument vorher lokal. Browser-Schließen warnt bei ausstehender/fehlgeschlagener Speicherung.
- Projektverwaltung behandelt Fehler bei Öffnen, Anlegen, Kopieren, Löschen und Wiederherstellung; das Kopieren des aktiven Projekts verwendet den aktuellen Bearbeitungsstand. Neue Dokumente setzen Auswahl, Bewegung und alte Prüfmarkierungen zurück.
- GeomClient: gefangene Initialisierungs-/Worker-/Nachrichtenfehler, 120s Zeitlimit pro Anfrage, alle wartenden Aufträge werden bei Ausfall beendet; expliziter Neustart löscht Cache/Fehler und verwirft verspätete Antworten der alten Worker-Generation. UI zeigt Fehler und Neustart-Aktion. Geometriesignaturen verwenden volle Zahlenpräzision; kanonische Bearbeitungs-IDs erhalten Cache-Teilung bei korrekter Zuordnung zu Original-IDs.
- Fehlgeschlagene Bearbeitungen bleiben für eine diagnostische Vorschau sichtbar, sperren jedoch STEP, STL, OCCT-Projektionen, Volumen- und Kollisionsberechnungen im gemeinsamen Geometriekern. Kollisionsfehler werden nicht mehr als 0 Volumen verschluckt. Konstruktionsprüfung unterscheidet ausstehend, Fehler, nicht ausgeführt (>250 Bauteile) und geprüft; ein alter Prüfstatus gilt nicht für ein neues Dokument.
- Produktion/Kalkulation: keine erfundenen Sonder-Handelslängen und keine normalen Plattenpreise für zu große Teile. `Production.unavailable` nennt die nicht beschafften Teile, `CostBreakdown.complete=false` kennzeichnet Teilbeträge. Warnung in Einkaufsansicht und gedruckter Einkaufsliste; Rohgewicht in Eigenschaften, Liste, CSV und Zeichnung ausdrücklich gekennzeichnet.
- Gemeinsame Dateien: neue DE/EN-Texte in `i18n-safety.ts`, Registrierung in `i18n.ts`; package.json/package-lock.json ausschließlich Lizenzfeld an vorhandenes AGPL-3.0-or-later angeglichen. Keine Abhängigkeit und keine Dokumentformatänderung.
- Prüfungen: `npm test` **108/108**, `npx tsc --noEmit` fehlerfrei, Produktionsbuild erfolgreich. Neue Tests: 7 Speicher-/Datei-Rennen, 6 Worker-/Cache-Fälle, 2 echte OCCT-Exportprüfungen, Beschaffungsregression und Kennzeichnung der gedruckten Listen. All-generators grün.
- Grenzen/Abnahme: Browser-Automation konnte nach dem Zurücksetzen nicht mehr starten (Werkzeugfehler beim Schreiben seiner Laufzeitdateien, auch nach Neustart). Daher P0 noch nicht im Browser abgenommen; bestehende U1-Abnahme bleibt separat gültig. Vorschau für manuelle P0-Prüfung: Entwicklungsserver Port5175. Zeitlimit ist ein Schutz gegen Hängen, keine Echtzeitgarantie; bei sehr großen Modellen kann ein expliziter Neustart nötig sein. Brutto-/Rohgewicht ist weiterhin keine Nettovolumenberechnung. Umfassende Zeichnungsstand-/Ausgabeumfang-Konsistenz folgt in C5.
- Merge nur nach Nutzerentscheidung: zuerst U1, danach `git merge --no-ff codex/P0`. Die uncommittete Koordinationsdatei im Hauptprojekt vorher sichern; Sicherungs-Stash nicht blind zurückspielen.

### U1 – Zur Prüfung (Codex, 2026-10-15)

- Zweig `codex/U1`, Worktree `C:/Users/Administrator/.codex/worktrees/cad-ui-u1/OpenWoodCAD`, Basis `main` (`f61dc2c`). T2 ist ein separater, noch nicht integrierter Arbeitsstand; deshalb hier 91 Tests statt der 104 auf dem T2-Zweig.
- Echte Parallel-/Perspektivprojektion mit Erhalt des sichtbaren Maßstabs beim Umschalten; sechs Standardansichten plus Iso. Einpassen berücksichtigt beide Bildschirmrichtungen und schmale Ansichtsfenster. Projektbaum-Doppelklick und „Auswahl einpassen“ lösen auch Vorlagen und Verbindungen zu ihren Bauteilen auf.
- CAD-Mausprofil: links auswählen, mittlere Taste verschieben, Umschalt+mittlere Taste drehen; klassisches Profil weiterhin wählbar. Kameradrehung während Zeichenwerkzeugen gesperrt. Reine Auswahl zeigt Maße, aktiviert aber keine Transformationsgriffe; Verschieben/Drehen ausdrücklich per Werkzeug oder W/R, Escape beendet den Modus.
- Befehlsuche mit S oder Strg+K: übersetzte Werkzeuge, Ansichten, Arbeitsbereiche, Speichern und Undo/Redo; Tastaturauswahl, deaktivierte Aktionen, Escape und Fokusrückgabe. Modale Dialoge sperren globale Modell-Tastenkürzel. Neuer Shortcut auch im Hilfedialog.
- Breite beider Seitenleisten per Ziehen oder Pfeiltasten ändern; separat einklappbar. Schmale Fenster starten mit freiem Modellbereich, Panels öffnen als schließbare Überlagerung. Suchbarer Projektbaum mit automatisch geöffneten Suchtreffern und Tastaturauswahl. Einheitliche eigene SVG-Werkzeugsymbole.
- Lokale CAD-Präferenzen validiert; Wiederherstellung lässt nur bekannte Benutzereinstellungen zu, keine beliebigen Dokument-/Undo-Felder aus localStorage. Dokumentformat unverändert. Neue DE/EN-Texte in `i18n-cad.ts`, Registrierung in `i18n.ts`; keine neue Abhängigkeit.
- Prüfungen: `npm test` **91/91**, `npx tsc --noEmit` fehlerfrei, Produktionsbuild erfolgreich. Sechs neue Tests prüfen echte OrbitControls-Pointergesten, Projektion/Zoom, parallele Strahlen, sämtliche Modellecken in allen Ansichten bei drei Seitenverhältnissen, Präferenzvalidierung und übersetzte Befehle. All-generators unverändert grün.
- Browserabnahme: Werkbank, CAD-Auswahl im Canvas, S/Strg+K und Enter, Parallelprojektion, Draufsicht/Iso, Suche „Bein“, Doppelklick, Panelbreite per Tastatur, Neuladen mit erhaltenen Einstellungen. Bei 1440px und 655px kein horizontaler Dokumentüberlauf; keine Browserfehler. Ein echter Ansichtswürfel, Face/Edge-Auswahl, Baugruppen, Feature-Historie und Skizzensolver gehören zu U2–U4 und sind hier ausdrücklich noch nicht umgesetzt. Keine neue Vorlage.
- Abnahmebild: `C:/Users/Administrator/.codex/visualizations/2026/10/15/01a13f98-f5ab-79a0-b297-2bf565f7f533/cad-u1.png`.
- Merge nur auf Nutzerentscheidung: im Hauptprojekt zunächst die uncommittete Aufgabentafel sichern (`git stash push -m "coordination before U1 merge" -- docs/TASKS.md`), dann `git merge --no-ff codex/U1`. Stash zunächst als Sicherung behalten. Der gesamte CAD-Umbau ist damit noch nicht abgeschlossen.

### U1 – geprüft und zusammengeführt (Claude, 2026-10-15)
- Code gelesen (Kamera-/Projektionsmathematik, Navigation, Präferenz-Validierung, Befehlsuche, Panels). Keine perspektivabhängigen Annahmen mehr in `tools.ts`/`Viewport.tsx`. Eigene Prüfung im U1-Worktree: `tsc` fehlerfrei, `npm test` 91/91.
- Zusammengeführt nach main. Laufende Aufgabentafel vorher gesichert (Stash „coordination before U1 merge (claude)“) und danach wiederhergestellt; Stash als Sicherung behalten.
- Hinweis für U2: Standard-Mausprofil „CAD“ dreht nur mit Umschalt + mittlerer Taste. Auf Laptops mit Touchpad gibt es keine mittlere Taste – dort braucht es einen Ansichtswürfel oder eine andere Drehmöglichkeit (oder „Klassisch“ als Vorgabe bei fehlender Maus). Stil: neue Dateien sind sehr kompakt formatiert; bitte an den Stil der umgebenden Dateien angleichen.

### P0 – geprüft und zusammengeführt (Claude, 2026-10-16)
- Code gelesen: Speicherkette/Schnappschüsse, Projekt- und Dateiwechsel, GeomClient (Zeitlimit, Generationen, Neustart), Exportsperre in `solids.ts`, Beschaffung/Kalkulation. Eigene Prüfung im P0-Worktree: `tsc` fehlerfrei, `npm test` 108/108. Nach main zusammengeführt; Tafel vorher gesichert (Stash „coordination before P0 merge (claude)“) und wiederhergestellt.
- Browserabnahme von P0 steht weiterhin aus (auch von mir nicht durchgeführt, Rechner hat zu wenig freien Speicher).
- Hinweise für später: (1) `overlapVolumes` wirft jetzt bei jedem OCCT-Schnittfehler statt 0 zu liefern – ein einzelner instabiler Boolean macht die ganze Kollisionsprüfung „fehlgeschlagen“. Ehrlich, aber ggf. auf Paar-Ebene als eigene Meldung behandeln. (2) Nach einem Zeitlimit bleibt der Worker bis zum manuellen Neustart aus; bei großen Dachstühlen prüfen, ob 120 s je Stapel reichen. (3) `production.ts` setzt bei fehlendem Plattenformat 2800 × 2070 als Anzeige ein – besser „unbekannt“.

### U1b – Zur Prüfung (Codex, 2026-10-16)

- Zweig `codex/U1b`, Worktree `C:/Users/Administrator/.codex/worktrees/cad-context-u1b/OpenWoodCAD`, baut auf P0 (`9bb1470`) auf. U1 ist inzwischen durch Claude nach main übernommen; P0 bleibt Voraussetzung für diesen Zweig.
- Vergleich mit den oben verlinkten offiziellen Fusion-/Solid-Edge-Unterlagen umgesetzt: Auswahlfilter Balken/Platten, Tiefenauswahl aus echten Raycaster-Mesh-Treffern mit Hervorhebung auch verdeckter Kandidaten, Kontextmenü für Verschieben/Drehen/Kopieren/Verbinden/Einpassen/Ausblenden/Isolieren/Löschen. Modellaktionen auch als Schaltfläche für Tastatur/Touchpad erreichbar; Menü mit Pfeiltasten, Home/End, Escape und Fokusrückgabe.
- Kompaktere Werkzeuggruppen; Standardansichten bleiben im vorhandenen Ansichtspanel. Temporäre Sichtbarkeit über Augen-Schalter an Vorlage und einzelnen Bauteilen, Sichtbarkeitsstatus und Alles-anzeigen-Aktion. Sichtbarkeit verändert weder Dokument noch Undo, Speicherstatus oder Fertigungslisten. Wiederanzeigen außerhalb einer Isolation hebt diese auf. Veraltete Isolations-IDs sperren das Modell nicht.
- Neue Hilfsmodule `selection.ts` und `viewActions.ts`, Komponente `ModelContextMenu.tsx`, DE/EN-Texte `i18n-context.ts` und Registrierung in gemeinsamem `i18n.ts`. Flüchtige Auswahl-/Sichtbarkeitsfelder in `store.ts`; kein Dokumentformatwechsel und keine neue Abhängigkeit. Vorschau-Materialkopien werden beim Modellneuaufbau freigegeben.
- Prüfungen am endgültigen Stand: `npm test` **114/114**, `npx tsc --noEmit` fehlerfrei, Produktionsbuild erfolgreich. Sechs neue Tests decken echte Tiefentreffer, Filter, Auswahlauflösung, Ansichtssichtbarkeit ohne Dokumentänderung, Isolation und DE/EN-Schlüssel ab. All-generators ohne Überschneidungen/fehlgeschlagene Bearbeitungen grün. Keine neue Vorlage.
- Grenzen: manuelle Browserabnahme offen, da das Browserwerkzeug weiterhin beim Anlegen seiner Laufzeitdateien scheitert. Vorschau: `http://127.0.0.1:5176/`. Keine Flächen-/Kantenauswahl und kein vollständiger ViewCube; U2–U4 bleiben offen. Verschieben/Drehen/Kopieren/Löschen eines generierten Bauteils wirken weiterhin auf dessen gesamte Vorlage; das Menü zeigt dafür einen ausdrücklichen Hinweis. Individuelle parametrische Bearbeitung folgt im weiteren Umbau.
- Merge nur nach Nutzerentscheidung: im Hauptprojekt die lokale Aufgabentafel zunächst sichern (`git stash push -m "coordination before P0 U1b merge" -- docs/TASKS.md`), danach zuerst `git merge --no-ff codex/P0`, dann `git merge --no-ff codex/U1b`. Bei Konflikten in TASKS.md neue Übergaben und Claudes bereits erfolgte U1-Abnahme erhalten; Sicherungs-Stash nicht blind zurückspielen. Kein Merge ausgeführt.

### U2 – In Arbeit (Codex, 2026-10-16)

- Arbeitszweig `codex/U2` baut auf U1b auf. Präzisionswerkzeuge: explizite XY/XZ/YZ-Ebene mit sichtbarer Vorschau, echter nächster Kantenpunkt, sichere Maßausdrücke und Länge/Winkel, Werkzeugpanel mit Übernehmen/Abbrechen. Tests für Eingabegrenzen und Dokumenttransaktionen. U2-Dateigrenzen umfassen zusätzlich `src/ui/styles.css` und neue reine UI-Hilfsmodule sowie `panels/Toolbar.tsx`; keine neuen Abhängigkeiten. P1 überschneidende Anforderungen werden hier abgedeckt, Nut/Falz/Ablängen bleibt separat nachzuweisen.

### U1b – geprüft und zusammengeführt (Claude, 2026-10-16)
- Code gelesen (Tiefenauswahl, Auswahlfilter, Kontextmenü, Ansichts-Sichtbarkeit ohne Dokumentänderung, Freigabe temporärer Materialien). Eigene Prüfung im U1b-Worktree: `tsc` fehlerfrei, `npm test` 114/114. Nach main zusammengeführt; Tafel vorher gesichert (Stash „coordination before U1b merge (claude)“) und wiederhergestellt.
- Hinweis: „Alle anzeigen“ setzt Ansichts-Overrides auf sichtbar für alle Bauteile, also auch für im Dokument ausgeblendete (`e.hidden`). Gewollt? Sonst nur Overrides löschen.
