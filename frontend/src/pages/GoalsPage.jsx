import React, { useCallback, useEffect, useMemo, useState, } from 'react';
import GoalCard from '../components/goals/GoalCard';
import GoalModal from '../components/goals/GoalModal';
import ConfirmDialog from '../components/ConfirmDialog';
import CustomSelect from '../components/CustomSelect';
import { useToast } from '../components/ToastProvider';
import MyGroupGoals from '../components/groupGoals/MyGroupGoals';
import { getGoals, createGoal, updateGoal, deleteGoal, } from '../services/goalsService';
import '../css/Goals.css';
const FILTERS = [
  { value: 'all', label: 'Усі цілі' },
  { value: 'active', label: 'Активні' },
  { value: 'planned', label: 'Заплановані' },
  { value: 'completed', label: 'Досягнуті' },
  { value: 'cancelled', label: 'Скасовані' },
];
export default function GoalsPage({ user, onLogout, onUserStatsChanged, }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('personal');
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState('cards');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const loadGoals = useCallback(async (showLoader = false) => {
    if (showLoader)
      setLoading(true);
    try {
      const data = await getGoals();
      setGoals(Array.isArray(data) ? data : []);
      setError('');
    }
    catch (err) {
      setError(err.message || 'Не вдалося завантажити цілі.');
    }
    finally {
      if (showLoader)
        setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadGoals(true);
  }, [loadGoals]);
  const counts = useMemo(() => ({
    all: goals.length,
    active: goals.filter(g => g.status === 'active').length,
    planned: goals.filter(g => g.status === 'planned').length,
    completed: goals.filter(g => g.status === 'completed').length,
  }), [goals]);
  const visibleGoals = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('uk');
    return goals
      .filter(goal => filter === 'all' || goal.status === filter)
      .filter(goal => {
        if (!query)
          return true;
        return ((goal.title || '').toLocaleLowerCase('uk').includes(query) ||
          (goal.description || '').toLocaleLowerCase('uk').includes(query));
      })
      .sort((a, b) => {
        if (sort === 'oldest') {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }
        if (sort === 'deadline') {
          return (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31');
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [goals, search, filter, sort]);
  const openCreate = () => {
    setEditingGoal(null);
    setModalOpen(true);
  };
  const openEdit = goal => {
    setEditingGoal(goal);
    setModalOpen(true);
  };
  const handleSaveGoal = async (formData) => {
    if (saving)
      return;
    const isEditing = Boolean(editingGoal);
    setSaving(true);
    setError('');
    try {
      if (isEditing)
        await updateGoal(editingGoal.id, formData);
      else
        await createGoal(formData);
      setModalOpen(false);
      setEditingGoal(null);
      showToast(isEditing ? 'Ціль успішно оновлено.' : 'Ціль успішно створено.');
      await loadGoals();
      try {
        await onUserStatsChanged?.();
      }
      catch (err) {
        console.error(err);
      }
    }
    catch (err) {
      showToast(err.message || 'Не вдалося зберегти ціль.', 'error');
    }
    finally {
      setSaving(false);
    }
  };
  const confirmDeleteGoal = async () => {
    if (!goalToDelete || deleting)
      return;
    setDeleting(true);
    setError('');
    try {
      await deleteGoal(goalToDelete.id);
      setGoals(current => current.filter(goal => goal.id !== goalToDelete.id));
      setGoalToDelete(null);
      showToast('Ціль успішно видалено.');
      await loadGoals();
    }
    catch (err) {
      showToast(err.message || 'Не вдалося видалити ціль.', 'error');
    }
    finally {
      setDeleting(false);
    }
  };
  return (<div className="goals-page">
    <main className="goals-main">

      <section className="goals-heading">
        <div>
          <span className="goals-eyebrow">
            ТВІЙ ПРОГРЕС
          </span>

          <h1>Мої цілі</h1>

          <p>
            Великі досягнення починаються з маленьких кроків.
          </p>
        </div>

        {activeTab === 'personal' && (<button type="button" className="goals-primary-btn" onClick={openCreate}>
          <span aria-hidden="true">＋</span>
          Створити ціль
        </button>)}
      </section>

      <div className="goals-tabs" role="tablist" aria-label="Тип цілей">
        <button type="button" role="tab" aria-selected={activeTab === 'personal'} className={activeTab === 'personal' ? 'active' : ''} onClick={() => setActiveTab('personal')}>
          Особисті цілі
        </button>

        <button type="button" role="tab" aria-selected={activeTab === 'group'} className={activeTab === 'group' ? 'active' : ''} onClick={() => setActiveTab('group')}>
          Групові цілі
        </button>
      </div>

      {activeTab === 'personal' ? (<>
        <section className="goals-stats" aria-label="Статистика особистих цілей">
          <div className="goals-stat">
            <strong>{counts.all}</strong>
            <span>Усього</span>
          </div>

          <div className="goals-stat-divider" />

          <div className="goals-stat">
            <strong>{counts.active}</strong>
            <span>Активні</span>
          </div>

          <div className="goals-stat-divider" />

          <div className="goals-stat">
            <strong>{counts.planned}</strong>
            <span>Заплановані</span>
          </div>

          <div className="goals-stat-divider" />

          <div className="goals-stat">
            <strong>{counts.completed}</strong>
            <span>Досягнуті</span>
          </div>
        </section>

        <section className="goals-toolbar">
          <label className="goals-search">
            <span aria-hidden="true">⌕</span>

            <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Знайти ціль..." aria-label="Знайти ціль" />
          </label>

          <div className="goals-toolbar-right">
            <div className="goals-view-switch" role="group" aria-label="Вигляд цілей">
              <button type="button" className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')} title="Картки" aria-pressed={viewMode === 'cards'}>
                ▦
              </button>

              <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} title="Список" aria-pressed={viewMode === 'list'}>
                ☰
              </button>
            </div>

            <div className="goals-toolbar-selects">
              <CustomSelect className="goals-custom-select" value={filter} onChange={setFilter} options={FILTERS} placeholder="Фільтр цілей" />

              <CustomSelect className="goals-custom-select" value={sort} onChange={setSort} options={[
                { value: 'newest', label: 'Спочатку нові' },
                { value: 'oldest', label: 'Спочатку старі' },
                { value: 'deadline', label: 'За дедлайном' },
              ]} placeholder="Сортування цілей" />
            </div>
          </div>
        </section>

        <section className="goals-list-section">
          <div className="goals-list-heading">
            <h2>Твої особисті цілі</h2>

            <span>
              {visibleGoals.length}{' '}
              {visibleGoals.length === 1
                ? 'результат'
                : 'результатів'}
            </span>
          </div>

          {loading ? (<div className="goals-state">
            Завантаження цілей...
          </div>) : error && goals.length === 0 ? (<div className="goals-state goals-error">
            {error}

            <button type="button" onClick={() => loadGoals(true)}>
              Спробувати ще раз
            </button>
          </div>) : (<>
            {error && (<div className="goals-state goals-error">
              {error}

              <button type="button" onClick={() => loadGoals()}>
                Повторити
              </button>
            </div>)}

            {visibleGoals.length === 0 ? (<div className="goals-empty">
              <div className="goals-empty-icon">◎</div>

              <h3>
                {goals.length
                  ? 'Нічого не знайдено'
                  : 'Поки що немає цілей'}
              </h3>

              <p>
                {goals.length
                  ? 'Спробуй змінити пошук або фільтр.'
                  : 'Створи першу ціль і розбий її на маленькі кроки.'}
              </p>

              {!goals.length && (<button type="button" className="goals-primary-btn" onClick={openCreate}>
                Створити ціль
              </button>)}
            </div>) : (<div className={viewMode === 'cards'
              ? 'goals-grid'
              : 'goals-list'}>
              {visibleGoals.map(goal => (<GoalCard key={goal.id} goal={goal} viewMode={viewMode} onEdit={() => openEdit(goal)} onDelete={() => setGoalToDelete(goal)} onChanged={async () => {
                await loadGoals();
                await onUserStatsChanged?.();
              }} />))}
            </div>)}
          </>)}
        </section>
      </>) : (<section className="goals-group-section">
        <MyGroupGoals />
      </section>)}
    </main>

    <ConfirmDialog open={goalToDelete !== null} title="Видалити ціль?" message={goalToDelete
      ? `Ви впевнені, що хочете видалити ціль «${goalToDelete.title}»? Етапи цієї цілі також будуть видалені.`
      : ''} confirmText="Видалити ціль" variant="danger" loading={deleting} onCancel={() => {
        if (!deleting)
          setGoalToDelete(null);
      }} onConfirm={confirmDeleteGoal} />

    {modalOpen && (<GoalModal goal={editingGoal} saving={saving} onClose={() => {
      if (saving)
        return;
      setModalOpen(false);
      setEditingGoal(null);
    }} onSave={handleSaveGoal} />)}
  </div>);
}