# Aufgabentafel

Ablauf und Regeln: siehe `AGENTS.md`. Status: `frei` · `in Arbeit` · `zur Prüfung` · `erledigt`.

| ID | Aufgabe | Owner | Status | Zweig |
|---|---|---|---|---|
| T1 | Statik-Rechenkern (Stabwerk 2D, Lasten, EC5-Nachweise) | Codex | erledigt | codex/T1 |
| T2 | BTLx-Export (Abbundmaschinen) | Codex | in Arbeit | codex/T2 |
| T3 | IFC4-Export (BIM) | Codex | frei | codex/T3 |
| T4 | PWA: installierbar + offline | Codex | frei | codex/T4 |
| T5 | Übersetzungen: Vollständigkeitstest + Englisch prüfen | Codex | erledigt | codex/T5 |
| T6 | Reststücke-Lager im Zuschnitt | Codex | frei | codex/T6 |
| C1 | Dach-Generatoren Satteldach (Pfetten-/Kehlbalkendach), Pultdach | Claude | erledigt | main |
| C2 | Carport-Generator | Claude | erledigt | main |
| C3 | Statik-Oberfläche (nach T1) | Codex | erledigt | codex/C3 |
| C4 | Verbindungen am Modell mit Vorschau bearbeiten | Codex | erledigt | codex/C4 |
| C5 | Werkstattunterlagen: eigene Maße, Schnitte, Detailansichten | Codex | erledigt | codex/C5 |
| C6 | Möbel: Schrank mit Türen/Topfbändern, Beschlagbibliothek | Codex | erledigt | codex/C6 |
| U1 | CAD-Arbeitsplatz: Navigation, Projektion, Befehlsuche, flexible Panels und Projektbaum | Codex | erledigt | codex/U1 |
| U2 | Präzises Konstruieren: Auswahlfilter, Kantenfang, Arbeitsebenen, direkte Maße und Werkzeugvorschauen | Codex | erledigt | codex/U2 |
| U1b | Kontextwerkzeuge, QuickPick, Auswahlpriorität und temporäre Sichtbarkeit | Codex | erledigt | codex/U1b |
| U3 | Bearbeitungsbaum, Baugruppen und stabile Geometriereferenzen | Codex | erledigt | codex/U3 |
| U4 | Freie parametrische Skizzen, Beziehungen und nachträgliche Bearbeitung | Codex | in Arbeit | codex/U4 |

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

### U2 – Zur Prüfung (Codex, 2026-10-16)

