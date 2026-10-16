export const drawingDe:Record<string,string>={
 'drawing.dimension':'Maß {n}', 'drawing.orientation':'Maßrichtung',
 'drawing.rebuild':'Neu erzeugen',
 'drawing.custom':'Eigene Ansichten und Maße','drawing.addView':'Ansichtsblatt hinzufügen','drawing.deleteView':'Ansichtsblatt löschen','drawing.title':'Blatttitel','drawing.view':'Blickrichtung','drawing.front':'Vorne','drawing.side':'Von links','drawing.top':'Oben',
 'drawing.section':'Volumenschnitt','drawing.sectionOffset':'Schnittlage {axis}','drawing.sectionNote':'Volumenschnitt {axis} = {offset} mm – ohne Materialschraffur','drawing.detail':'Detailfenster / Ausschnitt','drawing.centerU':'Mitte U','drawing.centerV':'Mitte V','drawing.width':'Breite','drawing.height':'Höhe',
 'drawing.addDimension':'Maß hinzufügen','drawing.deleteDimension':'Maß löschen','drawing.pointA':'Bezug A','drawing.pointB':'Bezug B','drawing.model':'Gesamter Rohmaßkasten','drawing.corner':'Rohteil-Ecke (lokal X/Y/Z)','drawing.min':'min','drawing.max':'max','drawing.horizontal':'Horizontal','drawing.vertical':'Vertikal','drawing.aligned':'Ausgerichtet in Ansicht','drawing.offset':'Maßlinienabstand',
 'drawing.stockReferences':'Eigene Maße beziehen sich auf Rohteil-Ecken, nicht auf beschnittene Kanten.','drawing.scope':'Alle Bauteile des Dokuments werden ausgegeben; Ausblenden und Türöffnung ändern nur die Modellansicht.',
 'drawing.emptyView':'Ansicht „{name}“ enthält im gewählten Schnitt-/Detailbereich keine Geometrie.','drawing.missingReference':'Ansicht „{name}“: Ein Maß verweist auf ein fehlendes Bauteil. Bezug korrigieren oder Maß löschen.','drawing.zeroDimension':'Ansicht „{name}“: Das Maß hat in dieser Blickrichtung die Länge null.','drawing.stale':'Das Modell oder die Zeichnungsoptionen wurden geändert. Ausgabe bitte neu erzeugen.',
 'drawing.outsideDetail':'Ansicht „{name}“: Ein Maßbezug liegt außerhalb des Detailfensters.',
 'drawing.edit':'Eigene Blätter bearbeiten','drawing.failure':'Zeichnungen konnten nicht erzeugt werden: {error}',
};
export const drawingEn:Record<string,string>={
 'drawing.dimension':'Dimension {n}', 'drawing.orientation':'Dimension direction',
 'drawing.rebuild':'Regenerate',
 'drawing.custom':'Custom views and dimensions','drawing.addView':'Add drawing sheet','drawing.deleteView':'Delete drawing sheet','drawing.title':'Sheet title','drawing.view':'View direction','drawing.front':'Front','drawing.side':'From left','drawing.top':'Top',
 'drawing.section':'Solid section','drawing.sectionOffset':'Section position {axis}','drawing.sectionNote':'Solid section {axis} = {offset} mm – without material hatching','drawing.detail':'Detail window / crop','drawing.centerU':'Centre U','drawing.centerV':'Centre V','drawing.width':'Width','drawing.height':'Height',
 'drawing.addDimension':'Add dimension','drawing.deleteDimension':'Delete dimension','drawing.pointA':'Reference A','drawing.pointB':'Reference B','drawing.model':'Overall stock bounding box','drawing.corner':'Stock corner (local X/Y/Z)','drawing.min':'min','drawing.max':'max','drawing.horizontal':'Horizontal','drawing.vertical':'Vertical','drawing.aligned':'Aligned in view','drawing.offset':'Dimension offset',
 'drawing.stockReferences':'Custom dimensions reference stock corners, not processed edges.','drawing.scope':'Every documented part is included; hiding parts and opening doors only affect the model view.',
 'drawing.emptyView':'View “{name}” contains no geometry in the chosen section/detail area.','drawing.missingReference':'View “{name}”: a dimension references a missing part. Correct the reference or delete the dimension.','drawing.zeroDimension':'View “{name}”: the dimension has zero length in this direction.','drawing.stale':'The model or drawing options changed. Regenerate the output.',
 'drawing.outsideDetail':'View “{name}”: a dimension reference lies outside the detail window.',
 'drawing.edit':'Edit custom sheets','drawing.failure':'Drawings could not be generated: {error}',
};
