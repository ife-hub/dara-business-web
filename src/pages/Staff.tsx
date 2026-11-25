import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { put } from '../api/client';
import { useStaff } from '../api/hooks';
import type { StaffMember } from '../api/types';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '../components/Icon';
import { ConfirmModal, useUi } from '../components/Ui';
import { Avatar, ErrorBox, Loading } from '../components/Widgets';
import { firstName } from '../lib/format';
import { StaffModal } from '../modals/StaffModal';

export function Staff() {
  const ui = useUi();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const s = useStaff();
  const all = s.data?.staff ?? [];
  const n = q.trim().toLowerCase();
  const list = all.filter((x) => !n || (x.name + ' ' + x.role).toLowerCase().includes(n));

  const setActive = async (x: StaffMember, active: boolean) => {
    try {
      await put(`/staff/${x.id}`, { status: active });
      await qc.invalidateQueries();
      ui.toast(active ? firstName(x.name) + ' is active again' : firstName(x.name) + ' deactivated');
      ui.closeModal();
    } catch (e) {
      ui.toast(e instanceof Error ? e.message : 'Could not update staff.');
    }
  };

  const toggle = (x: StaffMember) => {
    if (!x.active) return setActive(x, true);
    ui.openModal(() => (
      <ConfirmModal title={'Deactivate ' + firstName(x.name) + '?'} danger ok="Deactivate"
        text={<>{x.name} will no longer appear on the calendar or in booking forms, and can no longer log in.{x.bookings_today ? <> They have <b>{x.bookings_today} booking{x.bookings_today === 1 ? '' : 's'} today</b>. Reassign them from the calendar.</> : null}</>}
        onOk={() => setActive(x, false)} />
    ));
  };

  return (
    <>
      <div className="toolbar">
        <label className="search"><Icon name="search" /><input type="search" placeholder="Search staff" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search staff" /></label>
        <span className="hint">{all.filter((x) => x.active).length} active of {all.length}</span>
        <span className="grow" />
        <button className="btn primary" onClick={() => ui.openModal(() => <StaffModal />)}><Icon name="plus" />Add staff</button>
      </div>
      <section className="panel">
        {s.isLoading ? <Loading /> : s.error ? <ErrorBox error={s.error} retry={() => s.refetch()} /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Staff</th><th>Role</th><th>Phone</th><th>Status</th><th className="num">Appointments today</th><th /></tr></thead>
              <tbody>
                {list.length ? list.map((x) => (
                  <tr key={x.id}>
                    <td><div className="who"><Avatar name={x.name} color={x.color} dim={!x.active} /><div><b>{x.name}</b><small>{x.bookable ? 'Takes bookings' : 'Does not take bookings'}</small></div></div></td>
                    <td>{x.role}</td>
                    <td className="tnum">{x.phone}</td>
                    <td><span className={'pill st-' + (x.active ? 'active' : 'inactive')}>{x.active ? 'Active' : 'Inactive'}</span></td>
                    <td className="num">{x.bookable && x.bookings_today ? <button className="link" onClick={() => nav(`/bookings?mode=day&staff=${x.id}`)}>{x.bookings_today}</button> : x.bookings_today}</td>
                    <td className="actions">
                      <button className="btn sm" onClick={() => ui.openModal(() => <StaffModal staff={x} />)}><Icon name="edit" />Edit</button>{' '}
                      <button className={'btn sm ' + (x.active ? 'danger' : 'soft')} onClick={() => toggle(x)}>{x.active ? 'Deactivate' : 'Activate'}</button>
                    </td>
                  </tr>
                )) : <tr><td colSpan={6}><div className="empty"><b>No staff found</b>Add your team to assign bookings.</div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
