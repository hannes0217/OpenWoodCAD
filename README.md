# OpenWoodCAD

**Konstruktionsprogramm für Holz – vom Möbel bis zum Dachstuhl.** Läuft im Browser, offline, kostenlos und quelloffen.

OpenWoodCAD versteht Holz: Bauteile sind Bretter, Platten, Kanthölzer und Balken. Holzverbindungen
(Zapfen, Kerve, Versatz, Blatt, Schwalbenschwanz, Dübel …) sind Bauelemente, die sich bei jeder
Änderung neu anpassen.

> Status: frühe Entwicklungsversion (0.x). Was heute schon geht und was geplant ist, steht in
> [docs/ROADMAP.md](docs/ROADMAP.md). Statik, BTLx, IFC und PWA-Installation sind **noch nicht** umgesetzt.

**Heute verfügbar:** 3D-Modell mit OpenCascade, Vorlage Kommode, freies Balkenzeichnen, Holzverbindungen,
technische Zeichnungen (PDF/DXF/SVG), Stück- und Zuschnittlisten, Zuschnittoptimierung, Einkaufsliste,
Kalkulation, STEP/STL-Export.

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm test         # Tests (Vitest, inkl. Geometriekern)
npm run build    # Produktionsbuild nach dist/
```

## Lizenz

AGPL-3.0-or-later, kommerzielle Lizenz auf Anfrage – siehe [LICENSING.md](LICENSING.md).
