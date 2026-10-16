import { useEffect, useState } from 'react';
import { uid } from '../../core/math';
import { emptyDocument } from '../../core/model';
import { validateDocument } from '../../core/validate';
import { deleteProject, listPoints, listProjects, loadPoint, loadProject, saveProject, type ProjectMeta, type RestorePoint } from '../projects';
import { createRestorePoint, flushPersistence, getState, replaceDoc, setState, switchProject, toast, useApp } from '../store';
import { t } from '../i18n';

const fmtTime = (ts: number, de: boolean) => new Date(ts).toLocaleString(de ? 'de-DE' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' });

export function ProjectsDialog({ onClose }: { onClose: () => void }) {
  const lang = useApp((s) => s.lang);
  const projectId = useApp((s) => s.projectId);
  const de = lang === 'de';
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [points, setPoints] = useState<RestorePoint[]>([]);
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    try {
      setProjects(await listProjects());
      setPoints(await listPoints(getState().projectId));
    } catch (err) {
      toast(String(err), 'error');
    }
  };
  useEffect(() => { void refresh(); }, [projectId]);

  const open = async (id: string) => {
    if(busy)return;setBusy(true);
    const original=getState().doc;
    try {
    const doc = await loadProject(id);
    const v = doc ? validateDocument(doc) : null;
    if (!v?.doc) { toast(de ? 'Projekt konnte nicht geladen werden.' : 'Could not load project.', 'error'); return; }
    if(getState().doc!==original){toast(t('safe.documentChanged'),'error');return;}
    if(await switchProject(id,v.doc))onClose();else toast(t('safe.documentChanged'),'error');
    }catch(err){toast(t('safe.saveFailed',{error:String(err)}),'error');}finally{setBusy(false);}
  };
  const create = async () => {
    if(busy)return;setBusy(true);
    const original=getState().doc;
    try {
    const id = uid('prj');
    const doc = emptyDocument(de ? 'Neues Projekt' : 'New project');
    await saveProject(id, doc);
    if(getState().doc!==original){toast(t('safe.documentChanged'),'error');return;}
    if(await switchProject(id,doc))onClose();else toast(t('safe.documentChanged'),'error');
    }catch(err){toast(t('safe.saveFailed',{error:String(err)}),'error');}finally{setBusy(false);}
  };
  const duplicate = async (id: string) => {
    if(busy)return;setBusy(true);
    try{
    const doc = id===getState().projectId?getState().doc:await loadProject(id);
    if (!doc) return;
    await saveProject(uid('prj'), { ...doc, project: { ...doc.project, name: `${doc.project.name} (${de ? 'Kopie' : 'copy'})` } });
    await refresh();
    }catch(err){toast(String(err),'error');}finally{setBusy(false);}
  };
  const remove = async (p: ProjectMeta) => {
    if(busy)return;
    if (p.id === projectId) { toast(de ? 'Das geöffnete Projekt kann nicht gelöscht werden.' : 'The open project cannot be deleted.', 'error'); return; }
    if (!confirm(de ? `Projekt „${p.name}“ endgültig löschen?` : `Delete project “${p.name}” permanently?`)) return;
    setBusy(true);try{
    await deleteProject(p.id);
    await refresh();
    }catch(err){toast(String(err),'error');}finally{setBusy(false);}
  };
  const restore = async (pt: RestorePoint) => {
    if (!confirm(de ? `Stand vom ${fmtTime(pt.createdAt, de)} wiederherstellen? Der aktuelle Stand wird vorher als Wiederherstellungspunkt gesichert.` : `Restore the state from ${fmtTime(pt.createdAt, de)}? The current state is saved first.`)) return;
    setBusy(true);
    const original=getState().doc;
    try {
      await flushPersistence();
      await createRestorePoint(de ? 'vor Wiederherstellung' : 'before restore');
      const doc = await loadPoint(pt.id);
      const v = doc ? validateDocument(doc) : null;
      if(getState().doc!==original){toast(t('safe.documentChanged'),'error');return;}
      if (v?.doc) { replaceDoc(v.doc); setState({ dirty: true }); }
      else {toast(t('safe.restoreFailed'),'error');return;}
      onClose();
    } catch(err) {toast(t('safe.saveFailed',{error:String(err)}),'error');
    } finally {
      setBusy(false);
    }
  };
  const snapshot = async () => {
    if(busy)return;
    const label = prompt(de ? 'Bezeichnung des Wiederherstellungspunkts' : 'Restore point label', de ? 'manuell' : 'manual');
    if (label === null) return;
    setBusy(true);try{
    await createRestorePoint(label || (de ? 'manuell' : 'manual'));
    await refresh();
    }catch(err){toast(String(err),'error');}finally{setBusy(false);}
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal wide" onMouseDown={(e) => e.stopPropagation()} role="dialog">
        <div className="modal-head">
          <h2>{de ? 'Projekte' : 'Projects'}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body projects">
          <section>
            <div className="row-head">
              <h3>{de ? 'Lokal gespeicherte Projekte' : 'Local projects'}</h3>
              <button className="btn" disabled={busy} onClick={create}>＋ {de ? 'Neues Projekt' : 'New project'}</button>
            </div>
            <p className="muted small">{de ? 'Projekte werden automatisch in diesem Browser gespeichert. Für eine Sicherung oder zur Weitergabe: Datei → Speichern (.owc).' : 'Projects are saved automatically in this browser. For backups or sharing use File → Save (.owc).'}</p>
            <table className="table">
              <thead><tr><th>{de ? 'Name' : 'Name'}</th><th>{de ? 'Geändert' : 'Modified'}</th><th className="r">{de ? 'Objekte' : 'Objects'}</th><th /></tr></thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className={p.id === projectId ? 'current' : ''}>
                    <td>{p.name}{p.id === projectId && <span className="chip">{de ? 'geöffnet' : 'open'}</span>}</td>
                    <td>{fmtTime(p.updatedAt, de)}</td>
                    <td className="r">{p.parts}</td>
                    <td className="r nowrap">
                      {p.id !== projectId && <button className="link" disabled={busy} onClick={() => open(p.id)}>{de ? 'Öffnen' : 'Open'}</button>}
                      <button className="link" onClick={() => duplicate(p.id)}>{de ? 'Duplizieren' : 'Duplicate'}</button>
                      {p.id !== projectId && <button className="link danger" onClick={() => remove(p)}>{de ? 'Löschen' : 'Delete'}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <div className="row-head">
              <h3>{de ? 'Wiederherstellungspunkte (geöffnetes Projekt)' : 'Restore points (open project)'}</h3>
              <button className="btn subtle" onClick={snapshot}>{de ? 'Punkt jetzt anlegen' : 'Create now'}</button>
            </div>
            <p className="muted small">{de ? 'Automatisch alle 10 Minuten während der Bearbeitung, die letzten 30 werden aufbewahrt.' : 'Automatically every 10 minutes while editing; the last 30 are kept.'}</p>
            {points.length === 0 ? <p className="muted">{de ? 'Noch keine Wiederherstellungspunkte.' : 'No restore points yet.'}</p> : (
              <table className="table">
                <tbody>
                  {points.map((pt) => (
                    <tr key={pt.id}>
                      <td>{fmtTime(pt.createdAt, de)}</td>
                      <td>{pt.label === 'auto' ? (de ? 'automatisch' : 'automatic') : pt.label}</td>
                      <td className="r"><button className="link" disabled={busy} onClick={() => restore(pt)}>{de ? 'Wiederherstellen' : 'Restore'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function SaveStatus() {
  const st = useApp((s) => s.saveStatus);
  const lang = useApp((s) => s.lang);
  const de = lang === 'de';
  const time = st.at ? new Date(st.at).toLocaleTimeString(de ? 'de-DE' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
  const text = st.state === 'saving' ? (de ? 'Speichert …' : 'Saving …') : st.state === 'error' ? (de ? '⚠ Nicht gespeichert' : '⚠ Not saved') : st.state === 'saved' ? `${de ? '✓ Gespeichert' : '✓ Saved'} ${time}` : '';
  return <span className={`save-status ${st.state}`} title={st.error ?? (de ? 'Automatisch lokal gespeichert' : 'Saved locally automatically')} onClick={() => setState({ dialog: { type: 'projects' } })}>{text}</span>;
}
