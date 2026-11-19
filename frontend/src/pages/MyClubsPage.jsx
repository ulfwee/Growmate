import '../css/MyClubsPage.css';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faArrowRight, faComments, faUsers } from '@fortawesome/free-solid-svg-icons';
import SimpleClubCard from '../components/clubs/SimpleClubCard';
import CreateClubModal from '../components/clubs/CreateClubModal';
import { getClubs, getClubCategories, createClub } from '../services/clubsService';
export default function MyClubsPage() {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tab, setTab] = useState('mine');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.allSettled([getClubs(), getClubCategories()])
      .then(([a, b]) => {
        if (!active)
          return;
        if (a.status === 'fulfilled')
          setClubs(Array.isArray(a.value) ? a.value : []);
        else
          setError(a.reason?.message || 'Не вдалося завантажити клуби.');
        if (b.status === 'fulfilled')
          setCategories(Array.isArray(b.value) ? b.value : []);
      })
      .finally(() => {
        if (active)
          setLoading(false);
      });
    return () => { active = false; };
  }, []);
  const mine = useMemo(() => clubs.filter((c) => c.isMember || c.isOwner), [clubs]);
  const owned = mine.filter((c) => c.isOwner);
  const shown = tab === 'owned' ? owned : mine;
  const save = async (payload) => {
    setSaving(true);
    setCreateError('');
    try {
      const result = await createClub(payload);
      if (!result?.clubId)
        throw Error('Сервер не повернув ID клубу.');
      navigate(`/clubs/${result.clubId}`);
    }
    catch (e) {
      setCreateError(e.message);
    }
    finally {
      setSaving(false);
    }
  };
  return (<main className="clubs-page gm-clubs-page gm-my-page">
    <div className="gm-page-heading">
      <div>
        <div className="gm-eyebrow">ВАШІ СПІЛЬНОТИ</div>
        <h1>Мої клуби</h1>
        <p>Зростайте разом із людьми, які поділяють ваші інтереси.</p>
      </div>
      <div className="gm-heading-actions">
        <Link to="/activity" className="gm-outline-button"><FontAwesomeIcon icon={faComments} /> Стрічка активності</Link>
        <button type="button" className="clubs-button-primary" onClick={() => setShowCreate(true)}><FontAwesomeIcon icon={faPlus} /> Створити клуб</button>
      </div>
    </div>
    <div className="gm-tabs">
      <button type="button" className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>Усі мої клуби <span>{mine.length}</span></button>
      <button type="button" className={tab === 'owned' ? 'active' : ''} onClick={() => setTab('owned')}>Створені мною <span>{owned.length}</span></button>
    </div>
    {error && <p className="gm-error" role="alert">{error}</p>}
    {loading ? (<div className="gm-empty">Завантаження клубів...</div>) : shown.length ? (<div className="gm-club-grid">{shown.map((c) => <SimpleClubCard key={c.id} club={c} />)}</div>) : (<div className="gm-empty">
      <FontAwesomeIcon icon={faUsers} />
      <h3>{tab === 'owned' ? 'Ви ще не створювали клубів' : 'Ви ще не приєдналися до клубів'}</h3>
      <p>Знайдіть клуб за інтересами або створіть власний.</p>
      <Link to="/clubs">Переглянути клуби <FontAwesomeIcon icon={faArrowRight} /></Link>
    </div>)}
    {showCreate && (<CreateClubModal categories={categories} onClose={() => setShowCreate(false)} onCreate={save} saving={saving} error={createError} />)}
  </main>);
}