- Zweig `codex/U2`, Worktree `C:/Users/Administrator/.codex/worktrees/precision-u2/OpenWoodCAD`, basiert auf U1b (`aa0efc6`). P0/U1b sind inzwischen von Claude nach main übernommen; kein Merge dieses Zweigs ausgeführt.
- Explizite XY/XZ/YZ-Arbeitsebenen mit Koordinatenversatz und sichtbarem Ebenengitter; automatische Bauteilflächen für Platten/Ausschnitte bleiben wählbar. Fang verwendet die dargestellten, erfolgreich berechneten OCCT-Kantenpolylinien in Weltkoordinaten inkl. Schubkastenbewegung, Auswahlfilter, Ansichts-Sichtbarkeit und Schnitt-Clipping. Kontinuierlicher nächster Kantenpunkt, End- und Mittelpunkte; keine erfundenen Quader-Ecken an bereits beschnittenen Teilen. Bei noch nicht berechneter oder fehlerhafter Geometrie kein behaupteter präziser Kantenfang. Kurvenfang ist durch die Polyline-Auflösung der Vorschau angenähert, kein analytischer BRep-Kurvenfang.
- Maßausdrücke ohne eval: Rechenarten/Klammern, mm/cm/m/in, Dezimalkomma; Rechteck `600+2*19 x 40cm`, Länge/Winkel `1m@45°` relativ zur aktiven Ebene. Längenfelder in Eigenschaften verwenden denselben sicheren Parser. Strikte Eingabelänge, Verschachtelung, endliche Werte, Einheiten- und Bereichsprüfung. Fehler erhalten den Entwurf zur Korrektur. Selbstüberschneidende/degenerierte freie Umrisse werden abgewiesen.
- Sichtbares Werkzeugpanel mit Maßfeld, Übernehmen/Abbrechen und Fangart; direkte Maßvorschau mit transparenten Balken/Platten/Kreisen. Abbrechen verändert das Dokument nicht; jede abgeschlossene Geometrie erzeugt einen Undo-Schritt, Balkenketten pro Segment. Vier Kamera-Drehschaltflächen ergänzen Mausprofile für Touchpads; Radius bleibt erhalten, Polüberschläge werden begrenzt. Ebenenwechsel verwirft nur die laufende Vorschau.
- Gemeinsame Dateien: flüchtige `workPlane`/`toolDraft` in `store.ts`, neue DE/EN-Texte `i18n-precision.ts` und Registrierung in `i18n.ts`. Zusätzlich erlaubt/geändert: `components/Field.tsx`, `components/CadWorkspace.tsx`, `panels/Toolbar.tsx`, `styles.css`, neues Kamera-Hilfsmodul `orbit.ts`. Keine Dokumentmigration und keine neue Abhängigkeit.
- Prüfungen: `npm test` **124/124**, `npx tsc --noEmit` fehlerfrei, Produktionsbuild erfolgreich. Zehn neue Tests: Parser/Sicherheit, Ebenen, echter Kantenpunkt/Clamping/Ebenenschnitt, Vorschau ohne Dokumentänderung, Transaktionen/Undo, vertikale Platte, ungültige Umrisse, Touchpad-Orbit, DE/EN. All-generators grün.
- Browserabnahme wieder möglich: Balken `1m@45°` auf XZ, Platte `638 x 400` bei Y=500, Eigenschaftslänge `600+2*19` ergibt 638, Schaltflächen-Orbit, Parallelprojektion, Kontextaktionen Ausblenden/Alles anzeigen. Keine Browserfehler. Bei 800px kein horizontaler Dokumentüberlauf; Panelüberlagerungen bleiben über vorhandene Schließen-Schaltflächen bedienbar. Abnahmebild `C:/Users/Administrator/.codex/visualizations/2026/10/15/01a13f98-f5ab-79a0-b297-2bf565f7f533/precision-u2.jpg`. Der vorherige U1b-Werkzeugfehler ist behoben; damit Teilnachprüfung von U1b möglich, kein nachträglicher Anspruch auf dessen vollständige Tiefenauswahl-Bedienabnahme.
- Grenzen/offen: analytische Kanten-/Flächenreferenzen, gebundene Maße, freier Skizzensolver und Baugruppen folgen in U3/U4/P2. Nut/Falz/Ablängen und zwei vollständige frei konstruierte Referenzprojekte fehlen weiterhin in P1. Der gesamte Umbau ist nicht abgeschlossen. Zu Claudes U1b-Hinweis: Alle-anzeigen ist absichtlich eine reine Ansichtsübersteuerung auch für alte Dokument-hidden-Felder; Fertigungsumfang wird dadurch nicht verändert und ist in C5 separat zu vereinheitlichen.
- Merge nach Nutzerentscheidung: lokale Aufgabentafel zuerst sichern, danach `git merge --no-ff codex/U2`. Claudes bereits erfolgte U1/P0/U1b-Abnahmen bei TASKS-Konflikten erhalten; Sicherungs-Stash nicht blind zurückspielen.

### C4 – In Arbeit: Entwurf und Dateigrenzen (Codex, 2026-10-16)

- Zweig `codex/C4`, Basis U2. Transaktionale Verbindungsentwürfe bleiben außerhalb des Dokuments; nur die 3D-Ansicht erhält eine temporäre Auswertung. Übernehmen prüft den Ausgangsstand und Geometrie, erzeugt einen Undo-Schritt; Abbrechen speichert nichts.
- Generierte Verbindungen erhalten stabile bestehende Generator-IDs. Gleichnamige explizite Einträge in `doc.joints` übersteuern den generierten Vorschlag; optionales `Joint.suppressed` unterdrückt ihn. Format wird dafür auf 2 angehoben: alte Version 1 ohne zusätzliche Felder migriert unverändert, alte Programme müssen Version 2 ablehnen. Laden prüft auch reale generierte Referenzen statt sie als fehlende freie Teile zu verwerfen. Entfallene Generator-IDs werden nicht still auf andere Bauteile umgebogen.
- Erlaubt: `src/ui/panels/Dialogs.tsx`, `Properties.tsx`, `Tree.tsx`, neue UI-Komponenten/Hilfsmodule, `store.ts`, `Viewport.tsx`, `styles.css`, `i18n*.ts`, `actions.ts`, `src/core/evaluate.ts`, `model.ts` und `validate.ts` für diesen dokumentierten Override-/Migrationsentwurf, passende Tests und TASKS.md. Zusätzlich Kopieren interner Verbindungen, Bereinigen externer Verbindungen beim Löschen von Vorlagen und Rotieren von Bewegungsvektoren. Keine neue Abhängigkeit.

### C4 – Zur Prüfung (Codex, 2026-10-16)

