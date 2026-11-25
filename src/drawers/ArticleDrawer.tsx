import { useQueryClient } from '@tanstack/react-query';
import { post } from '../api/client';
import { useArticle, useTraining } from '../api/hooks';
import { Icon } from '../components/Icon';
import { DrawerFrame, useUi } from '../components/Ui';
import { Loading } from '../components/Widgets';
import { firstName, fmtDate } from '../lib/format';

export function ArticleDrawer({ id, learner }: { id: number; learner: string }) {
  const ui = useUi();
  const qc = useQueryClient();
  const a = useArticle(id);
  const t = useTraining(learner);
  const summary = t.data?.articles.find((x) => x.id === id);
  const who = firstName(t.data?.learners.find((l) => l.key === learner)?.name ?? '');

  if (a.isLoading || !a.data) return <DrawerFrame wide header={<div className="grow"><h2>Article</h2></div>}><Loading /></DrawerFrame>;
  const art = a.data;
  const more = (t.data?.articles ?? []).filter((x) => x.topic === art.topic && x.id !== id)
    .concat((t.data?.articles ?? []).filter((x) => x.topic !== art.topic)).slice(0, 2);

  const markRead = async () => {
    try {
      await post(`/business/training/articles/${id}/read`, { learner });
      await qc.invalidateQueries({ queryKey: ['training'] });
      ui.toast('Marked as read' + (who ? ' for ' + who : ''));
    } catch (e) {
      ui.toast(e instanceof Error ? e.message : 'Could not save.');
    }
  };
  const share = () => {
    try {
      navigator.clipboard?.writeText(art.title + ' https://usedara.com');
    } catch {
      /* ignore */
    }
    ui.toast('Link copied. Paste it into your team WhatsApp group.');
  };

  return (
    <DrawerFrame wide
      header={<div className="grow"><span className="pill st-new">{art.topic}</span><h2>{art.title}</h2><p>Dara Academy, {fmtDate(art.published_at)}, {art.minutes} min read</p></div>}
      footer={
        <>
          <a className="btn" href="https://usedara.com" target="_blank" rel="noopener noreferrer"><Icon name="ext" />usedara.com</a>
          <button className="btn" onClick={share}><Icon name="send" />Share with team</button>
          <span className="primary-slot">
            {summary?.read ? <span className="pill st-completed">Read{who ? ' by ' + who : ''}</span> : <button className="btn primary" onClick={markRead}><Icon name="check" />Mark as read</button>}
          </span>
        </>
      }>
      <article className="reader">{art.body.map((p, k) => <p key={k}>{p}</p>)}</article>
      <div className="sec">
        <h4>Read next</h4>
        <ul className="minilist">
          {more.map((x) => (
            <li key={x.id} className="click" onClick={() => ui.openDrawer({ type: 'article', id: x.id, learner })}>
              <div className="grow"><b>{x.title}</b><small>{x.topic}, {x.minutes} min read</small></div>
              {x.read && <span className="pill st-completed">Read</span>}
            </li>
          ))}
        </ul>
      </div>
    </DrawerFrame>
  );
}
