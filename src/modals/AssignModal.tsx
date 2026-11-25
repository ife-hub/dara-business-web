import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { post } from '../api/client';
import type { TrainingData } from '../api/types';
import { Modal, useUi } from '../components/Ui';
import { dayOff, firstName, today } from '../lib/format';

export function AssignModal({ data, courseId }: { data: TrainingData; courseId?: number }) {
  const ui = useUi();
  const qc = useQueryClient();
  const [course, setCourse] = useState(courseId ?? data.courses[0]?.id);
  const [who, setWho] = useState<string[]>([]);
  const [due, setDue] = useState(dayOff(14));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const staff = data.learners.filter((l) => l.type === 'staff');

  const save = async () => {
    if (!who.length) return setErr('Choose at least one staff member.');
    setBusy(true);
    try {
      for (const learner of who) await post('/business/training/assignments', { course_id: course, learner, due_date: due });
      await qc.invalidateQueries({ queryKey: ['training'] });
      ui.closeModal();
      const names = who.map((k) => firstName(staff.find((s) => s.key === k)?.name ?? ''));
      ui.toast(`${data.courses.find((c) => c.id === course)?.title} assigned to ${names.length > 2 ? names.length + ' staff' : names.join(' and ')}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not assign the course.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Assign a course" sub="Staff see assigned courses when they log in to Dara Business."
      footer={<><button className="btn" onClick={ui.closeModal}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>Assign course</button></>}>
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="field"><label htmlFor="asCourse">Course</label>
          <select id="asCourse" value={course} onChange={(e) => setCourse(Number(e.target.value))}>
            {data.segments.map((sg) => (
              <optgroup key={sg} label={sg}>{data.courses.filter((c) => c.segment === sg).map((c) => <option key={c.id} value={c.id}>{c.title} ({c.total} lessons)</option>)}</optgroup>
            ))}
          </select>
        </div>
        <div className="field"><span className="label">Staff</span>
          <div className="checks">
            {staff.length ? staff.map((s) => (
              <label key={s.key} className="check">
                <input type="checkbox" checked={who.includes(s.key)} onChange={(e) => setWho(e.target.checked ? [...who, s.key] : who.filter((x) => x !== s.key))} /> {s.name} <span className="hint">{s.role}</span>
              </label>
            )) : <span className="hint">Add staff first.</span>}
          </div>
        </div>
        <div className="field"><label htmlFor="asDue">Complete by</label><input id="asDue" type="date" value={due} min={today()} onChange={(e) => setDue(e.target.value)} /></div>
        {err && <p className="form-error">{err}</p>}
      </form>
    </Modal>
  );
}
