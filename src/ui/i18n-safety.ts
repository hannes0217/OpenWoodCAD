export const safetyDe:Record<string,string>={
 'safe.saveFailed':'Speichern/Projektwechsel fehlgeschlagen: {error}','safe.documentChanged':'Das Dokument wurde während des Ladens geändert. Bitte die Datei oder das Projekt erneut öffnen.',
 'safe.replaceConfirm':'Das aktuelle Dokument vor dem Dateiwechsel verlassen? Es wird vorher lokal gespeichert.',
 'safe.restoreFailed':'Der Wiederherstellungspunkt ist ungültig oder nicht mehr vorhanden.',
 'safe.workerFailed':'Geometriekern ausgefallen','safe.restart':'Geometriekern neu starten','safe.geometryFailed':'{n} Geometrien fehlerhaft',
 'safe.processingFailure':'Position {pos}: Geometrie/Bearbeitung fehlgeschlagen ({details}). Fertigungsausgaben sind gesperrt.',
 'safe.workerIssue':'Geometriekern: {details}','safe.checkFailed':'Kollisionsprüfung fehlgeschlagen: {details}',
 'safe.checkPending':'Kollisionsprüfung noch nicht abgeschlossen','safe.checkSkipped':'Kollisionsprüfung bei mehr als 250 Bauteilen nicht ausgeführt',
 'safe.rawWeight':'Rohgewicht (ohne Bearbeitungsabzüge)','safe.rawWeightTotal':'{kg} kg Rohgewicht',
 'safe.unpriced':'Kalkulation unvollständig: {n} übergroße Bauteile sind nicht beschaffbar und nicht eingepreist. Lieferformat oder Sonderangebot klären.',
 'safe.specialStock':'Keine passende Handelslänge – Beschaffung und Preis ungeklärt',
};
export const safetyEn:Record<string,string>={
 'safe.saveFailed':'Saving/project switch failed: {error}','safe.documentChanged':'The document changed while loading. Please open the file or project again.',
 'safe.replaceConfirm':'Leave the current document and open this file? The current document will be saved locally first.',
 'safe.restoreFailed':'The restore point is invalid or no longer available.',
 'safe.workerFailed':'Geometry kernel failed','safe.restart':'Restart geometry kernel','safe.geometryFailed':'{n} geometries failed',
 'safe.processingFailure':'Position {pos}: geometry/processing failed ({details}). Manufacturing outputs are blocked.',
 'safe.workerIssue':'Geometry kernel: {details}','safe.checkFailed':'Collision check failed: {details}',
 'safe.checkPending':'Collision check has not completed','safe.checkSkipped':'Collision check not performed for more than 250 parts',
 'safe.rawWeight':'Raw weight (before machining)','safe.rawWeightTotal':'{kg} kg raw weight',
 'safe.unpriced':'Cost estimate incomplete: {n} oversized parts cannot be sourced and have not been priced. Confirm stock dimensions or obtain a custom quote.',
 'safe.specialStock':'No matching stock length — sourcing and price unresolved',
};
