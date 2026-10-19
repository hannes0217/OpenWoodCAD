import { drawingDe, drawingEn } from './i18n-drawing';
import { dragDe,dragEn } from './i18n-drag';
import { assemblyDe, assemblyEn } from './i18n-assembly';
import { jointEditDe, jointEditEn } from './i18n-joint-edit';
import type { Msg } from '../core/model';
import { genDe, genEn } from './i18n-gen';
import { staticsDe, staticsEn } from './i18n-statics';
import { cadDe, cadEn } from './i18n-cad';
import { safetyDe, safetyEn } from './i18n-safety';
import { precisionDe, precisionEn } from './i18n-precision';
import { contextDe, contextEn } from './i18n-context';
import { getState, useApp, type Lang } from './store';

type Dict = Record<string, string>;

const de: Dict = {
  'help.preliminary': 'Statische Berechnungen dienen der Vorbemessung und ersetzen keinen prüffähigen Standsicherheitsnachweis.',
  'help.exitTool': 'Auswahl / Werkzeug beenden', 'help.ctrl': 'Strg', 'help.delete': 'Entf',
  'app.name': 'OpenWoodCAD',
  'app.tagline': 'Konstruktion für Holz – vom Möbel bis zum Dachstuhl',
  // workspaces
  'ws.model': 'Modell', 'ws.drawings': 'Zeichnungen', 'ws.lists': 'Listen', 'ws.nesting': 'Zuschnitt', 'ws.shopping': 'Einkauf & Kalkulation', 'ws.statics': 'Statik', 'ws.project': 'Projekt',
  // menu
  'menu.file': 'Datei', 'menu.new': 'Neu', 'menu.open': 'Datei öffnen …', 'menu.save': 'Als Datei speichern (.owc)', 'menu.projects': 'Projekte & Wiederherstellung …', 'menu.export': 'Exportieren', 'menu.edit': 'Bearbeiten', 'menu.insert': 'Einfügen', 'menu.view': 'Ansicht', 'menu.help': 'Hilfe',
  'menu.undo': 'Rückgängig', 'menu.redo': 'Wiederholen', 'menu.delete': 'Löschen', 'menu.duplicate': 'Duplizieren', 'menu.explode': 'Assistent auflösen', 'menu.selectAll': 'Alles auswählen',
  'menu.assistant': 'Assistent …', 'menu.beam': 'Balken zeichnen', 'menu.panel': 'Platte zeichnen', 'menu.joint': 'Verbindung …', 'menu.measure': 'Messen',
  'menu.exportStep': 'STEP (3D-CAD)', 'menu.exportStl': 'STL (3D-Druck)', 'menu.exportBtlx': 'BTLx (Abbundmaschine)', 'menu.exportIfc': 'IFC (BIM)', 'menu.exportCsv': 'Stückliste CSV', 'menu.exportPdf': 'Zeichnungen PDF', 'menu.exportDxf': 'Zeichnungen DXF',
  'tool.rect': 'Platte (Rechteck)', 'tool.circle': 'Runde Platte', 'tool.poly': 'Formteil (Umriss)', 'tool.cutRect': 'Ausschnitt rechteckig', 'tool.cutCircle': 'Ausschnitt rund / Bohrung',
  'menu.about': 'Über OpenWoodCAD', 'menu.shortcuts': 'Tastenkürzel', 'menu.language': 'Sprache',
  // view
  'view.fit': 'Alles zeigen', 'view.iso': 'Iso', 'view.front': 'Vorne', 'view.side': 'Seite', 'view.top': 'Oben', 'view.labels': 'Positionsnummern', 'view.xray': 'Röntgen', 'view.section': 'Schnitt',
  'view.colorBy': 'Farbe nach', 'view.color.material': 'Material', 'view.color.role': 'Bauteilart', 'view.color.pos': 'Position', 'view.drawers': 'Schubkästen öffnen',
  // tree / properties
  'tree.title': 'Projekt', 'tree.generators': 'Assistenten', 'tree.elements': 'Bauteile', 'tree.joints': 'Verbindungen', 'tree.empty': 'Noch leer – füge über „Einfügen“ einen Assistenten oder Bauteile hinzu.',
  'props.title': 'Eigenschaften', 'props.none': 'Nichts ausgewählt. Klicke ein Bauteil in der 3D-Ansicht oder im Projektbaum an.', 'props.multi': '{n} Bauteile ausgewählt',
  'props.name': 'Name', 'props.material': 'Material', 'props.length': 'Länge', 'props.width': 'Breite', 'props.height': 'Höhe/Stärke', 'props.position': 'Lage (Ursprung)', 'props.rotation': 'Drehung', 'props.pos': 'Position', 'props.role': 'Bauteilart',
  'props.processings': 'Bearbeitungen', 'props.joints': 'Verbindungen', 'props.generator': 'Gehört zu Assistent', 'props.editGenerator': 'Assistent bearbeiten', 'props.placement': 'Platzierung', 'props.weight': 'Gewicht', 'props.volume': 'Volumen',
  'props.edges': 'Kanten', 'props.locked': 'Teil eines Assistenten – Maße über den Assistenten ändern oder Assistent auflösen.',
  // generic
  'common.ok': 'OK', 'common.cancel': 'Abbrechen', 'common.close': 'Schließen', 'common.insert': 'Einfügen', 'common.delete': 'Löschen', 'common.apply': 'Übernehmen', 'common.yes': 'Ja', 'common.no': 'Nein',
  'common.qty': 'Anzahl', 'common.total': 'Summe', 'common.price': 'Preis', 'common.unitPrice': 'Einzelpreis', 'common.pos': 'Pos.', 'common.name': 'Bezeichnung', 'common.material': 'Material', 'common.length': 'Länge', 'common.width': 'Breite', 'common.thickness': 'Stärke', 'common.section': 'Querschnitt',
  'common.warnings': 'Hinweise', 'common.notes': 'Hinweise zur Ausführung', 'common.loading': 'Wird berechnet …', 'common.kernelLoading': 'Geometriekern wird geladen …', 'common.kernelReady': 'Geometriekern bereit',
  'common.mm': 'mm', 'common.none': '—', 'common.search': 'Suchen …', 'common.edit': 'Bearbeiten', 'common.export': 'Exportieren', 'common.print': 'Drucken',
  // insert dialog
  'insert.title': 'Assistent einfügen', 'insert.cat.furniture': 'Möbel', 'insert.cat.carpentry': 'Zimmerei & Holzbau', 'insert.cat.outdoor': 'Garten & Außen',
  // generators
  'gen.kommode': 'Kommode', 'gen.kommode.desc': 'Korpus mit Schubkästen, Sockel, Deckplatte mit Überstand',
  // param groups
  'group.dimensions': 'Maße', 'group.construction': 'Konstruktion', 'group.drawers': 'Schubkästen', 'group.materials': 'Materialien', 'group.roof': 'Dach', 'group.members': 'Querschnitte', 'group.layout': 'Aufteilung', 'group.openings': 'Öffnungen', 'group.statics': 'Statik', 'group.doors': 'Türen', 'group.shelves': 'Fachböden',
  // params
  'param.width': 'Breite', 'param.height': 'Höhe', 'param.depth': 'Tiefe', 'param.overhang': 'Überstand Deckplatte', 'param.plinth': 'Sockelhöhe', 'param.plinthSetback': 'Sockel zurückgesetzt', 'param.joinery': 'Korpusverbindung',
  'param.drawers': 'Anzahl Schubkästen', 'param.layout': 'Höhenaufteilung', 'param.gap': 'Fuge', 'param.handle': 'Griff', 'param.handlePos': 'Griffposition',
  'param.bodyMaterial': 'Korpus', 'param.topMaterial': 'Deckplatte', 'param.frontMaterial': 'Fronten', 'param.backMaterial': 'Rückwand', 'param.drawerMaterial': 'Schubkastenzargen', 'param.drawerBottomMaterial': 'Schubkastenboden',
  'opt.dowel': 'Holzdübel', 'opt.confirmat': 'Konfirmatschrauben', 'opt.screw': 'Schrauben', 'opt.equal': 'gleich hoch', 'opt.graduated': 'nach unten höher', 'opt.none': 'ohne', 'opt.knob': 'Knopf',
  'opt.handle_96': 'Griff 96 mm', 'opt.handle_128': 'Griff 128 mm', 'opt.handle_160': 'Griff 160 mm', 'opt.center': 'Mitte', 'opt.top': 'oben',
  // roles
  'role.side': 'Seite', 'role.top': 'Deckplatte', 'role.bottom': 'Boden', 'role.back': 'Rückwand', 'role.plinth': 'Sockel', 'role.front': 'Front', 'role.drawerSide': 'Schubkastenseite', 'role.drawerFront': 'Schubkastenvorderstück', 'role.drawerBack': 'Schubkastenhinterstück', 'role.drawerBottom': 'Schubkastenboden',
  'role.rafter': 'Sparren', 'role.purlin': 'Pfette', 'role.ridgePurlin': 'Firstpfette', 'role.wallPlate': 'Fußpfette', 'role.post': 'Stiel/Pfosten', 'role.collarTie': 'Kehlbalken', 'role.tieBeam': 'Zangen/Bundbalken', 'role.strut': 'Strebe', 'role.kneeBrace': 'Kopfband', 'role.beam': 'Balken', 'role.joist': 'Deckenbalken', 'role.stud': 'Ständer', 'role.plate': 'Schwelle/Rähm', 'role.header': 'Sturz', 'role.nogging': 'Riegel', 'role.batten': 'Latte', 'role.board': 'Brett/Diele', 'role.hipRafter': 'Gratsparren', 'role.jackRafter': 'Schifter', 'role.valleyRafter': 'Kehlsparren', 'role.sill': 'Schwelle', 'role.leg': 'Bein', 'role.apron': 'Zarge', 'role.shelf': 'Fachboden', 'role.door': 'Tür', 'role.divider': 'Mittelwand', 'role.trimmer': 'Wechsel', 'role.girder': 'Unterzug', 'role.brace': 'Strebe/Band', 'role.column': 'Stütze',
  // joints
  'joint.trim': 'Kappen / Anschluss', 'joint.miter': 'Gehrung', 'joint.house': 'Verschneiden / Einlassung', 'joint.birdsMouth': 'Kerve (Klaue)', 'joint.lap': 'Blatt (Überblattung)', 'joint.tenon': 'Zapfen', 'joint.dovetail': 'Schwalbenschwanz', 'joint.stepJoint': 'Stirnversatz', 'joint.dowel': 'Dübel', 'joint.confirmat': 'Konfirmat', 'joint.screw': 'Schrauben',
  'jparam.face': 'Anschlussfläche', 'jparam.gap': 'Fuge', 'jparam.clearance': 'Spiel', 'jparam.kind': 'Art', 'jparam.ratio': 'Blatttiefe (Anteil)', 'jparam.aOnTop': 'A liegt oben', 'jparam.thickness': 'Zapfendicke (0 = auto)', 'jparam.length': 'Länge/Tiefe', 'jparam.shoulder': 'Brüstung', 'jparam.peg': 'Holznagel', 'jparam.pegDia': 'Nageldurchmesser', 'jparam.width': 'Breite (0 = auto)', 'jparam.angle': 'Winkel', 'jparam.bottom': 'Abstand unten', 'jparam.depth': 'Tiefe (0 = auto)', 'jparam.spacing': 'max. Abstand', 'jparam.size': 'Schraube',
  'opt.near': 'nahe Fläche', 'opt.far': 'ferne Fläche', 'opt.house': 'Einlassung', 'opt.notch': 'Ausklinkung', 'opt.birdsMouth': 'Kerve',
  // processings
  'proc.endCut': 'Kappschnitt', 'proc.jackRafterCut': 'Schifterschnitt', 'proc.doubleCut': 'Doppelschnitt', 'proc.ridgeValleyCut': 'Grat-/Kehlschnitt', 'proc.longitudinalCut': 'Längsschnitt', 'proc.birdsMouth': 'Kerve', 'proc.lap': 'Blatt', 'proc.notch': 'Ausklinkung', 'proc.house': 'Einlassung', 'proc.slot': 'Schlitz', 'proc.mortise': 'Zapfenloch', 'proc.tenon': 'Zapfen', 'proc.dovetailTenon': 'Schwalbenschwanzzapfen', 'proc.dovetailMortise': 'Schwalbenschwanzloch', 'proc.stepJoint': 'Versatz (Strebe)', 'proc.stepJointNotch': 'Versatz (Ausnehmung)', 'proc.drilling': 'Bohrung', 'proc.groove': 'Nut', 'proc.rabbet': 'Falz', 'proc.pocket': 'Tasche', 'proc.chamfer': 'Fase', 'proc.miter': 'Gehrung', 'proc.marking': 'Markierung',
  // warnings / notes
  'warn.dimensionsTooSmall': 'Die Maße sind zu klein für diese Konstruktion.', 'warn.frontTooLow': 'Mindestens eine Front ist niedriger als 60 mm.', 'warn.noSlide': 'Für die Innentiefe von {depth} mm gibt es keine Standard-Auszugsschiene (min. 260 mm).', 'warn.drawerTooLow': 'Schubkasten {n} ist zu niedrig und wurde weggelassen.',
  'warn.jointNoContact': 'Verbindung {a} ↔ {b}: Die Bauteile berühren sich nicht.', 'warn.jointParallel': 'Verbindung {a} ↔ {b}: Bauteile sind parallel.', 'warn.jointMissing': 'Verbindung {id} verweist auf ein fehlendes Bauteil.', 'warn.tenonAngle': '{a}: Zapfen bei stark schrägem Anschluss – prüfen.', 'warn.tenonTooLong': 'Zapfen von {a} ist länger als {b} tief ist.',
  'warn.stepJointAngle': '{a}: Versatz nur bei schrägem Anschluss möglich.', 'warn.stepJointDepth': '{a}: Versatztiefe größer als zulässig (max. {max} mm).', 'warn.unknownGenerator': 'Unbekannter Assistent: {type}', 'warn.generatorFailed': 'Assistent „{name}“ fehlgeschlagen: {error}', 'warn.geometryFailed': 'Bei {n} Bauteilen konnte eine Bearbeitung nicht berechnet werden.',
  'note.kommode.order': 'Montage: Sockel und Boden zwischen die Seiten, dann Deckplatte aufdübeln, Rückwand anschrauben (Korpus dabei rechtwinklig ausrichten), danach Schienen und Schubkästen.',
  'note.kommode.slides': 'Kugelführungen mit {clearance} mm Einbauluft je Seite, Länge {length} mm.',
  'mount.drawerBottom': 'Schubkasten {n}: Unterkante über Korpusboden',
  // file
  'file.newConfirm': 'Ungespeicherte Änderungen verwerfen?', 'file.saved': 'Gespeichert als {name}', 'file.opened': '{name} geöffnet', 'file.openError': 'Datei konnte nicht geöffnet werden: {error}',
  // status
  'status.parts': '{n} Bauteile', 'status.positions': '{n} Positionen', 'status.weight': '{kg} kg',
};

