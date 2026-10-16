# AGENTS.md – Zusammenarbeit an OpenWoodCAD

Diese Datei gilt für alle KI-Agenten (Claude Code, Codex) und Menschen, die am Projekt arbeiten.

## Projekt in Kürze

OpenWoodCAD ist ein Konstruktionsprogramm für Holz (Möbel bis Dachstuhl), läuft im Browser.
Architektur: `docs/ARCHITECTURE.md`. Fahrplan: `docs/ROADMAP.md`. **Aufgabentafel: `docs/TASKS.md`.**

- `src/core` – reines TypeScript ohne DOM/React/three.js: Datenmodell (`model.ts`), Mathematik (`math.ts`),
  Verbindungen (`joints.ts`), Vorlagen (`generators/`), Listen, Zuschnitt, Kalkulation, Prüfungen, Statik (`statics/`), Exporte (`export/`)
- `src/geom` – OpenCascade (replicad) im Web Worker; in Tests direkt in Node (`test/kernel-node.ts`)
- `src/drawing` – Zeichnungsblätter (SVG), PDF, DXF
- `src/ui` – React-Oberfläche, three.js-Ansicht

## Befehle

```bash
npm install
npm test            # Vitest – muss grün sein
npx tsc --noEmit    # Typprüfung – muss fehlerfrei sein
npm run dev         # Entwicklungsserver (Port 5173)
```

## Regeln

1. **Aufgabe beanspruchen:** In `docs/TASKS.md` bei der Aufgabe `Owner` auf deinen Namen und `Status` auf `in Arbeit` setzen,
   bevor du anfängst. Nur Aufgaben mit Owner `frei` oder deinem Namen bearbeiten.
2. **Eigener Zweig + Arbeitskopie:** Codex arbeitet in einem git worktree auf Zweig `codex/<aufgaben-id>`
   (z. B. `git worktree add ../OpenWoodCAD-codex -b codex/T1`). Nie direkt auf `main` committen –
   Claude führt zusammen, nachdem Tests und Typprüfung grün sind.
3. **Dateigrenzen:** Nur die in der Aufgabe genannten Dateien anlegen/ändern. Gemeinsam genutzte Dateien
   (`src/core/model.ts`, `src/ui/i18n*.ts`, `package.json`) nur ändern, wenn die Aufgabe es ausdrücklich erlaubt,
   und die Änderung im Abschnitt „Übergabe“ der Aufgabe notieren.
4. **Tests:** Jede neue Funktion im Kern bekommt Vitest-Tests unter `test/`. Fachliche Rechenwerte (Statik) mit
   nachvollziehbaren Handrechnungen oder Literaturbeispielen prüfen und die Quelle im Test kommentieren.
5. **Code-Stil:** TypeScript strict, keine neuen Laufzeit-Abhängigkeiten ohne Rückfrage (Eintrag in TASKS.md unter „Fragen“).
   Bezeichner und Kommentare englisch, Oberflächentexte deutsch + englisch über `src/ui/i18n*.ts`.
   Einheiten: mm, N, N/mm (= kN/m), Nmm; Winkel in Grad an Schnittstellen.
6. **Ehrlichkeit:** Nichts als fertig markieren, was nicht getestet ist. Grenzen und Vereinfachungen im Code
   und in der Übergabe benennen (z. B. „Wind nur vereinfachtes Verfahren“).
7. **Fertig:** `Status` auf `zur Prüfung` setzen, Zweig nennen, Übergabe-Notiz schreiben (was, wo, Grenzen, offene Punkte).
   Claude prüft, führt zusammen und setzt `erledigt`.

## Lizenz

AGPL-3.0-or-later mit kommerzieller Zweitlizenz (`LICENSING.md`). Keinen Code aus Quellen mit unverträglicher
Lizenz übernehmen. Normtexte (DIN/EN) nicht kopieren – Formeln und Kennwerte selbst umsetzen.