- Zweig `codex/C4`, Worktree `C:/Users/Administrator/.codex/worktrees/joint-preview-c4/OpenWoodCAD`, baut auf `codex/U2` (`2fc0075`) auf. Keine Zusammenführung durch Codex.
- Neues Verbindungsfenster mit Typwahl, Parametern, A/B-Tausch, Paar einpassen und optional sichtbarer Umgebung. Nur die 3D-Ansicht zeigt den Entwurf; Listen, Exporte, Speicherung und Dokument bleiben bis Übernehmen unverändert. Betroffene Teile werden zunächst freigestellt und markiert. Abbrechen/Escape stellt die ursprüngliche Ansicht/Auswahl wieder her. Übernehmen erzeugt einen Undo-Schritt und wird bei verändertem Ausgangsdokument gesperrt.
- Vorschau wartet auf gebaute Geometrie beider Teile, fängt Worker-/Bearbeitungsfehler und prüft das Paar auf wesentliche Überschneidung (derselbe Grenzwert 500 mm³ wie die Konstruktionsprüfung). Veraltete asynchrone Ergebnisse geben keinen neuen Entwurf frei. Diese Paarprüfung ersetzt keine vollständige Kollisions- oder Verbindungsbemessung; benachbarte dritte Bauteile prüft weiterhin die Konstruktionsprüfung.
- Generierte Verbindungen erscheinen im Baum und über Aktionen direkt am Bauteil. Stabile vorhandene Generator-Joint-IDs werden durch explizite Einträge gleicher ID übersteuert; die Vorlage bleibt parametrisch. Löschen einer generierten Verbindung speichert ein `suppressed`-Override; Wiederaktivieren ist über den Editor möglich. Auflösen einer Vorlage übernimmt Overrides ohne doppelte IDs. Entfallen referenzierte Teile nach einer Vorlagenänderung, wird eine Warnung ausgegeben; beim Laden wird eine unauflösbare Verbindung mit Reparaturhinweis entfernt, niemals auf ein anderes Teil umgebogen.
- Modell-/Migration: `Joint.suppressed?` und `FORMAT_VERSION=2` in gemeinsamem `src/core/model.ts`; Migration 1→2 ohne Geometrieänderung. Ältere Programme dürfen v2 nicht öffnen, damit sie Unterdrückungen nicht ignorieren. Validator löst reale generierte Bauteil-IDs auf, erhält externe Verbindungen und Overrides, verwirft ungültige/doppelte Verbindungen mit Bericht. Gemeinsame Texte in `i18n-joint-edit.ts` und Registrierung in `i18n.ts`; flüchtige Vorschau in `store.ts`. Keine neue Abhängigkeit.
- Zusätzlich behoben: interne Verbindungen werden beim Kopieren freier Bauteile mitkopiert; Vorlagen-Overrides werden beim Kopieren auf neue IDs umgeschrieben; externe Verbindungen werden beim Vorlagenlöschen bereinigt; Bewegungsvektoren werden beim Drehen von Vorlagen mittransformiert. Einpassen löst auch generierte Verbindungen auf.
- Prüfungen am endgültigen Stand: `npm test` **133/133**, `npx tsc --noEmit` fehlerfrei, Produktionsbuild erfolgreich, all-generators grün. Acht neue Transaktions-/Override-/Lade-/Kopier-/Lösch-/Rotationsprüfungen und ein echter OCCT-Test für gültigen Zapfen/Schlitz ohne Überschneidung.
- Browserabnahme auf Port5178: Werkbank-Zapfen von 36 auf 50 mm, Abbrechen ergibt wieder 36; Übernehmen + Neuladen ergibt 50. Geprüfte Freigabe, freigestelltes Paar, Umgebung einblenden, Einpassen; keine Browserfehler. Bild: `C:/Users/Administrator/.codex/visualizations/2026/10/15/01a13f98-f5ab-79a0-b297-2bf565f7f533/joint-c4.jpg`.
- Zusammenführen nach Nutzerentscheidung: lokale Aufgabentafel sichern, zunächst `git merge --no-ff codex/U2`, danach `git merge --no-ff codex/C4`; bereits zusammengeführte Zweige auslassen. Neue Abnahmen in TASKS.md bei Konflikten erhalten. U3/U4/P1/P2 und übrige Fachaufgaben bleiben offen; dieser Schritt schließt nicht den gesamten Auftrag ab.

### C6 – In Arbeit: Schrank und Beschläge (Codex, 2026-10-16)

- Zweig `codex/C6` baut auf C4 auf. Neue Schrankvorlage mit einer/zwei aufschlagenden Türen, Topf-/Montagebohrungen, wählbaren Beschlagmustern und Griffen. Bestehenden Regal-Korpus wiederverwenden, Türen ohne Überschneidung ansetzen. Bibliothek enthält bemaßte Muster mit Quellen; kein allgemeiner Tragfähigkeits- oder Kollisionsnachweis für Beschläge. Türöffnen als ausdrücklich vereinfachte Rotation statt vorgetäuschter Schubbewegung.
- Erlaubt: neue `src/core/generators/schrank.ts`, `src/core/fittings.ts`, Generatorregistrierung `generators/index.ts`, `catalog.ts` für Beschlagmetadaten, `model.ts`/`evaluate.ts` für optionale Rotationsvorschau der vorhandenen motion-Daten, UI `Viewport.tsx`, neue Hilfsmodule, `panels/Toolbar.tsx`, `i18n*.ts`/Vorlagenübersetzungen, passende Tests und TASKS.md. Keine neue Abhängigkeit. Vor Übergabe all-generators und Konstruktionsprüfung ohne Befund für neue Defaults.

