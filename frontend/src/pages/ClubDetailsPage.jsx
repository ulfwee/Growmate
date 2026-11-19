import '../css/ClubDetailsPage.css';
import ClubEvents from '../components/events/ClubEvents';
import ClubGroupGoals from '../components/groupGoals/ClubGroupGoals';
import ClubRating from '../components/rating/ClubRating';
import { getImageUrl } from '../utils/imageUrl';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faUsers, faLock, faGlobe, faCalendarDays, faCheck, faArrowRight, faPen, faTrash, faUserGear, faUserPlus, faXmark, faComments, faShieldHalved, faBullseye, faGear, faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { getClub, getClubMembers, getClubCategories, getClubInterests, getClubJoinRequests, joinClub, leaveClub, updateClub, deleteClub, reviewClubJoinRequest, transferClubOwnership, updateClubMemberRole, removeClubMember } from '../services/clubsService';
import EditClubModal from '../components/clubs/EditClubModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import ClubAnnouncements from '../components/announcements/ClubAnnouncements';
import { getGroupGoals } from '../services/groupGoalsService';
import CustomSelect from '../components/CustomSelect';
const displayName = m => [m.firstName, m.lastName].filter(Boolean).join(' ') || m.username || 'Учасник';
const roleName = role => role === 'owner' ? 'Власник' : ['admin', 'moderator'].includes(role) ? 'Модератор' : 'Учасник';
function ExpandableClubText({ text, empty, lines = 6, label = 'опис' }) {
  const contentRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    setExpanded(false);
  }, [text]);
  useEffect(() => {
    const element = contentRef.current;
    if (!element)
      return;
    const measure = () => {
      if (!expanded)
        setOverflow(element.scrollHeight > element.clientHeight + 2);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, lines, expanded]);
  return <div className="gm-text-section">
    <div ref={contentRef} className={`gm-expandable ${expanded ? 'is-expanded' : ''}`} style={{ '--gm-lines': lines }}>
      <p className="gm-panel-description clubs-preline">{text || empty}</p>
    </div>
    {(overflow || expanded) && <button type="button" className="gm-expand-toggle" onClick={() => setExpanded(value => !value)}>
      {expanded ? 'Згорнути' : `Показати ${label} повністю`}
    </button>}
  </div>;
}
const CLUB_THEMES = ['lilac', 'sand', 'sage', 'rose', 'blue'];
const getClubTheme = club => CLUB_THEMES[String(club?.id ?? club?.name ?? '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % CLUB_THEMES.length];
const dateText = date => date ? new Date(date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
export default function ClubDetailsPage({ onUserStatsChanged }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [interestIds, setInterestIds] = useState([]);
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') === 'events' ? 'events' : 'announcements');
  const [announcementGoals, setAnnouncementGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState(null);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  const [dialog, setDialog] = useState(null);
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [memberMenuId, setMemberMenuId] = useState(null);
  const [busyMemberId, setBusyMemberId] = useState(null);
  const [coverFailed, setCoverFailed] = useState(false);
  useEffect(() => setCoverFailed(false), [id, club?.coverUrl]);
  const showInfo = (title, message, variant = 'success') => showToast(message || title, variant);
  const askConfirm = (title, message, action, variant = 'danger') => setDialog({ mode: 'confirm', title, message, action, variant });
  const runConfirmed = async () => {
    if (!dialog?.action)
      return;
    const action = dialog.action;
    setDialog(d => ({ ...d, loading: true }));
    try {
      await action();
      setDialog(current => current?.loading ? null : current);
    }
    catch (e) {
      setDialog(null);
      showToast(e.message || 'Не вдалося виконати дію.', 'error');
    }
  };
  const [showEdit, setShowEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [expandedRules, setExpandedRules] = useState(false);
  const refresh = useCallback(async () => {
    const data = await getClub(id);
    setClub(data);
    const allowed = true;
    const [people, pending] = await Promise.all([
      allowed ? getClubMembers(id).catch(() => []) : Promise.resolve([]),
      (data.isOwner || ['admin', 'moderator'].includes(data.myRole)) && data.visibility === 'private'
        ? getClubJoinRequests(id).catch(() => [])
        : Promise.resolve([]),
    ]);
    setMembers(Array.isArray(people) ? people : []);
    setRequests(Array.isArray(pending) ? pending : []);
    return data;
  }, [id]);
  useEffect(() => {
    if (requestedTab === 'events')
      setTab('events');
  }, [requestedTab]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setClub(null);
    setError('');
    setTab(requestedTab === 'events' ? 'events' : 'announcements');
    setAnnouncementGoals([]);
    setRequestSent(false);
    (async () => {
      try {
        const data = await getClub(id);
        if (!active)
          return;
        setClub(data);
        if (data.isMember || data.isOwner || ['admin', 'moderator'].includes(data.myRole)) {
          getGroupGoals(id).then(goals => {
            if (active)
              setAnnouncementGoals(Array.isArray(goals) ? goals : []);
          }).catch(() => { });
        }
        const [people, pending] = await Promise.all([
          getClubMembers(id).catch(() => []),
          (data.isOwner || ['admin', 'moderator'].includes(data.myRole)) && data.visibility === 'private'
            ? getClubJoinRequests(id).catch(() => [])
            : Promise.resolve([]),
        ]);
        if (active) {
          setMembers(Array.isArray(people) ? people : []);
          setRequests(Array.isArray(pending) ? pending : []);
        }
      }
      catch (e) {
        if (active)
          setError(e.message);
      }
      finally {
        if (active)
          setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);
  const changeMembership = async (message = '') => {
    if (!club || busy)
      return;
    setBusy(true);
    setError('');
    try {
      const result = club.isMember ? await leaveClub(id) : await joinClub(id, message);
      showInfo('Успішно', result?.message || 'Зміни збережено.');
      if (club.visibility === 'private' && !club.isMember) {
        setRequestSent(true);
        setShowJoinForm(false);
        return;
      }
      await refresh();
      if (!club.isMember && club.visibility === 'public') {
        await onUserStatsChanged?.();
      }
    }
    catch (e) {
      showInfo('Не вдалося подати заявку', e.message, 'error');
    }
    finally {
      setBusy(false);
    }
  };
  const openEdit = async () => {
    setBusy(true);
    setError('');
    setEditError('');
    try {
      const [cats, interests] = await Promise.all([getClubCategories(), getClubInterests(id)]);
      setCategories(Array.isArray(cats) ? cats : []);
      setInterestIds(Array.isArray(interests) ? interests.map(i => i.id) : []);
      setShowEdit(true);
    }
    catch (e) {
      setError(`Не вдалося відкрити редагування: ${e.message}`);
    }
    finally {
      setBusy(false);
    }
  };
  const saveClub = async (payload) => {
    setBusy(true);
    setEditError('');
    try {
      await updateClub(id, payload);
      await refresh();
      setShowEdit(false);
      showToast('Інформацію про клуб оновлено.');
    }
    catch (e) {
      setEditError(e.message);
    }
    finally {
      setBusy(false);
    }
  };
  const removeClub = async () => {
    askConfirm('Видалити клуб?', `Видалити клуб «${club.name}»? Цю дію неможливо скасувати.`, async () => {
      await deleteClub(id);
      navigate('/my-clubs', { replace: true });
    });
  };
  const reviewRequest = async (requestId, status) => {
    setBusyRequestId(requestId);
    setError('');
    try {
      await reviewClubJoinRequest(id, requestId, status);
      await refresh();
      showInfo(status === 'accepted' ? 'Заявку схвалено' : 'Заявку відхилено', status === 'accepted' ? 'Користувач став учасником клубу.' : 'Заявку на вступ відхилено.', status === 'accepted' ? 'success' : 'info');
    }
    catch (e) {
      showInfo('Помилка розгляду заявки', e.message, 'error');
    }
    finally {
      setBusyRequestId(null);
    }
  };
  const transferOwnership = () => {
    const selected = members.find(m => String(m.userId) === newOwnerId);
    if (!selected || busy)
      return;
    askConfirm('Передати права власника?', `Передати клуб користувачу «${displayName(selected)}»? Після цього ви втратите права власника.`, async () => {
      setBusy(true);
      try {
        await transferClubOwnership(id, Number(newOwnerId));
        await refresh();
        setNewOwnerId('');
        showToast('Права власника передано.');
      }
      finally {
        setBusy(false);
      }
    });
  };
  const isOwner = Boolean(club?.isOwner || club?.myRole === 'owner');
  const isModerator = ['admin', 'moderator'].includes(club?.myRole);
  const canManageClub = isOwner || isModerator;
  const isMember = Boolean(club?.isMember || isOwner || isModerator);
  const canManageMember = m => canManageClub &&
    String(m.userId) !== String(club?.ownerId) &&
    m.role !== 'owner' && (isOwner || m.role === 'member');
  const canChangeRole = m => isOwner && m.role !== 'owner' &&
    String(m.userId) !== String(club?.ownerId);
  const changeMemberRole = (member, role) => {
    setMemberMenuId(null);
    if (!canChangeRole(member))
      return;
    const promote = role === 'admin';
    askConfirm(promote ? 'Призначити модератора?' : 'Зняти права модератора?', `${promote ? 'Призначити модератором' : 'Зняти роль модератора у користувача'} «${displayName(member)}»?`, async () => {
      setBusyMemberId(member.userId);
      try {
        await updateClubMemberRole(id, member.userId, role);
        await refresh();
        showToast(promote ? 'Модератора призначено.' : 'Роль модератора знято.');
      }
      finally {
        setBusyMemberId(null);
      }
    });
  };
  const kickMember = async (member) => {
    setMemberMenuId(null);
    if (!canManageMember(member))
      return;
    askConfirm('Виключити учасника?', `Виключити «${displayName(member)}» з клубу? Повторний вступ буде заблоковано.`, async () => {
      setBusyMemberId(member.userId);
      try {
        await removeClubMember(id, member.userId);
        await refresh();
        showInfo('Учасника виключено', `«${displayName(member)}» більше не є учасником клубу.`);
      }
      finally {
        setBusyMemberId(null);
      }
    });
  };
  const canViewMembers = Boolean(club);
  const otherMembers = members.filter(m => String(m.userId) !== String(club?.ownerId));
  const tabs = [
    { id: 'announcements', label: 'Оголошення' },
    ...(isMember ? [{ id: 'groupGoals', label: 'Групові цілі' }] : []),
    ...(club?.visibility === 'public' || isMember ? [{ id: 'events', label: 'Події' }] : []),
    ...(isMember ? [{ id: 'rating', label: 'Рейтинг' }] : []),
    ...(canManageClub && club?.visibility === 'private'
      ? [{ id: 'requests', label: `Заявки на вступ (${requests.length})` }] : []),
    ...(isMember ? [{ id: 'members', label: `Учасники (${members.length})` }] : []),
    ...(canManageClub ? [{ id: 'settings', label: 'Керування' }] : []),
    { id: 'about', label: 'Огляд' },
  ];
  return <main className="clubs-page gm-club-detail gm-detail-v2">
    <Link className="clubs-back gm-back" to="/my-clubs"><FontAwesomeIcon icon={faArrowLeft} /> Назад до моїх клубів</Link>
    {loading ? <div className="gm-empty">Завантаження клубу...</div> : !club ? <div className="clubs-alert">{error || 'Клуб не знайдено.'} <Link to="/clubs">До каталогу</Link></div> : <>
      <section className="gm-club-hero">
        <div className={`gm-hero-cover gm-hero-cover--${getClubTheme(club)}`}>
          {club.coverUrl && !coverFailed ? (<img src={getImageUrl(club.coverUrl)} alt="Обкладинка клубу" onError={e => {
            setCoverFailed(true);
          }} />) : (<div className="gm-cover-symbol" aria-hidden="true"></div>)}

          <span className="gm-hero-visibility">
            <FontAwesomeIcon icon={club.visibility === 'private' ? faLock : faGlobe} />
            {club.visibility === 'private'
              ? 'Приватний клуб'
              : 'Публічний клуб'}
          </span>
        </div>
        <div className="gm-hero-content">
          <div className="gm-hero-main">
            <div className="gm-hero-identity">
              <div className="gm-hero-copy"><span className="gm-category-pill">{club.categoryName || 'Спільнота'}</span><h1>{club.name}</h1><p className="gm-hero-description">{club.description || 'Опис клубу поки не додано.'}</p></div>
            </div>
            <div className="gm-hero-actions">
              {isMember && (<Link to={`/activity?club=${encodeURIComponent(id)}`} className="gm-outline-button">
                <FontAwesomeIcon icon={faComments} />
                Звіти учасників
              </Link>)}              {canManageClub ? <button className="gm-outline-button" type="button" onClick={() => setTab('settings')}><FontAwesomeIcon icon={faGear} /> Керування</button> : club.isMember ? <button className="gm-outline-button" type="button" disabled={busy} onClick={() => { askConfirm('Залишити клуб?', `Ви впевнені, що хочете залишити клуб «${club.name}»?`, () => changeMembership()); }}>Залишити клуб</button> : club.visibility === 'private' ? <button className="clubs-button-primary" type="button" disabled={busy || requestSent} onClick={() => setShowJoinForm(true)}><FontAwesomeIcon icon={faUserPlus} /> {requestSent ? 'Заявку надіслано' : 'Подати заявку'}</button> : <button className="clubs-button-primary" type="button" disabled={busy} onClick={() => changeMembership()}><FontAwesomeIcon icon={faUserPlus} /> Приєднатися</button>}
            </div>
          </div>
          <div className="gm-hero-stats">
            <span><FontAwesomeIcon icon={faUsers} /> <strong>{club.membersCount ?? members.length}</strong> учасників</span>
            <span><FontAwesomeIcon icon={faCalendarDays} /> Створено {dateText(club.createdAt)}</span>
            <span><FontAwesomeIcon icon={faShieldHalved} /> {club.visibility === 'private' ? 'Приватна спільнота' : 'Відкрита спільнота'}</span>
            {canManageClub && <span className="gm-owner-inline"><FontAwesomeIcon icon={faCheck} /> {isOwner ? 'Ви власник' : 'Ви модератор'}</span>}
          </div>
        </div>
      </section>
      {error && <div className="clubs-alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Закрити"><FontAwesomeIcon icon={faXmark} /></button></div>}
      <div className="gm-detail-tabs" role="tablist" aria-label="Розділи клубу">{tabs.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => {
        if (tab !== t.id) {
          setTab(t.id);
          requestAnimationFrame(() => document.querySelector('.gm-detail-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }
      }}>{t.label}</button>)}</div>
      <div className={`gm-detail-layout ${tab === 'announcements' ? 'gm-detail-layout-feed' : ''}`}>
        <div className="gm-detail-primary">
          {tab === 'announcements' && (<ClubAnnouncements clubId={id} canManage={canManageClub} isMember={isMember} groupGoals={announcementGoals} />)}
          {tab === 'events' && (<ClubEvents clubId={club.id} canManage={canManageClub} isMember={isMember} onUserStatsChanged={onUserStatsChanged} />)}
          {tab === 'rating' && isMember && (<ClubRating clubId={club.id} />)}          {tab === 'about' && <>
            <section className="gm-panel gm-about-panel">
              <div className="gm-panel-heading"><h2>Про клуб</h2><span className="gm-small-label">{club.categoryName}</span></div>
              <ExpandableClubText text={club.description} empty="Опис поки не додано." lines={6} label="опис" />
              <div className="gm-panel-divider" />
              <h3>Правила клубу</h3>
              <ExpandableClubText text={club.rules} empty="Правила клубу поки не додано." lines={8} label="правила" />
            </section>
          </>}
          {tab === 'groupGoals' && isMember && (<ClubGroupGoals clubId={id} canManage={canManageClub} onUserStatsChanged={onUserStatsChanged} />)}
          {tab === 'members' && isMember && (<section className="gm-panel gm-members-panel">
            <div className="gm-panel-heading"><h2>Учасники клубу</h2><span className="gm-small-label">{members.length} учасників</span></div>
            <p className="gm-panel-description">Переглядай учасників спільноти та їхні ролі.</p>
            {members.length === 0 ? <p className="gm-panel-description">Учасників поки немає.</p> : (<div className="club-management-members">
              {members.map(member => (<article className="club-management-member gm-member-item" key={member.userId}>
                <div className="clubs-member-avatar gm-member-avatar">
                  {member.avatarUrl ? <img src={getImageUrl(member.avatarUrl)} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} /> : null}
                  <span aria-hidden="true">{displayName(member).slice(0, 1).toUpperCase()}</span>
                </div>
                <div className="gm-member-info">
                  <strong>{displayName(member)}</strong>
                  <small>@{member.username} · {roleName(member.role)}</small>
                  <small>У клубі з {dateText(member.joinedAt)}</small>
                </div>
                {(canChangeRole(member) || canManageMember(member)) && (<div className="gm-member-actions">
                  {canChangeRole(member) && <button type="button" className="clubs-button-secondary" disabled={busyMemberId === member.userId} onClick={() => changeMemberRole(member, ['admin', 'moderator'].includes(member.role) ? 'member' : 'admin')}>
                    {['admin', 'moderator'].includes(member.role) ? 'Зняти модератора' : 'Призначити модератором'}
                  </button>}
                  {canManageMember(member) && <button type="button" className="club-management-danger" disabled={busyMemberId === member.userId} onClick={() => kickMember(member)}>Виключити</button>}
                </div>)}
              </article>))}
            </div>)}
          </section>)}
          {tab === 'requests' && canManageClub && club.visibility === 'private' && <section className="gm-panel"><h2>Заявки на вступ</h2>{requests.length === 0 ? <p className="gm-panel-description">Нових заявок поки немає.</p> : <div className="club-management-request-list">{requests.map(r => <article className="club-management-request" key={r.id}><div><strong>{r.username}</strong><small>{dateText(r.createdAt)}</small>{r.message && <p>{r.message}</p>}</div><div className="club-management-request-actions"><button className="clubs-button-primary" disabled={busyRequestId === r.id} onClick={() => reviewRequest(r.id, 'accepted')}>Прийняти</button><button className="clubs-button-secondary" disabled={busyRequestId === r.id} onClick={() => reviewRequest(r.id, 'rejected')}>Відхилити</button></div></article>)}</div>}</section>}
          {tab === 'settings' && canManageClub && <section className="gm-panel gm-settings-panel">
            <h2>Керування клубом</h2>
            <div className="club-management-settings-row"><div><h3>Інформація про клуб</h3><p>Назва, опис, категорія, обкладинка та правила.</p></div><button className="clubs-button-secondary" disabled={busy} onClick={openEdit}><FontAwesomeIcon icon={faPen} /> Редагувати</button></div>
            {isOwner && <>
              <div className="club-management-settings-row">
                <div>
                  <h3>Передача власності</h3>
                  <p>Виберіть активного учасника, якому хочете передати клуб.</p>
                </div>
                <div className="club-management-transfer">
                  <CustomSelect value={newOwnerId} onChange={setNewOwnerId} placeholder="Оберіть учасника" disabled={busy} options={otherMembers.map(member => ({
                    value: String(member.userId),
                    label: displayName(member),
                  }))} />
                  <button className="clubs-button-secondary" disabled={busy || !newOwnerId} onClick={transferOwnership}><FontAwesomeIcon icon={faUserGear} /> Передати</button>
                </div>
              </div>
              <div className="club-management-settings-row"><div><h3>Видалення клубу</h3><p>Цю дію неможливо скасувати.</p></div><button className="club-management-danger" disabled={busy} onClick={removeClub}><FontAwesomeIcon icon={faTrash} /> Видалити клуб</button></div>
            </>}
          </section>}
        </div>

      </div>
    </>}
    {showJoinForm && club && <div className="clubs-modal-backdrop" onMouseDown={e => {
      if (e.target === e.currentTarget && !busy)
        setShowJoinForm(false);
    }}><section className="clubs-modal club-management-small-modal" role="dialog" aria-modal="true" aria-labelledby="join-club-title"><header className="clubs-modal-heading"><div><h2 id="join-club-title">Заявка на вступ</h2><p>Клуб «{club.name}» — приватний.</p></div><button className="clubs-icon-button" disabled={busy} onClick={() => setShowJoinForm(false)} aria-label="Закрити"><FontAwesomeIcon icon={faXmark} /></button></header><form className="clubs-modal-form" onSubmit={e => { e.preventDefault(); changeMembership(joinMessage); }}><label>Повідомлення власнику (необов’язково)<textarea rows={4} maxLength={1000} value={joinMessage} onChange={e => setJoinMessage(e.target.value)} placeholder="Чому ви хочете приєднатися?" /></label><div className="clubs-modal-actions"><button type="button" className="clubs-button-secondary" disabled={busy} onClick={() => setShowJoinForm(false)}>Скасувати</button><button type="submit" className="clubs-button-primary" disabled={busy}>{busy ? 'Надсилання...' : 'Надіслати заявку'}</button></div></form></section></div>}
    <ConfirmDialog open={dialog?.mode === 'confirm'} mode="confirm" title={dialog?.title} message={dialog?.message} variant={dialog?.variant} loading={Boolean(dialog?.loading)} confirmText="Підтвердити" onCancel={() => !dialog?.loading && setDialog(null)} onConfirm={runConfirmed} />
    {showEdit && club && <EditClubModal club={club} categories={categories} interestIds={interestIds} onClose={() => setShowEdit(false)} onSave={saveClub} saving={busy} error={editError} />}
  </main>;
}