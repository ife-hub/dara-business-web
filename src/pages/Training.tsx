import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { post } from '../api/client';
import { useTraining } from '../api/hooks';
import type { Course, TrainingData } from '../api/types';
import { useAuth } from '../auth/Auth';
import { Icon } from '../components/Icon';
import { useUi } from '../components/Ui';
import { Avatar, ErrorBox, Loading } from '../components/ui';
import { firstName, fmtDur, relDate, today } from '../lib/format';
import { AssignModal } from '../modals/AssignModal';

export const SEGVAR: Record<string, string> = { 'Front desk': 'conf', 'Stylists and technicians': 'prog', 'Owners and managers': 'pend', 'All staff': 'done' };

export function Training() {
  const { me } = useAuth();
  const [learner, setLearner] = useState(me!.user.learner_key);
  const [tab, setTab] = useState<'articles' | 'courses' | 'team'>('articles');
  const [topic, setTopic] = useState('All');
  const [segment, setSegment] = useState('All');
  const [q, setQ] = useState('');
  const [courseId, setCourseId] = useState<number | null>(null);
  const t = useTraining(learner);

  if (t.isLoading) return <Loading />;
  if (t.error || !t.data) return <ErrorBox error={t.error} retry={() => t.refetch()} />;
  const d = t.data;

  const course = courseId ? d.courses.find((c) => c.id === courseId) : null;
  if (course) return <CourseView data={d} course={course} learner={learner} setLearner={setLearner} back={() => { setCourseId(null); setTab('courses'); }} />;

  const viewer = <ViewerSelect data={d} learner={learner} setLearner={setLearner} />;

  return (
    <>
      <div className="banner">
        <span className="ic"><Icon name="cap" /></span>
        <div className="grow"><b>From Dara Academy.</b> The same articles and courses are published on usedara.com, so your team can keep learning on their phones.</div>
        <a className="btn" href="https://usedara.com" target="_blank" rel="noopener noreferrer"><Icon name="ext" />Visit usedara.com</a>
      </div>
      <div className="toolbar">
        <div className="seg" role="tablist">
          {([['articles', 'Articles', d.articles.length], ['courses', 'Courses', d.courses.length], ...(d.can_manage ? [['team', 'Team progress', d.team?.length ?? 0]] : [])] as [typeof tab, string, number][]).map(([k, l, n]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l} <span className="ct">{n}</span></button>
          ))}
        </div>
        {tab !== 'team' && <label className="search"><Icon name="search" /><input type="search" placeholder={'Search ' + tab} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search training" /></label>}
        <span className="grow" />
        {tab === 'team' ? <AssignButton data={d} /> : viewer}
      </div>
      {tab === 'articles' && <Articles data={d} topic={topic} setTopic={setTopic} q={q} learner={learner} />}
      {tab === 'courses' && <Courses data={d} segment={segment} setSegment={setSegment} q={q} open={setCourseId} />}
      {tab === 'team' && <Team data={d} open={(id) => setCourseId(id)} />}
    </>
  );
}

function ViewerSelect({ data, learner, setLearner }: { data: TrainingData; learner: string; setLearner: (k: string) => void }) {
  if (data.learners.length < 2) return null;
  return (
    <label className="viewer">
      <span className="hint">Learning as</span>
      <select className="sel" value={learner} onChange={(e) => setLearner(e.target.value)} aria-label="Choose staff member">
        {data.learners.map((l) => <option key={l.key} value={l.key}>{l.name}</option>)}
      </select>
    </label>
  );
}

function AssignButton({ data, courseId }: { data: TrainingData; courseId?: number }) {
  const ui = useUi();
  if (!data.can_manage) return null;
  return <button className={courseId ? 'btn' : 'btn primary'} onClick={() => ui.openModal(() => <AssignModal data={data} courseId={courseId} />)}>
    <Icon name={courseId ? 'staff' : 'plus'} />{courseId ? 'Assign to staff' : 'Assign course'}
  </button>;
}