### C6 – Zur Prüfung (Codex, 2026-10-16)

- Zweig `codex/C6`, Worktree `C:/Users/Administrator/.codex/worktrees/cabinet-c6/OpenWoodCAD`, Basis C4 (`4571b04`). Neue Vorlage `schrank` wiederverwendet den Regal-Korpus; eine/zwei aufschlagende Türen, Anschlag links/rechts, Tür-/Frontfuge, Bandzahl, Topfabstand, Montageplattenposition, Griffe/Knöpfe und Frontmaterial sind parametrisch.
- Dimensionierte Beschlagbibliothek `src/core/fittings.ts` und UI `components/FittingLibrary.tsx`: Topf Ø35×13, Befestigungsraster 45/9,5, Griffmuster 96/128/160 und Knopf. Quelle für Topf-/Befestigungsmuster: offizielles Blum TD-032/1EN, S.3 (`https://d2.blum.com/services/BEC003/clp0001-td-032_td_dok_bau_$sen_$aof_$v4.pdf`). Montageplatten-/Pilotbohrungen sind ausdrücklich Planungswerte; die Quelle wird in der Bibliothek verlinkt. Keine Herstellerfreigabe oder Band-Tragfähigkeitsberechnung behauptet.
- Topf-, Befestigungs-, Montageplatten- und Griffbohrungen entstehen als echte Bearbeitungen; Höhen erscheinen in den Montageangaben. Beschläge und Befestigungsmittel gehen in Stückliste/Einkauf/Kalkulation ein. Neue Beispiel-Katalogeinträge für Topfband-/Montageplatten- und Griffschrauben. In optionalen Lochreihen werden mit Montageplattenbohrungen kollidierende Löcher unterbrochen. Unpassende Materialdicken/Bandabstände werden mit Befund abgewiesen.
- Optionale `motion.rotation` im gemeinsamen `model.ts`: Türrotation um Weltachse/-punkt; `evaluate.ts` transformiert diese Daten mit der Vorlage. Neue UI-Hilfe `motion.ts` berechnet dieselbe Matrix für Aufbau und Animation. Geschlossene Fertigungsgeometrie bleibt maßgebend; Bewegung ist reine Vorschau. Keine Formatversion zusätzlich zu C4 nötig, da das neue optionale Feld die geschlossene Fertigungsgeometrie nicht ändert. `validate.ts` prüft Bewegungsdaten und entfernt defekte Vorschauen mit Reparaturhinweis. Neue UI-Bibliothek in `Properties.tsx`; DE/EN-Texte in gemeinsamem `i18n-gen.ts`.
- Einzelne Türen/Schubkästen können nach Alle-öffnen nun auch geschlossen werden: gruppenspezifische Stellung hat Vorrang vor der globalen Vorgabe. Globale Schaltfläche setzt die Einzelzustände wie bisher zurück.
- Prüfungen am endgültigen Stand: `npm test` **142/142**, `npx tsc --noEmit` fehlerfrei; Produktionsbuild erfolgreich (vor letzter zusätzlicher Importvalidierung, abschließende Typ-/Gesamttests einschließlich dieser grün). All-generators enthält die neue Vorlage: keine Warnung, Überschneidung oder fehlgeschlagene Bearbeitung; neue Konstruktionsprüfung `staticChecks(ev, production(...))` ohne Befund. Acht neue Tests für Kennwerte/Handrechnung, Hardwaremengen, Materialgrenzen, Einzeltür/Lochreihen, geschlossene Geometrie, Drehachsen und Speichern/Laden.
- Browserabnahme auf Port5179: Schrank erzeugt, Türen global geöffnet, Beschlagbibliothek mit Quelle geöffnet; Geometriekern bereit, Konstruktion ohne Befund, keine Browserfehler. Bild `C:/Users/Administrator/.codex/visualizations/2026/10/15/01a13f98-f5ab-79a0-b297-2bf565f7f533/cabinet-c6.jpg`.
- Grenzen: ein generisches Planungsmuster für 35-mm-Topfbänder, mehrere Griffmuster; Schrauben/Bohrungen und Bandzahl vor Fertigung mit dem konkreten Beschlag, Plattenaufbau und Türgewicht abstimmen. Türöffnung ist eine vereinfachte Kantenrotation, keine exakte Mehrgelenkkinematik oder Umfeld-Kollisionsprüfung. Keine eingelassenen Türen oder andere Sonderbeschläge. Keine neue Abhängigkeit.
- Merge nur nach Nutzerentscheidung: Aufgabentafel sichern; U2 → C4 → `git merge --no-ff codex/C6`, schon integrierte Zweige auslassen. C5/T5/T4/T3/T6, T2-Rest sowie U3/U4/P1/P2 bleiben offen.

