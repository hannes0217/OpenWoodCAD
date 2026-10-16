import { download, safeName } from '../actions';
import { geom } from '../geomClient';
import { t } from '../i18n';
import { evaluated, getState, toast, type Workspace } from '../store';
import { DrawingsView } from './Drawings';
import { ProjectView } from './Project';
import { StaticsView } from './Statics';

type MenuItem = { label: string; action: () => void; shortcut?: string; disabled?: boolean };

async function exportStep() {
  try {
    const data = await geom.step(evaluated().elements.filter((e) => !e.hidden));
    download(`${safeName(getState().doc.project.name)}.step`, data, 'application/step');
  } catch (err) {
    toast(String(err), 'error');
  }
}

async function exportStl() {
  try {
    const data = await geom.stl(evaluated().elements.filter((e) => !e.hidden));
    download(`${safeName(getState().doc.project.name)}.stl`, data, 'model/stl');
  } catch (err) {
    toast(String(err), 'error');
  }
}

/** Export entries for the file menu (extended by later modules). */
export function exportMenu(): MenuItem[] {
  return [
    { label: `${t('menu.export')}: ${t('menu.exportStep')}`, action: exportStep },
    { label: `${t('menu.export')}: ${t('menu.exportStl')}`, action: exportStl },
  ];
}

export function ExtraViews({ ws }: { ws: Workspace }) {
  if (ws === 'project') return <ProjectView />;
  if (ws === 'drawings') return <DrawingsView />;
  if (ws === 'statics') return <StaticsView />;
  return null;
}