function Articles({ data, topic, setTopic, q, learner }: { data: TrainingData; topic: string; setTopic: (t: string) => void; q: string; learner: string }) {
  const ui = useUi();
  const n = q.trim().toLowerCase();
  const list = data.articles.filter((a) => (topic === 'All' || a.topic === topic) && (!n || (a.title + ' ' + a.excerpt + ' ' + a.topic).toLowerCase().includes(n)));
  return (
    <>
      <div className="chips">
        {['All', ...data.topics].map((t) => (
          <button key={t} className={'chipf' + (topic === t ? ' on' : '')} onClick={() => setTopic(t)}>
            {t} <span className="ct">{t === 'All' ? data.articles.length : data.articles.filter((a) => a.topic === t).length}</span>
          </button>
        ))}
      </div>
      <div className="art-grid">
        {list.length ? list.map((a, i) => (
          <button key={a.id} className={'art' + (i === 0 && topic === 'All' && !n ? ' lead' : '')} onClick={() => ui.openDrawer({ type: 'article', id: a.id, learner })}>
            <span className="tp">{a.topic}</span>
            <h3>{a.title}</h3>
            <p>{a.excerpt}</p>
            <span className="meta"><span>{a.minutes} min read</span><span>{relDate(a.published_at)}</span>{a.read && <span className="rd"><Icon name="check" />Read</span>}</span>
          </button>
        )) : <div className="empty" style={{ gridColumn: '1/-1' }}><b>No articles found</b>Try another topic or search word.</div>}
      </div>
    </>
  );
}

function Courses({ data, segment, setSegment, q, open }: { data: TrainingData; segment: string; setSegment: (s: string) => void; q: string; open: (id: number) => void }) {
  const T = today();
  const n = q.trim().toLowerCase();
  const list = data.courses.filter((c) => (segment === 'All' || c.segment === segment) && (!n || (c.title + ' ' + c.description + ' ' + c.segment).toLowerCase().includes(n)));
  return (
    <>
      <div className="chips">
        {['All', ...data.segments].map((s) => (
          <button key={s} className={'chipf' + (segment === s ? ' on' : '')} onClick={() => setSegment(s)}>
            {s} <span className="ct">{s === 'All' ? data.courses.length : data.courses.filter((c) => c.segment === s).length}</span>
          </button>
        ))}
      </div>
      <div className="course-grid">
        {list.length ? list.map((c) => {
          const v = SEGVAR[c.segment] ?? 'conf';
          const vids = c.lessons.filter((l) => l.type === 'video').length;
          return (
            <button key={c.id} className="crs" onClick={() => open(c.id)}>
              <div className="crs-top" style={{ background: `var(--${v}-bg)`, color: `var(--${v})` }}><span>{c.segment}</span><b>{c.total}<small>lessons</small></b></div>
              <div className="crs-b">
                <h3>{c.title}</h3>
                <p>{c.description}</p>
                <span className="meta"><span>{vids} videos, {c.total - vids} readings</span><span>{fmtDur(c.minutes)}</span><span>{c.level}</span></span>
                {c.assigned && c.done < c.total && c.due_date && (
                  <span className={'pill ' + (c.due_date < T ? 'st-overdue' : 'st-new')} style={{ alignSelf: 'flex-start' }}>Assigned, due {relDate(c.due_date)}</span>
                )}
                <div className="foot">
                  <div className={'prog' + (c.done === c.total ? ' done' : '')}><i style={{ width: Math.round((c.done / Math.max(1, c.total)) * 100) + '%' }} /></div>
                  <span className="meta">{c.done === c.total ? 'Completed' : c.done ? `${c.done} of ${c.total} lessons done` : 'Not started'}</span>
                </div>
              </div>
            </button>
          );
        }) : <div className="empty" style={{ gridColumn: '1/-1' }}><b>No courses found</b>Try another segment or search word.</div>}
      </div>
    </>
  );
}