### C5 – In Arbeit: Zeichnungsentwurf (Codex, 2026-10-16)

- Zweig `codex/C5` baut auf C6 auf. Eigene Ansichtsblätter mit front/side/top, echten geschnittenen Volumenkörpern und optionalem Detailfenster. Freie Maße binden an stabile Bauteil-ID plus Rohteil-Ecke (0–7), alternativ Modell-Rohmaßkasten; keine vorgetäuschten BRep-Flächenreferenzen. Maße werden bei Modelländerungen neu berechnet. Fehlende Referenzen sperren die Neugenerierung statt falsche Maße weiterzuverwenden. Schnitte zunächst ohne Materialschraffur, als solche beschriftet.
- Persistenz: optionale `drawingViews` im Dokument, Format 3; Migration 2→3 ohne Geometrieänderung, alte Dateien bleiben lesbar. Ansichts-/Maßdaten streng begrenzen/validieren. Gemeinsame Dateien `src/core/model.ts` und `validate.ts` ausdrücklich erlaubt.
- Erlaubt ergänzend `src/geom/kernel.ts`, `solids.ts`, `protocol.ts` für echte ausschließlich zur Zeichnung verwendete Schnitt-/Detailkörper; `src/drawing/*`, `src/ui/views/Drawings.tsx`, `views/registry.tsx` (Ausgabeumfang), neue UI-Komponenten/Hilfsmodule, `i18n*.ts`, `styles.css`, passende Tests inkl. Formatversionserwartungen und TASKS.md. Kein neuer Fertigungsausschluss: temporäre/alte Sichtbarkeit bleibt Ansichtseinstellung, alle dokumentierten Bauteile gehen konsistent in Listen, Zeichnungen und STEP/STL ein. Keine neue Abhängigkeit.
- Zeichnungsjobs an Dokument/Optionen binden; alte Ergebnisse sofort ausblenden und Export während Neuberechnung/bei Fehlern sperren. Printtitel escapen; verspätete Ergebnisse nach Modell-/Projektwechsel verwerfen.

### C5 – Zur Prüfung (Codex, 2026-10-16)

