# Lizenzierung / Licensing

OpenWoodCAD ist doppelt lizenziert (dual licensed):

1. **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)** – siehe `LICENSE`.
   Freie Nutzung, Änderung und Weitergabe, auch kommerziell, solange abgeleitete Werke –
   auch wenn sie nur über ein Netzwerk angeboten werden (SaaS) – ebenfalls unter der AGPL
   mit vollständigem Quelltext veröffentlicht werden.

2. **Kommerzielle Lizenz** – für Unternehmen, die OpenWoodCAD oder Teile davon in
   geschlossene Produkte oder Dienste einbauen wollen, ohne den eigenen Quelltext offenzulegen.
   Anfragen an die Rechteinhaber (Kontakt folgt mit der Veröffentlichung).

Beiträge Dritter werden nur angenommen, wenn die Beitragenden der
Contributor License Agreement (`CLA.md`) zustimmen. Nur so bleibt die kommerzielle
Zweitlizenz möglich.

## Drittkomponenten

| Komponente | Lizenz |
|---|---|
| OpenCascade Technology (über replicad-opencascadejs) | LGPL-2.1 mit OCCT-Ausnahme |
| replicad | MIT |
| three.js | MIT |
| React | MIT |
| jsPDF, svg2pdf.js | MIT |

Die BTLx-Spezifikation stammt von design2machine und ist **nicht** Teil dieses Repositorys.
Das Schema für die Prüfung wird lokal nach `vendor/` geladen (`npm run fetch-btlx`).
