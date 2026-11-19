import React, { useCallback, useEffect, useMemo, useState, } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTasks, createTask, editTask, setTaskStatus, deleteTask, getTaskGoals, } from '../services/tasksService';
import { getMyGroupGoalTasks, setGroupGoalTaskCompletion, } from '../services/groupGoalsService';
import TaskModal from '../components/tasks/TaskModal';
import TaskFilters from '../components/tasks/TaskFilters';
import TaskList from '../components/tasks/TaskList';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import { getTab } from '../components/tasks/taskUtils';
import '../css/Tasks.css';
export default function TasksPage({ onUserStatsChanged, }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [groupTasks, setGroupTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [tab, setTab] = useState('today');
  const [search, setSearch] = useState('');
  const [goalFilter, setGoalFilter] = useState('all');
  const [modalTask, setModalTask] = useState(undefined);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  const reload = useCallback(async () => {
    const [personalData, goalData, groupData] = await Promise.all([
      getTasks(),
      getTaskGoals(),
      getMyGroupGoalTasks(),
    ]);
    setTasks(Array.isArray(personalData) ? personalData : []);
    setGoals(Array.isArray(goalData) ? goalData : []);
    setGroupTasks(Array.isArray(groupData) ? groupData : []);
  }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [personalData, goalData, groupData] = await Promise.all([
          getTasks(),
          getTaskGoals(),
          getMyGroupGoalTasks(),
        ]);
        if (!active)
          return;
        setTasks(Array.isArray(personalData) ? personalData : []);
        setGoals(Array.isArray(goalData) ? goalData : []);
        setGroupTasks(Array.isArray(groupData) ? groupData : []);
      }
      catch (err) {
        if (active) {
          setError(err.message ||
            'Не вдалося завантажити завдання.');
        }
      }
      finally {
        if (active)
          setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);
  const allTasks = useMemo(() => {
    const personal = tasks.map(task => ({
      ...task,
      source: 'personal',
      uniqueId: `personal-${task.id}`,
    }));
    const group = groupTasks.map(task => ({
      ...task,
      source: 'group',
      uniqueId: `group-${task.groupGoalId}-${task.id}`,
      status: task.isCompleted
        ? 'completed'
        : 'pending',
      isRecurring: false,
      priority: 'medium',
      goalTitle: task.groupGoalTitle || task.goalTitle || '',
    }));
    return [...personal, ...group];
  }, [tasks, groupTasks]);
  const filtered = useMemo(() => {
    return allTasks.filter(task => {
      if (tab !== 'all' &&
        getTab(task) !== tab) {
        return false;
      }
      if (goalFilter === 'none') {
        if (task.source === 'group' ||
          task.goalId != null) {
          return false;
        }
      }
      else if (goalFilter === 'group') {
        if (task.source !== 'group')
          return false;
      }
      else if (goalFilter !== 'all' &&
        goalFilter !== 'none') {
        if (task.source === 'group' ||
          String(task.goalId) !== goalFilter) {
          return false;
        }
      }
      const searchable = [
        task.title,
        task.description,
        task.goalTitle,
        task.milestoneTitle,
        task.clubName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('uk');
      return searchable.includes(search.toLocaleLowerCase('uk'));
    });
  }, [allTasks, tab, search, goalFilter]);
  const safeRefreshStats = async () => {
    try {
      if (typeof onUserStatsChanged === 'function') {
        await onUserStatsChanged();
      }
    }
    catch (err) {
      console.error('Не вдалося оновити статистику:', err);
    }
  };
  const handleOccurrenceChanged = async () => {
    setRefreshVersion(value => value + 1);
    try {
      await reload();
      setError('');
    }
    catch (err) {
      setError(err.message);
    }
    await safeRefreshStats();
  };
  const handleSave = async (data) => {
    setSaving(true);
    setError('');
    const editing = Boolean(modalTask);
    try {
      if (editing) {
        await editTask(modalTask.id, data);
      }
      else {
        await createTask(data);
      }
      setModalTask(undefined);
      setRefreshVersion(value => value + 1);
      showToast(editing
        ? 'Завдання успішно оновлено.'
        : 'Завдання успішно створено.');
      try {
        await reload();
      }
      catch (err) {
        setError(err.message);
      }
      await safeRefreshStats();
    }
    finally {
      setSaving(false);
    }
  };
  const handleToggle = async (task) => {
    if (task.isRecurring || busyId !== null)
      return;
    setBusyId(`personal-${task.id}`);
    setError('');
    try {
      const nextStatus = task.status === 'completed'
        ? 'pending'
        : 'completed';
      await setTaskStatus(task.id, nextStatus);
      showToast(nextStatus === 'completed' ? 'Завдання виконано.' : 'Завдання повернуто до виконання.');
      await reload();
      await safeRefreshStats();
    }
    catch (err) {
      showToast(err.message || 'Не вдалося змінити статус завдання.', 'error');
    }
    finally {
      setBusyId(null);
    }
  };
  const handleGroupToggle = async (task) => {
    if (busyId !== null)
      return;
    const key = `group-${task.groupGoalId}-${task.id}`;
    setBusyId(key);
    setError('');
    try {
      await setGroupGoalTaskCompletion(task.clubId, task.groupGoalId, task.id, !task.isCompleted);
      showToast(task.isCompleted ? 'Групове завдання повернуто до виконання.' : 'Групове завдання виконано.');
      await reload();
      await safeRefreshStats();
    }
    catch (err) {
      showToast(err.message || 'Не вдалося оновити групове завдання.', 'error');
    }
    finally {
      setBusyId(null);
    }
  };
  const confirmDeleteTask = async () => {
    if (!taskToDelete || deleting)
      return;
    const taskId = taskToDelete.id;
    setDeleting(true);
    setBusyId(`personal-${taskId}`);
    setError('');
    try {
      await deleteTask(taskId);
      setTaskToDelete(null);
      showToast('Завдання видалено.');
      try {
        await reload();
      }
      catch (err) {
        setError(err.message);
      }
      await safeRefreshStats();
    }
    catch (err) {
      showToast(err.message || 'Не вдалося видалити завдання.', 'error');
    }
    finally {
      setDeleting(false);
      setBusyId(null);
    }
  };
  const openGroupGoal = task => {
    navigate(`/clubs/${task.clubId}/group-goals/${task.groupGoalId}`);
  };
  return (<main className="tasks-page">
    <div className="tasks-page-heading">
      <div>
        <h1>Мої завдання</h1>
        <p>
          Плануй справи, виконуй особисті та
          групові завдання й відстежуй прогрес.
        </p>
      </div>

      <button type="button" className="tasks-button-primary tasks-add-main" onClick={() => setModalTask(null)}>
        + Додати завдання
      </button>
    </div>

    <section className="tasks-panel">
      <TaskFilters tab={tab} onTabChange={setTab} search={search} onSearchChange={setSearch} goalFilter={goalFilter} onGoalFilterChange={setGoalFilter} goals={goals} />

      {error && (<div className="tasks-form-error" role="alert">
        <span>{error}</span>

        <button type="button" onClick={async () => {
          setError('');
          try {
            await reload();
          }
          catch (err) {
            setError(err.message);
          }
        }}>
          Повторити
        </button>
      </div>)}

      {loading ? (<div className="tasks-empty">
        Завантаження завдань...
      </div>) : filtered.length === 0 ? (<div className="tasks-empty">
        <h3>Завдань немає</h3>
        <p>
          Створи завдання, долучися до групової
          цілі або зміни фільтри.
        </p>
      </div>) : (<TaskList tasks={filtered} goals={goals} busyId={busyId} refreshVersion={refreshVersion} onToggle={handleToggle} onGroupToggle={handleGroupToggle} onOpenGroupGoal={openGroupGoal} onEdit={setModalTask} onDelete={setTaskToDelete} onOccurrenceChanged={handleOccurrenceChanged} />)}

      <button type="button" className="tasks-add-bottom" onClick={() => setModalTask(null)}>
        + Додати ще одне завдання
      </button>
    </section>

    {modalTask !== undefined && (<TaskModal key={modalTask?.id ?? 'new'} task={modalTask} goals={goals} saving={saving} onClose={() => {
      if (!saving)
        setModalTask(undefined);
    }} onSave={handleSave} />)}

    <ConfirmDialog open={taskToDelete !== null} title="Видалити завдання?" message={taskToDelete
      ? `Видалити завдання «${taskToDelete.title}»? Цю дію неможливо скасувати.`
      : ''} confirmText="Видалити завдання" variant="danger" loading={deleting} onCancel={() => {
        if (!deleting)
          setTaskToDelete(null);
      }} onConfirm={confirmDeleteTask} />
  </main>);
}