const en: Dict = {
  'help.preliminary': 'Structural calculations are preliminary sizing checks and do not replace a verifiable structural design.',
  'help.exitTool': 'Clear selection / finish tool', 'help.ctrl': 'Ctrl', 'help.delete': 'Del',
  'app.name': 'OpenWoodCAD',
  'app.tagline': 'Woodworking design – from furniture to roof structures',
  'ws.model': 'Model', 'ws.drawings': 'Drawings', 'ws.lists': 'Lists', 'ws.nesting': 'Cutting', 'ws.shopping': 'Shopping & costing', 'ws.statics': 'Structure', 'ws.project': 'Project',
  'menu.file': 'File', 'menu.new': 'New', 'menu.open': 'Open file …', 'menu.save': 'Save as file (.owc)', 'menu.projects': 'Projects & restore …', 'menu.export': 'Export', 'menu.edit': 'Edit', 'menu.insert': 'Insert', 'menu.view': 'View', 'menu.help': 'Help',
  'menu.undo': 'Undo', 'menu.redo': 'Redo', 'menu.delete': 'Delete', 'menu.duplicate': 'Duplicate', 'menu.explode': 'Explode assistant', 'menu.selectAll': 'Select all',
  'menu.assistant': 'Assistant …', 'menu.beam': 'Draw beam', 'menu.panel': 'Draw panel', 'menu.joint': 'Joint …', 'menu.measure': 'Measure',
  'menu.exportStep': 'STEP (3D CAD)', 'menu.exportStl': 'STL (3D print)', 'menu.exportBtlx': 'BTLx (joinery machine)', 'menu.exportIfc': 'IFC (BIM)', 'menu.exportCsv': 'Parts list CSV', 'menu.exportPdf': 'Drawings PDF', 'menu.exportDxf': 'Drawings DXF',
  'tool.rect': 'Panel (rectangle)', 'tool.circle': 'Round panel', 'tool.poly': 'Shaped part (outline)', 'tool.cutRect': 'Rectangular cut-out', 'tool.cutCircle': 'Round cut-out / hole',
  'menu.about': 'About OpenWoodCAD', 'menu.shortcuts': 'Keyboard shortcuts', 'menu.language': 'Language',
  'view.fit': 'Zoom all', 'view.iso': 'Iso', 'view.front': 'Front', 'view.side': 'Side', 'view.top': 'Top', 'view.labels': 'Position numbers', 'view.xray': 'X-ray', 'view.section': 'Section',
  'view.colorBy': 'Colour by', 'view.color.material': 'Material', 'view.color.role': 'Part type', 'view.color.pos': 'Position', 'view.drawers': 'Open drawers',
  'tree.title': 'Project', 'tree.generators': 'Assistants', 'tree.elements': 'Parts', 'tree.joints': 'Joints', 'tree.empty': 'Empty – add an assistant or parts via “Insert”.',
  'props.title': 'Properties', 'props.none': 'Nothing selected. Click a part in the 3D view or the project tree.', 'props.multi': '{n} parts selected',
  'props.name': 'Name', 'props.material': 'Material', 'props.length': 'Length', 'props.width': 'Width', 'props.height': 'Height/thickness', 'props.position': 'Placement (origin)', 'props.rotation': 'Rotation', 'props.pos': 'Position', 'props.role': 'Part type',
  'props.processings': 'Processings', 'props.joints': 'Joints', 'props.generator': 'Belongs to assistant', 'props.editGenerator': 'Edit assistant', 'props.placement': 'Placement', 'props.weight': 'Weight', 'props.volume': 'Volume',
  'props.edges': 'Edges', 'props.locked': 'Part of an assistant – change dimensions in the assistant or explode it.',
  'common.ok': 'OK', 'common.cancel': 'Cancel', 'common.close': 'Close', 'common.insert': 'Insert', 'common.delete': 'Delete', 'common.apply': 'Apply', 'common.yes': 'Yes', 'common.no': 'No',
  'common.qty': 'Qty', 'common.total': 'Total', 'common.price': 'Price', 'common.unitPrice': 'Unit price', 'common.pos': 'Pos.', 'common.name': 'Name', 'common.material': 'Material', 'common.length': 'Length', 'common.width': 'Width', 'common.thickness': 'Thickness', 'common.section': 'Section',
  'common.warnings': 'Warnings', 'common.notes': 'Notes', 'common.loading': 'Computing …', 'common.kernelLoading': 'Loading geometry kernel …', 'common.kernelReady': 'Geometry kernel ready',
  'common.mm': 'mm', 'common.none': '—', 'common.search': 'Search …', 'common.edit': 'Edit', 'common.export': 'Export', 'common.print': 'Print',
  'insert.title': 'Insert assistant', 'insert.cat.furniture': 'Furniture', 'insert.cat.carpentry': 'Carpentry & timber framing', 'insert.cat.outdoor': 'Garden & outdoor',
  'gen.kommode': 'Chest of drawers', 'gen.kommode.desc': 'Carcass with drawers, plinth and overhanging top',
  'group.dimensions': 'Dimensions', 'group.construction': 'Construction', 'group.drawers': 'Drawers', 'group.materials': 'Materials', 'group.roof': 'Roof', 'group.members': 'Sections', 'group.layout': 'Layout', 'group.openings': 'Openings', 'group.statics': 'Structure', 'group.doors': 'Doors', 'group.shelves': 'Shelves',
  'param.width': 'Width', 'param.height': 'Height', 'param.depth': 'Depth', 'param.overhang': 'Top overhang', 'param.plinth': 'Plinth height', 'param.plinthSetback': 'Plinth setback', 'param.joinery': 'Carcass joinery',
  'param.drawers': 'Number of drawers', 'param.layout': 'Height distribution', 'param.gap': 'Gap', 'param.handle': 'Handle', 'param.handlePos': 'Handle position',
  'param.bodyMaterial': 'Carcass', 'param.topMaterial': 'Top', 'param.frontMaterial': 'Fronts', 'param.backMaterial': 'Back panel', 'param.drawerMaterial': 'Drawer sides', 'param.drawerBottomMaterial': 'Drawer bottom',
  'opt.dowel': 'Dowels', 'opt.confirmat': 'Confirmat screws', 'opt.screw': 'Screws', 'opt.equal': 'equal', 'opt.graduated': 'graduated', 'opt.none': 'none', 'opt.knob': 'Knob',
  'opt.handle_96': 'Handle 96 mm', 'opt.handle_128': 'Handle 128 mm', 'opt.handle_160': 'Handle 160 mm', 'opt.center': 'centre', 'opt.top': 'top',
  'role.side': 'Side', 'role.top': 'Top', 'role.bottom': 'Bottom', 'role.back': 'Back panel', 'role.plinth': 'Plinth', 'role.front': 'Front', 'role.drawerSide': 'Drawer side', 'role.drawerFront': 'Drawer front', 'role.drawerBack': 'Drawer back', 'role.drawerBottom': 'Drawer bottom',
  'role.rafter': 'Rafter', 'role.purlin': 'Purlin', 'role.ridgePurlin': 'Ridge purlin', 'role.wallPlate': 'Wall plate', 'role.post': 'Post', 'role.collarTie': 'Collar tie', 'role.tieBeam': 'Tie beam', 'role.strut': 'Strut', 'role.kneeBrace': 'Knee brace', 'role.beam': 'Beam', 'role.joist': 'Joist', 'role.stud': 'Stud', 'role.plate': 'Plate', 'role.header': 'Header', 'role.nogging': 'Nogging', 'role.batten': 'Batten', 'role.board': 'Board', 'role.hipRafter': 'Hip rafter', 'role.jackRafter': 'Jack rafter', 'role.valleyRafter': 'Valley rafter', 'role.sill': 'Sill', 'role.leg': 'Leg', 'role.apron': 'Apron', 'role.shelf': 'Shelf', 'role.door': 'Door', 'role.divider': 'Divider', 'role.trimmer': 'Trimmer', 'role.girder': 'Girder', 'role.brace': 'Brace', 'role.column': 'Column',
  'joint.trim': 'Trim / butt', 'joint.miter': 'Miter', 'joint.house': 'Housing', 'joint.birdsMouth': 'Birdsmouth', 'joint.lap': 'Lap joint', 'joint.tenon': 'Mortise & tenon', 'joint.dovetail': 'Dovetail', 'joint.stepJoint': 'Step joint', 'joint.dowel': 'Dowels', 'joint.confirmat': 'Confirmat', 'joint.screw': 'Screws',
  'jparam.face': 'Contact face', 'jparam.gap': 'Gap', 'jparam.clearance': 'Clearance', 'jparam.kind': 'Kind', 'jparam.ratio': 'Lap depth (ratio)', 'jparam.aOnTop': 'A on top', 'jparam.thickness': 'Tenon thickness (0 = auto)', 'jparam.length': 'Length/depth', 'jparam.shoulder': 'Shoulder', 'jparam.peg': 'Wooden peg', 'jparam.pegDia': 'Peg diameter', 'jparam.width': 'Width (0 = auto)', 'jparam.angle': 'Angle', 'jparam.bottom': 'Bottom offset', 'jparam.depth': 'Depth (0 = auto)', 'jparam.spacing': 'Max. spacing', 'jparam.size': 'Screw',
  'opt.near': 'near face', 'opt.far': 'far face', 'opt.house': 'Housing', 'opt.notch': 'Notch', 'opt.birdsMouth': 'Birdsmouth',
  'proc.endCut': 'End cut', 'proc.jackRafterCut': 'Jack rafter cut', 'proc.doubleCut': 'Double cut', 'proc.ridgeValleyCut': 'Ridge/valley cut', 'proc.longitudinalCut': 'Longitudinal cut', 'proc.birdsMouth': 'Birdsmouth', 'proc.lap': 'Lap', 'proc.notch': 'Notch', 'proc.house': 'Housing', 'proc.slot': 'Slot', 'proc.mortise': 'Mortise', 'proc.tenon': 'Tenon', 'proc.dovetailTenon': 'Dovetail tenon', 'proc.dovetailMortise': 'Dovetail mortise', 'proc.stepJoint': 'Step joint (strut)', 'proc.stepJointNotch': 'Step joint notch', 'proc.drilling': 'Drilling', 'proc.groove': 'Groove', 'proc.rabbet': 'Rabbet', 'proc.pocket': 'Pocket', 'proc.chamfer': 'Chamfer', 'proc.miter': 'Miter', 'proc.marking': 'Marking',
  'warn.dimensionsTooSmall': 'Dimensions are too small for this construction.', 'warn.frontTooLow': 'At least one front is lower than 60 mm.', 'warn.noSlide': 'No standard drawer slide fits the inner depth of {depth} mm (min. 260 mm).', 'warn.drawerTooLow': 'Drawer {n} is too low and was omitted.',
  'warn.jointNoContact': 'Joint {a} ↔ {b}: parts do not touch.', 'warn.jointParallel': 'Joint {a} ↔ {b}: parts are parallel.', 'warn.jointMissing': 'Joint {id} refers to a missing part.', 'warn.tenonAngle': '{a}: tenon on a strongly inclined connection – check.', 'warn.tenonTooLong': 'Tenon of {a} is longer than {b} is deep.',
  'warn.stepJointAngle': '{a}: a step joint needs an inclined connection.', 'warn.stepJointDepth': '{a}: step depth exceeds the limit (max. {max} mm).', 'warn.unknownGenerator': 'Unknown assistant: {type}', 'warn.generatorFailed': 'Assistant “{name}” failed: {error}', 'warn.geometryFailed': 'A processing could not be computed on {n} parts.',
  'note.kommode.order': 'Assembly: plinth and bottom between the sides, dowel the top on, screw the back panel (square the carcass), then slides and drawers.',
  'note.kommode.slides': 'Ball-bearing slides with {clearance} mm clearance per side, length {length} mm.',
  'mount.drawerBottom': 'Drawer {n}: bottom edge above carcass bottom',
  'file.newConfirm': 'Discard unsaved changes?', 'file.saved': 'Saved as {name}', 'file.opened': '{name} opened', 'file.openError': 'Could not open file: {error}',
  'status.parts': '{n} parts', 'status.positions': '{n} positions', 'status.weight': '{kg} kg',
};