function Team({ data, open }: { data: TrainingData; open: (id: number) => void }) {
  const ui = useUi();
  const qc = useQueryClient();
  const T = today();
  const rows = (data.team ?? []).map((r) => ({
    ...r,
    st: r.done === r.total ? 'Completed' : r.due_date && r.due_date < T ? 'Overdue' : r.done ? 'In progress' : 'Not started',
  })).sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));
  const cnt = (k: string) => rows.filter((r) => r.st === k).length;
  const cls: Record<string, string> = { Completed: 'st-completed', Overdue: 'st-overdue', 'In progress': 'st-in-progress', 'Not started': 'st-cancelled' };

  const remind = async (id: number, name: string) => {
    try {
      await post(`/business/training/assignments/${id}/remind`);
      await qc.invalidateQueries({ queryKey: ['training'] });
      ui.toast('Reminder emailed to ' + firstName(name));
    } catch (e) {
      ui.toast(e instanceof Error ? e.message : 'Could not send the reminder.');
    }
  };

  return (
    <>
      <div className="strip">
        <div><small>Courses assigned</small><strong>{rows.length}</strong></div>
        <div><small>In progress</small><strong>{cnt('In progress')}</strong></div>
        <div><small>Completed</small><strong>{cnt('Completed')}</strong></div>
        <div><small>Overdue</small><strong style={{ color: 'var(--over)' }}>{cnt('Overdue')}</strong></div>
      </div>
      <section className="panel">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Staff</th><th>Course</th><th>Progress</th><th>Due</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.length ? rows.map((r) => (
                <tr key={r.id}>
                  <td><div className="who"><Avatar name={r.learner.name} color={r.learner.color} size="sm" /><div><b>{r.learner.name}</b><small>{r.learner.role}</small></div></div></td>
                  <td><button className="link" onClick={() => open(r.course.id)}>{r.course.title}</button></td>
                  <td style={{ minWidth: 160 }}>
                    <div className={'prog' + (r.done === r.total ? ' done' : '')}><i style={{ width: Math.round((r.done / Math.max(1, r.total)) * 100) + '%' }} /></div>
                    <small className="muted">{r.done} of {r.total} lessons</small>
                  </td>
                  <td>{r.due_date ? relDate(r.due_date) : 'No due date'}</td>
                  <td><span className={'pill ' + cls[r.st]}>{r.st}</span></td>
                  <td className="actions">{r.st !== 'Completed' && r.learner.type === 'staff' && <button className="btn sm" onClick={() => remind(r.id, r.learner.name)}>Send reminder</button>}</td>
                </tr>
              )) : <tr><td colSpan={6}><div className="empty"><b>No courses assigned yet</b>Assign a course to get your team learning.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function CourseView({ data, course: c, learner, setLearner, back }: { data: TrainingData; course: Course; learner: string; setLearner: (k: string) => void; back: () => void }) {
  const ui = useUi();
  const qc = useQueryClient();
  const firstOpen = useMemo(() => Math.max(0, c.lessons.findIndex((l) => !l.done)), [c.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(firstOpen);
  const [playing, setPlaying] = useState<'idle' | 'playing' | 'ended'>('idle');
  useEffect(() => setPlaying('idle'), [i]);

  const n = c.lessons.length, L = c.lessons[Math.min(i, n - 1)], v = SEGVAR[c.segment] ?? 'conf';
  const who = data.learners.find((l) => l.key === learner)?.name ?? 'you';

  const complete = async () => {
    try {
      await post(`/business/training/lessons/${L.id}/complete`, { learner });
      await qc.invalidateQueries({ queryKey: ['training'] });
      const fresh = qc.getQueryData<TrainingData>(['training', learner]);
      const updated = fresh?.courses.find((x) => x.id === c.id);
      const left = updated ? updated.lessons.findIndex((l) => !l.done) : -1;
      if (left < 0) ui.toast(c.title + ' completed by ' + firstName(who));
      else {
        setI(i < n - 1 ? i + 1 : left);
        ui.toast('Lesson complete');
      }
    } catch (e) {
      ui.toast(e instanceof Error ? e.message : 'Could not save progress.');
    }
  };

  return (
    <>
      <button className="link back" onClick={back}><Icon name="arrowL" />All courses</button>
      <header className="course-head">
        <div>
          <span className="pill" style={{ background: `var(--${v}-bg)`, color: `var(--${v})` }}>{c.segment}</span>
          <h2>{c.title}</h2>
          <p className="muted">{c.description}</p>
          <span className="meta">{n} lessons, {fmtDur(c.minutes)}, {c.level}, by Dara Academy</span>
        </div>
        <div className="ch-side">
          <ViewerSelect data={data} learner={learner} setLearner={setLearner} />
          <div className={'prog' + (c.done === n ? ' done' : '')}><i style={{ width: Math.round((c.done / Math.max(1, n)) * 100) + '%' }} /></div>
          <span className="hint">{c.done === n ? `${firstName(who)} has completed this course` : `${c.done} of ${n} lessons complete for ${firstName(who)}`}</span>
          <AssignButton data={data} courseId={c.id} />
        </div>
      </header>
      <div className="course-wrap">
        <section className="panel lesson">
          {L.type === 'video' && (
            L.video_url ? (
              <video key={L.id} className="vid-real" src={L.video_url} controls style={{ width: '100%', borderRadius: 'var(--r)' }} />
            ) : (
              <>
                <div className={'vid' + (playing === 'playing' ? ' playing' : playing === 'ended' ? ' ended' : '')}>
                  <span className="brand">Dara Academy</span>
                  <button className="vplay" aria-label="Play video" onClick={() => { if (playing === 'playing') return; setPlaying('playing'); setTimeout(() => setPlaying('ended'), 4000); }}><Icon name="play" /></button>
                  <div className="vcap"><b>{L.title}</b><span>{L.minutes}:00</span></div>
                  <div className="vbar"><i /></div>
                </div>
                <p className="hint" style={{ marginTop: 8 }}>The video for this lesson is coming soon. Read the summary below in the meantime.</p>
              </>
            )
          )}
          <div className="lesson-b">
            <span className="hint">Lesson {i + 1} of {n}, {L.type === 'video' ? 'video' : 'reading'}, {L.minutes} min</span>
            <h3>{L.title}</h3>
            <p className="reader-p">{L.type === 'video' ? 'In this video: ' : ''}{L.text}</p>
            {L.type === 'read' && <p className="tryit"><b>Try it today.</b> Use one idea from this lesson with your next customer, then share how it went at the morning huddle.</p>}
          </div>
          <footer className="lesson-f">
            <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}><Icon name="chevL" />Previous</button>
            <span className="grow" />
            {L.done ? (
              <>
                <span className="pill st-completed">Completed</span>
                {i < n - 1 && <button className="btn primary" onClick={() => setI(i + 1)}>Next lesson<Icon name="chevR" /></button>}
              </>
            ) : (
              <button className="btn primary" onClick={complete}><Icon name="check" />{i < n - 1 ? 'Mark complete and continue' : 'Finish course'}</button>
            )}
          </footer>
        </section>
        <aside className="panel lessons">
          <h4><span>Lessons</span><span className="hint">{c.done}/{n}</span></h4>
          <ol>
            {c.lessons.map((l, j) => (
              <li key={l.id}>
                <button className={'ls' + (j === i ? ' on' : '') + (l.done ? ' done' : '')} onClick={() => setI(j)} aria-current={j === i ? 'step' : undefined}>
                  <span className="ln">{l.done ? <Icon name="check" /> : j + 1}</span>
                  <span className="grow"><b>{l.title}</b><small>{l.type === 'video' ? 'Video' : 'Reading'}, {l.minutes} min</small></span>
                  <Icon name={l.type === 'video' ? 'video' : 'book'} />
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </>
  );
}