- Zweig `codex/C5`, Worktree `C:/Users/Administrator/.codex/worktrees/workshop-c5/OpenWoodCAD`, Basis C6 (`de145e5`). Kein Merge nach main ausgeführt.
- Eigene persistente Ansichtsblätter front/side/top, echter Volumenschnitt und Detailfenster; frei ergänzbare horizontale, vertikale und ausgerichtete Maße. Referenzen auf Bauteil-ID plus Rohteil-Ecke oder gesamten Rohmaßkasten werden bei Modelländerungen neu berechnet. Fehlende Referenzen, Nullmaße und Referenzen außerhalb des Detailfensters sperren die Ausgabe mit Fehler statt falsche Maße zu drucken.
- Gemeinsames Dokumentmodell: `drawingViews?`, `FORMAT_VERSION=3`, Migration 2→3 ohne Änderung der Fertigungsgeometrie. Validator begrenzt Ansichten, Maße und Koordinaten; ungültige Einträge erhalten Reparaturhinweise. Maße referenzieren ausdrücklich Rohteil-Ecken, keine bearbeiteten BRep-Kanten. Schnitte sind als ohne Materialschraffur beschriftet; Hatching bleibt eine Grenze dieses Schritts.
- Geometriekern schneidet ausschließlich temporäre Zeichnungskörper, Fertigungs-Cache bleibt unverändert. Ausgabeumfang vereinheitlicht: alle dokumentierten Teile in Zeichnungen, STEP/STL und Kollisionsprüfung, unabhängig von alter oder temporärer Ansichtssichtbarkeit und Türöffnung.
- Zeichnungsjobs an Dokument und Optionen gebunden; alte Blätter sofort ausgeblendet, Export während Neuaufbau oder nach Fehler gesperrt, verspätete Antworten verworfen. PDF prüft den Dokumentstand nach Konvertierung erneut. Sichere Drucktitel, DXF mit ausgerichtetem Text und Maßpfeilen. Neue DE/EN-Schlüssel `i18n-drawing.ts`, Registrierung in gemeinsamem `i18n.ts`; keine neue Abhängigkeit.
- Abschlussprüfungen: `npm test` **150/150**, `npx tsc --noEmit` fehlerfrei, Produktionsbuild erfolgreich. Acht neue Tests: lebende Maße, echter OCCT-Schnitt mit unverändertem Cache, ungültige Referenzen, sichtbarkeitsunabhängige Ausgabe, DXF-Pfeile/Rotation, Migration/Validierung, Job-Rennen, Drucktitel und Sprachschlüssel. All-generators grün, keine neue Vorlage.
- Browserabnahme Port5180: Platte von 600 auf 800 ändern, altes Blatt/Export sofort gesperrt und Maß anschließend 800; Schnitt Z=9,5 durch 19-mm-Platte und 500×500-Detail, zweites Maßblatt, PDF (5243 Bytes) und DXF (12228 Bytes) heruntergeladen. Nach Neuladen beide eigenen Blätter, Schnitt, Detail und Maß 800 wiederhergestellt; keine Browserfehler. Physischer Ausdruck nicht geprüft. Bild `C:/Users/Administrator/.codex/visualizations/2026/10/15/01a13f98-f5ab-79a0-b297-2bf565f7f533/workshop-c5.jpg`.
- Merge nur nach Nutzerentscheidung: lokale Aufgabentafel sichern; U2 → C4 → C6 → `git merge --no-ff codex/C5`, bereits integrierte Zweige auslassen und neuere Claude-Notizen erhalten. Gesamter UI-Umbau weiterhin offen: insbesondere U3/U4, restliches P1/P2 und vollständige Referenzprojekt-Abnahme; Fachaufgaben T2/T5/T4/T3/T6 bleiben offen.
### T5 – In Arbeit: Sprachprüfung (Codex, 2026-10-16)
- Zweig `codex/T5`, Basis C5. Vollständigkeitstest ohne deutschen Fallback, Schlüssel aus TypeScript-Syntax und dynamischen Generator-/Joint-Metadaten, gleiche Platzhalter je Sprache. Erlaubt ergänzend `src/ui/panels/Dialogs.tsx` für bisher einsprachige Hilfe-/Tastaturtexte und passende Testdateien; keine Abhängigkeit. Vorlagen-/Bauteilnamen im Dokument sind Benutzerdaten und werden beim Sprachwechsel nicht umgeschrieben.
### T5 – Zur Prüfung (Codex, 2026-10-16)
- Zweig `codex/T5`, Basis C5 (`4801239`). Syntaxbasierter Vollständigkeitstest sammelt Übersetzungsschlüssel aus `src`, generierten Parametern/Optionen/Gruppen, Verbindungstypen/Parametern, Rollen und ProcessingType-Union. Prüft echte getrennte DE-/EN-Wörterbücher ohne Fallback sowie identische Platzhalter aller registrierten Schlüssel.
- Fehlendes englisches `app.name` ergänzt; Hilfehinweis zur Vorbemessung, Werkzeug-Abbruch und Tastenkürzel/Schließen-Beschriftung DE/EN. Englische Hilfe-/Shortcut-Dialoge werden als echte React-Ausgabe geprüft. Geprüfte Zimmermannsbegriffe rafter/purlin/birdsmouth/collar tie waren bereits vorhanden. Freie Projekt-/Bauteilnamen bleiben unverändert.
- Abschluss: `npm test` **153/153**, `npx tsc --noEmit` fehlerfrei, all-generators grün. Keine Abhängigkeit oder Formatänderung. Grenzen: Syntax-/Metadatenprüfung ist keine automatische Erkennung beliebiger künftig hartcodierter UI-Prosa; neue dynamische Schlüsselfamilien müssen in die Metadatenerfassung aufgenommen werden.
- Übergabe: nach C5 und vorherigen Voraussetzungen `git merge --no-ff codex/T5`; lokale Aufgabentafel sichern und neue Koordinationsnotizen erhalten. Kein Merge ausgeführt. U3/U4 und übrige offene Aufgaben bleiben offen.
### U3 – In Arbeit: Modell-/Migrationsentwurf (Codex, 2026-10-16)
- Nach C5/T5 folgt für den erneut beauftragten UI-Abschluss U3. Zweig `codex/U3`, Basis T5. Bestehende `groups` werden echte verschachtelbare Baugruppen: optionale starre lokale `frame`, `parent`; freie Bauteile und Generatoren gehören über `groupId` dazu. Ohne Gruppe bleiben Weltkoordinaten unverändert. Auswertung komponiert Elternrahmen; Umhängen/Auflösen erhält Weltplatzierung und Bewegungsdaten. Auswahl, Kopieren/Löschen und Transformationen respektieren Hierarchien ohne doppelte Bewegung. Keine Behauptung mechanischer Zwangsbedingungen.
- Format 4: Migration 3→4 setzt keine neue Geometrie, alte Gruppen ohne Rahmen bleiben Identität. Ungültige Rahmen, fehlende Eltern oder Zyklen werden beim Laden zurückgewiesen, damit keine falsche Lage entsteht. Freie Bearbeitungen erhalten optional `suppressed`; Auswertung entfernt sie aus Fertigungsgeometrie. Abgeleitete Bearbeitungen werden über ihre Verbindung bearbeitet.
- Bearbeitungsbaum zeigt jede Bearbeitung mit stabiler Bauteil-/Bearbeitungs-ID und Herkunft; freie Bearbeitungen editierbar, unterdrückbar, umordnen/löschbar. Abhängigkeitsgraph aus Baugruppen, Generatoren, Bauteilen, Verbindungen und Bearbeitungen, eindeutige Referenzdiagnose. Semantische Rohteil-Ecken und Bearbeitungsursprünge als stabile Referenzen; keine BRep-Kantenindexbindung oder vorgespiegelte Skizzenhistorie. Topologieänderungen dürfen fehlende Referenzen nicht still neu zuordnen.
- Erlaubt: `src/core/model.ts`, `validate.ts`, `evaluate.ts`, neue Kernmodule für Baugruppen/Referenzen/Abhängigkeiten und Tests; UI `actions.ts`, `selection.ts`, `Viewport.tsx`, `panels/Tree.tsx`, `Properties.tsx`, `TransformPanel.tsx`, neue Komponenten/Hilfsmodule, `commands.ts`, Kontextmenü, `store.ts` falls nötig, `i18n*.ts`, `styles.css`, passende Tests und TASKS.md. Kein neues Paket. U4 bleibt eigene Aufgabe.
### U3 – Zur Prüfung (Codex, 2026-10-16)
- Zweig `codex/U3`, Worktree `C:/Users/Administrator/.codex/worktrees/assemblies-u3/OpenWoodCAD`, Basis T5 (`0cdfe5b`). Kein Merge nach main.
- Echte verschachtelte Baugruppen mit lokalen Rahmen, Generator-/Bauteilmitgliedschaft, Weltplatzierung im Editor, Umhängen ohne Lageänderung, Auflösen, Kopieren einschließlich interner Verbindungen und Generator-Overrides, Löschen kompletter Unterbäume. Auswahl normalisiert Eltern/Kind, damit Transformationen nicht doppelt wirken; Gizmo und Transformationspanel unterstützen gemischte Objekte. Einzelne Mitglieder bleiben bearbeitbar. Bewegungsachsen/-punkte werden mitgeführt; Kopien erhalten eigene Bewegungsgruppen.
- Projektbaum mit Tastaturbedienung zeigt einzelne direkte/abgeleitete Bearbeitungen. Direkte Bohrungen, Schnitte und Schnittregionen editierbar, unterdrückbar, umordnen/löschbar. Abgeleitete Bearbeitungen führen zum Verbindungseditor, Generatorbearbeitungen zur Vorlage. Unterdrückungen wirken auf echte OCCT-Geometrie. Beim Geometrieedit werden Bohr-Metadaten aktualisiert, nicht mehr belegbare Schnitt-Metadaten entfernt statt falsche Fertigungsmaße auszugeben.
- Abhängigkeitsgraph trennt Rohteil, Verbindung, Bearbeitungsfolge und fertigen Körper, unabhängig von Undo. Semantische Rohteil-Ecken und Bearbeitungsursprünge lösen über stabile IDs auf; fehlende/unterdrückte Referenzen werden diagnostiziert. Keine transienten OCCT-Kantenindices als stabile Referenzen behauptet. `references.ts` enthält das erweiterbare API, Zeichnungsreferenzen bleiben auf Rohteil-Ecken begrenzt.
- Gemeinsames Format 4 (`model.ts`): Gruppenrahmen, Generator.groupId, explizite Processing.suppressed. Migration 3→4 erhält Geometrie; alte Gruppen ohne Rahmen sind Identität. Validator weist Zyklen, fehlende Eltern, nicht starre Gruppenrahmen, doppelte Bearbeitungs-IDs und ungültige Unterdrückungsflags zurück. Neue DE/EN-Texte `i18n-assembly.ts` in `i18n.ts` registriert. Keine neue Abhängigkeit.
- Abschluss: `npm test` **164/164**, `npx tsc --noEmit` fehlerfrei, Produktionsbuild erfolgreich, all-generators grün. Elf neue Tests einschließlich verschachtelter Transformation, Kopieren/Löschen/Undo, Generatorauflösen, Speichern/Laden, Bewegungsachsen, echten Bohrungsvolumina, Referenzdiagnose, Graphzyklen und Metadatenkonsistenz.
- Browser Port5181: freien Holzrahmen geladen, Baugruppe erzeugt, X=1000/Z-Rotation30°, Bohrung Ø10→16, unterdrückt/reaktiviert, Baugruppe kopiert (4 Teile), Datei heruntergeladen und nach Neuladen Baugruppen und Ø16 wiederhergestellt. Kopie anschließend auf X=2500 versetzt. Keine Browserfehler. Screenshot `C:/Users/Administrator/.codex/visualizations/2026/10/15/01a13f98-f5ab-79a0-b297-2bf565f7f533/assemblies-u3.jpg`.
- Grenzen: starre Baugruppen, keine mechanischen Zwangsbedingungen; keine beliebigen persistenten BRep-Flächen-/Kantenreferenzen. Schnittregionen werden über Ebenen bearbeitet, nicht als historischer Nut-/Falz-Dialog rekonstruiert. Spiegeln behält die vorhandene Rahmen-Spiegelkonvention bei und ist kein allgemeiner Spiegeloperator für asymmetrische Körper. Parametrische Skizzen bleiben U4; übrige offene Aufgaben unverändert.
- Merge nach Nutzerentscheidung: lokale Tafel sichern; vorherige Voraussetzungen bis T5, dann `git merge --no-ff codex/U3`; neue Koordinations-/Claude-Notizen bei Konflikten erhalten. Kein Merge ausgeführt.
### U4 – In Arbeit: Skizzenmodell und Migration (Codex, 2026-10-16)
- Zweig `codex/U4`, Basis U3. Optionale `Element.sketch` beschreibt eine editierbare ebene Linienkontur mit stabilen Punkt-/Segment-/Beziehungs-IDs. Element.frame ist dann der Skizzenursprung; der ausgewertete Rohteilrahmen wird um den Kontur-Minimalpunkt versetzt. Länge/Breite/Umriss entstehen aus der gelösten Skizze; Material und Extrusionsdicke bleiben Bauteileigenschaften. Bestehende Bauteile bleiben unverändert, Kopieren/Baugruppen übernehmen die lokale Skizze. Format 5, Migration 4→5 ohne Geometrieänderung.
- Reiner Kernsolver für fixierte Punkte, Koinzidenz, horizontal/vertikal, Punktabstände (auch X/Y), Segmentlänge, gleiche Längen, parallel/rechtwinklig und Winkel. Numerische gedämpfte Ausgleichsrechnung mit Rang/Freiheitsgraden, redundanten und widersprüchlichen Bedingungen; keine Behauptung eines allgemeinen BRep-/3D-Solvers. Begrenzte Systemgröße/Iterationen, Validierung von IDs, Werten und Referenzen. Geschlossene einfache Linienprofile; Bögen/mehrere Inseln bleiben außerhalb dieses ersten Skizzenmodells.
- UI: 2D-Skizzeneditor mit Punkt-/Segmentauswahl, Freizeichnen, Koordinaten, Beziehungen und treibenden Maßen. Widersprüche sichtbar, kein Commit ungültiger/offener/selbstüberschneidender Profile; Entwurf/Abbrechen getrennt vom Dokument, Übernehmen ein Undo-Schritt. Neue Skizzen erzeugen eine reale Platte; vorhandene lineare Plattenkonturen konvertierbar. Generierte Bauteile weiter über Vorlage oder explizites Auflösen.
- Erlaubt: neue Kernmodule `src/core/sketch*.ts`, `model.ts`, `evaluate.ts`, `validate.ts`, `assemblies.ts`/`references.ts` falls nötig, Tests; UI `store.ts`, `panels/Dialogs.tsx`, `Properties.tsx`, `Toolbar.tsx`, `Tree.tsx`, `App.tsx`, `commands.ts`, neue Komponenten/Hilfsmodule, `i18n*.ts`, `styles.css`, passende Tests und TASKS.md. Keine neue Laufzeitabhängigkeit. Gesamtauftrag bleibt bis zu den weiteren Restaufgaben und Referenzabnahmen offen.

