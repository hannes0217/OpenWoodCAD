# OpenWoodCAD – Architektur

OpenWoodCAD ist ein Konstruktionsprogramm, das **Holz versteht**: Man arbeitet mit
Brettern, Platten, Kanthölzern und Balken, an denen Holzverbindungen als
Bauelemente sitzen. Listen, Zeichnungen, Zuschnitt, Statik und Maschinendaten
entstehen aus demselben Modell.

## Grundsätze

1. **Ein Modell, viele Ausgaben.** Das Dokument (`.owc`, JSON) ist die einzige Quelle.
   3D-Ansicht, Zeichnungen, Listen, Statik, BTLx und IFC werden daraus abgeleitet.
2. **Parametrisch.** Assistenten (Generatoren) erzeugen Bauteile und Verbindungen aus
   Parametern. Verbindungen werden bei jeder Änderung neu berechnet: Wird ein Balken
   verschoben, passen sich Zapfen, Kerven und Schnitte an.
3. **Bearbeitungen sind Holzbau-Begriffe.** Jede Bearbeitung trägt neben ihrer
   Geometrie eine fachliche Bedeutung (Zapfen, Kerve, Versatz, Blatt, Bohrung …).
   Daraus entstehen Abbundlisten und BTLx.
4. **Rechenkern ohne Bildschirm.** `src/core` hat keine Abhängigkeit zu DOM, React oder
   three.js und ist vollständig mit Vitest getestet.
5. **Läuft im Browser.** Kein Server, keine Konten. (Offline-Installation als PWA ist geplant.)

## Schichten

```
src/core      Datenmodell, Mathematik, Generatoren, Verbindungen, Listen, Zuschnitt,
              Kalkulation, Statik, Exporte (BTLx, IFC, DXF, CSV)   – reines TypeScript
src/geom      Volumenmodell mit OpenCascade (WebAssembly, im Web Worker):
              Bauteil-Körper, verdeckte Kanten für Zeichnungen, STEP/STL
src/drawing   Zeichnungsblätter (SVG): Ansichten, Bemaßung, Schriftfeld, Tabellen,
              PDF über jsPDF/svg2pdf
src/ui        React-Oberfläche, three.js-Ansicht
```

## Koordinaten und Einheiten

- Millimeter, Winkel in Grad (Oberfläche) bzw. Bogenmaß (intern).
- Welt: **Z nach oben**, X nach rechts, Y nach hinten. Vorderansicht blickt in +Y.
- Jedes Bauteil hat ein lokales Koordinatensystem (`Frame`: Ursprung + drei
  Einheitsvektoren). Grundkörper ist der Quader `[0,L]×[0,B]×[0,H]`:
  X = Länge (Faserrichtung), Y = Breite, Z = Höhe bzw. Plattenstärke.
  Das entspricht der Bauteil-Konvention von BTL/BTLx.

## Datenmodell (Kurzfassung, Details in `src/core/model.ts`)

- `Element`: `beam` (Kantholz, Balken, Latte, Brett) oder `panel` (Platte, optional mit
  Umriss-Polygon). Felder: Frame, L/B/H, Material, Name, Gruppe, eigene Bearbeitungen.
- `Processing`: geometrische Grundform + fachliche Bedeutung.
  Grundformen: `cut` (Halbraum), `polytope` (konvexer Bereich aus Ebenen),
  `drill` (Zylinder), `cutExcept` (Halbraum ohne einen Bereich, z. B. Zapfen).
  Alle Bearbeitungen werden abgezogen. Jeder Holzbau-Anschluss lässt sich damit exakt beschreiben.
- `Joint`: Verbindung zwischen Bauteilen (Kappen, Kerve, Blatt, Zapfen, Versatz,
  Gehrung, Dübel, Schrauben, Verschneiden …). Erzeugt bei der Auswertung Bearbeitungen.
- `GeneratorInstance`: Assistent mit Parametern (Kommode, Satteldach, Wand …).
  Seine Bauteile werden bei Parameteränderung neu erzeugt. „Auflösen“ macht sie frei editierbar.
- `Project`: Kopf (Name, Kunde, Ort für Schnee/Wind), Kataloge, Statiksysteme, Einstellungen.

## Auswertung

`evaluate(doc)` → Generatoren ausführen → Verbindungen anwenden → Positionsnummern
vergeben → Prüfungen/Warnungen. Ergebnis ist ein reines Datenobjekt. Der Geometrie-Worker
baut daraus Körper. Er hält einen Cache je Bauteil-Hash, damit nur geänderte Teile neu
gerechnet werden. Bis der Worker fertig ist, zeigt die 3D-Ansicht Quader.

## Lizenz

AGPL-3.0-or-later mit kommerzieller Zweitlizenz (siehe `LICENSING.md`).
Beiträge Dritter nur mit unterschriebener CLA (siehe `CLA.md`).