Object.assign(de, genDe);
Object.assign(en, genEn);
Object.assign(de, staticsDe);
Object.assign(en, staticsEn);
Object.assign(de, cadDe);
Object.assign(en, cadEn);
Object.assign(de, safetyDe);Object.assign(en,safetyEn);
Object.assign(de,drawingDe);Object.assign(en,drawingEn);
Object.assign(de,jointEditDe);Object.assign(en,jointEditEn);
Object.assign(de,precisionDe);Object.assign(en,precisionEn);
Object.assign(de,contextDe);Object.assign(en,contextEn);

const dicts: Record<Lang, Dict> = { de, en };
Object.assign(de,dragDe);Object.assign(en,dragEn);
Object.assign(de,assemblyDe);Object.assign(en,assemblyEn);

/** Independent dictionary snapshot for coverage checks, without German fallback. */
export function translationEntries(lang: Lang): Readonly<Dict> {
  return { ...dicts[lang] };
}

/** Register additional translations (used by modules that add features). */
export function addTranslations(lang: Lang, entries: Dict): void {
  Object.assign(dicts[lang], entries);
}

export function translate(lang: Lang, key: string, args?: Record<string, string | number>): string {
  let s = dicts[lang][key] ?? dicts.de[key] ?? key;
  if (args) for (const [k, v] of Object.entries(args)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function t(key: string, args?: Record<string, string | number>): string {
  return translate(getState().lang, key, args);
}

export function tm(m: Msg): string {
  return t(m.key, m.args);
}

export function has(key: string): boolean {
  return key in dicts[getState().lang] || key in dicts.de;
}

/** Re-render on language change. */
export function useT(): typeof t {
  useApp((s) => s.lang);
  return t;
}

export function fmt(v: number, digits = 0): string {
  return v.toLocaleString(getState().lang === 'de' ? 'de-DE' : 'en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function money(v: number): string {
  return v.toLocaleString(getState().lang === 'de' ? 'de-DE' : 'en-GB', { style: 'currency', currency: getState().doc.settings.currency || 'EUR' });
}