### U2, C4, C6, C5, T5, U3 – geprüft und zusammengeführt (Claude, 2026-10-16)
- Gemeinsam über die Spitze `codex/U3` (`6a93830`) nach main zusammengeführt (enthält U2 → C4 → C6 → C5 → T5 → U3). Tafel vorher gesichert (Stash „coordination before U2-U3 merge (claude)“) und wiederhergestellt.
- Gelesen: Formatmigration 1→4 und Validierung (Ablehnung statt Umdeutung bei Gruppenzyklen/doppelten IDs), `evaluate` (Gruppenrahmen, Joint-Overrides/-Unterdrückung, unterdrückte Bearbeitungen), Schrank-Bohrbilder (Topf Ø35/13, 45/9,5, Montageplatte 37/32 – fachlich korrekt), Zeichnungs-Clipping nur auf temporären Körpern, Maßparser ohne eval, Referenzen/Abhängigkeitsgraph. Eigene Prüfung im U3-Worktree: `tsc` fehlerfrei, `npm test` 164/164, `vite build` erfolgreich.
- Kleinigkeiten für später: (1) Beim Öffnen einer v1-Datei erscheinen drei „Format … aktualisiert“-Hinweise und der Toast ist rot (Fehlerstil), obwohl nur migriert wurde. (2) `validateDocument` führt jetzt `evaluate` aus – bei sehr großen Dachstühlen Ladezeit beobachten.
