import React, { useCallback, useEffect, useState, } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getClub } from '../services/clubsService';
import { getGroupGoal, getGroupGoalTasks, createGroupGoalTask, updateGroupGoalTask, deleteGroupGoalTask, setGroupGoalTaskCompletion, joinGroupGoal, leaveGroupGoal, } from '../services/groupGoalsService';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import GroupGoalTaskModal from '../components/groupGoals/GroupGoalTaskModal';
import '../css/GroupGoalDetails.css';
const STATUS_LABELS = {
    planned: 'Запланована',
    active: 'Активна',
    completed: 'Завершена',
    cancelled: 'Скасована',
};
const formatDate = value => value
    ? new Date(`${value.slice(0, 10)}T12:00:00`)
        .toLocaleDateString('uk-UA')
    : '—';
const percentage = value => Math.max(0, Math.min(100, Number(value) || 0));
function ProgressBar({ label, value }) {
    const progress = percentage(value);
    return (<div className="ggd-progress">
        <div className="ggd-progress-heading">
            <span>{label}</span>
            <strong>{Math.round(progress)}%</strong>
        </div>

        <div className="ggd-progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div style={{ width: `${progress}%` }} />
        </div>
    </div>);
}
export default function GroupGoalDetailsPage({ onUserStatsChanged, }) {
    const { clubId, goalId } = useParams();
    const [club, setClub] = useState(null);
    const [goal, setGoal] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { showToast } = useToast();
    const [editorTask, setEditorTask] = useState(undefined);
    const [saving, setSaving] = useState(false);
    const [busyTaskId, setBusyTaskId] = useState(null);
    const [busyMembership, setBusyMembership] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const isParticipant = Boolean(goal?.isParticipant);
    const isClosed = ['completed', 'cancelled'].includes(goal?.status);
    const canManage = Boolean(club?.isOwner) ||
        ['owner', 'admin', 'moderator'].includes(club?.myRole);
    const canEditTasks = canManage && !isClosed;
    const loadData = useCallback(async () => {
        const [clubData, goalData, taskData] = await Promise.all([
            getClub(clubId),
            getGroupGoal(clubId, goalId),
            getGroupGoalTasks(clubId, goalId),
        ]);
        setClub(clubData);
        setGoal(goalData);
        setTasks(Array.isArray(taskData) ? taskData : []);
    }, [clubId, goalId]);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        Promise.all([
            getClub(clubId),
            getGroupGoal(clubId, goalId),
            getGroupGoalTasks(clubId, goalId),
        ])
            .then(([clubData, goalData, taskData]) => {
                if (!active)
                    return;
                setClub(clubData);
                setGoal(goalData);
                setTasks(Array.isArray(taskData) ? taskData : []);
            })
            .catch(err => {
                if (active) {
                    setError(err.message || 'Не вдалося завантажити ціль.');
                }
            })
            .finally(() => {
                if (active)
                    setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [clubId, goalId]);
    const refreshStats = async () => {
        try {
            await onUserStatsChanged?.();
        }
        catch (err) {
            console.error('Помилка оновлення статистики:', err);
        }
    };
    const saveTask = async (data) => {
        if (!canEditTasks)
            return;
        setSaving(true);
        setError('');
        try {
            if (editorTask) {
                await updateGroupGoalTask(clubId, goalId, editorTask.id, data);
            }
            else {
                await createGroupGoalTask(clubId, goalId, data);
            }
            await loadData();
            setEditorTask(undefined);
            showToast('Завдання успішно збережено.');
        }
        finally {
            setSaving(false);
        }
    };
    const toggleTask = async (task) => {
        if (!isParticipant ||
            isClosed ||
            busyTaskId !== null) {
            return;
        }
        setBusyTaskId(task.id);
        setError('');
        try {
            await setGroupGoalTaskCompletion(clubId, goalId, task.id, !task.isCompleted);
            await loadData();
            await refreshStats();
        }
        catch (err) {
            setError(err.message || 'Не вдалося оновити виконання завдання.');
        }
        finally {
            setBusyTaskId(null);
        }
    };
    const removeTask = async () => {
        if (!taskToDelete ||
            !canEditTasks ||
            busyTaskId !== null) {
            return;
        }
        setBusyTaskId(taskToDelete.id);
        setError('');
        try {
            await deleteGroupGoalTask(clubId, goalId, taskToDelete.id);
            await loadData();
            setTaskToDelete(null);
            showToast('Завдання видалено.');
        }
        catch (err) {
            setError(err.message || 'Не вдалося видалити завдання.');
        }
        finally {
            setBusyTaskId(null);
        }
    };
    const toggleMembership = async () => {
        if (busyMembership)
            return;
        setBusyMembership(true);
        setError('');
        try {
            if (isParticipant) {
                await leaveGroupGoal(clubId, goalId);
                showToast('Ви залишили групову ціль.');
            }
            else {
                await joinGroupGoal(clubId, goalId);
                showToast('Ви долучилися до групової цілі.');
            }
            await loadData();
            await refreshStats();
        }
        catch (err) {
            setError(err.message || 'Не вдалося змінити участь у цілі.');
        }
        finally {
            setBusyMembership(false);
            setConfirmLeave(false);
        }
    };
    if (loading) {
        return (<main className="ggd-page">
            <div className="ggd-loading">
                Завантаження групової цілі...
            </div>
        </main>);
    }
    if (!goal) {
        return (<main className="ggd-page">
            <Link to={`/clubs/${clubId}`} className="ggd-back">
                ← Назад до клубу
            </Link>

            <div className="ggd-alert">
                {error || 'Групову ціль не знайдено.'}
            </div>
        </main>);
    }
    const completedCount = tasks.filter(task => task.isCompleted).length;
    const participants = Array.isArray(goal.participants)
        ? goal.participants
        : [];
    return (<main className="ggd-page">
        <Link to={`/clubs/${clubId}`} className="ggd-back">
            ← Назад до клубу
        </Link>

        <section className="ggd-hero">
            <div className="ggd-hero-main">
                <div className="ggd-tags">
                    <span className="ggd-tag">
                        {STATUS_LABELS[goal.status] || goal.status}
                    </span>

                    {isParticipant && (<span className="ggd-tag ggd-tag-joined">
                        Ви берете участь
                    </span>)}
                </div>

                <h1>{goal.title}</h1>

                <p className="ggd-description">
                    {goal.description || 'Опис цілі поки не додано.'}
                </p>

                <div className="ggd-hero-meta">
                    <span>Клуб: {club?.name || '—'}</span>
                    <span>Початок: {formatDate(goal.startDate)}</span>
                    <span>Дедлайн: {formatDate(goal.endDate)}</span>
                </div>
            </div>

            <div className="ggd-hero-actions">
                {isParticipant ? (<button type="button" className="ggd-button-outline" disabled={busyMembership} onClick={() => setConfirmLeave(true)}>
                    Залишити ціль
                </button>) : goal.status === 'active' ? (<button type="button" className="ggd-button-primary" disabled={busyMembership} onClick={toggleMembership}>
                    {busyMembership
                        ? 'Зачекайте...'
                        : 'Долучитися до цілі'}
                </button>) : null}
            </div>
        </section>

        {error && (<div className="ggd-alert" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Закрити повідомлення">
                ×
            </button>
        </div>)}

        <div className="ggd-layout">
            <div className="ggd-main">



                <section className="ggd-panel">
                    <div className="ggd-panel-header">
                        <div>
                            <h2>Прогрес виконання</h2>
                            <p>
                                Результати учасників групової цілі
                            </p>
                        </div>
                    </div>

                    <div className="ggd-progress-list">
                        <ProgressBar label="Загальний прогрес клубу" value={goal.progress} />

                        {isParticipant && (<ProgressBar label="Мій особистий прогрес" value={goal.myProgress} />)}
                    </div>
                </section>



                <section className="ggd-panel">
                    <div className="ggd-panel-header">
                        <div>
                            <h2>Завдання цілі</h2>

                            <p>
                                {isParticipant
                                    ? `Виконано ${completedCount} із ${tasks.length}`
                                    : 'Долучіться до цілі, щоб відмічати виконання.'}
                            </p>
                        </div>

                        {canEditTasks && editorTask === undefined && (<button type="button" className="ggd-button-primary" onClick={() => setEditorTask(null)}>
                            + Додати завдання
                        </button>)}
                    </div>

                    {tasks.length === 0 ? (<div className="ggd-empty">
                        <h3>Завдань поки немає</h3>

                        <p>
                            {canEditTasks
                                ? 'Створіть перше завдання для учасників.'
                                : 'Для цієї цілі ще немає завдань.'}
                        </p>
                    </div>) : (<div className="ggd-task-list">
                        {tasks.map((task, index) => (<article key={task.id} className={`ggd-task ${task.isCompleted ? 'is-done' : ''}`}>
                            <div className="ggd-task-check">
                                <input type="checkbox" checked={Boolean(task.isCompleted)} disabled={!isParticipant ||
                                    isClosed ||
                                    busyTaskId !== null} onChange={() => toggleTask(task)} aria-label={`Виконано: ${task.title}`} />
                            </div>

                            <div className="ggd-task-body">
                                <div className="ggd-task-title">
                                    <span className="ggd-task-number">
                                        {index + 1}.
                                    </span>

                                    <h3>{task.title}</h3>
                                </div>

                                {task.description && (<p>{task.description}</p>)}

                                {task.dueDate && (<p className="ggd-task-date">
                                    {task.isCompleted
                                        ? 'Виконано'
                                        : task.dueDate.slice(0, 10) < new Date().toLocaleDateString('sv-SE')
                                            ? 'Прострочено'
                                            : task.dueDate.slice(0, 10) === new Date().toLocaleDateString('sv-SE')
                                                ? 'На сьогодні'
                                                : 'Заплановано'}
                                    {' · '}{formatDate(task.dueDate)}
                                </p>)}
                            </div>

                            {canEditTasks && (<div className="ggd-task-actions">
                                <button type="button" disabled={busyTaskId !== null || saving} onClick={() => setEditorTask(task)}>
                                    Редагувати
                                </button>

                                <button type="button" className="ggd-danger-text" disabled={busyTaskId !== null} onClick={() => setTaskToDelete(task)}>
                                    Видалити
                                </button>
                            </div>)}
                        </article>))}
                    </div>)}
                </section>
            </div>



            <aside className="ggd-sidebar">
                <section className="ggd-panel">
                    <h2>Статистика</h2>

                    <div className="ggd-stat-list">
                        <div>
                            <span>Учасників</span>
                            <strong>{goal.participantsCount ?? 0}</strong>
                        </div>

                        <div>
                            <span>Завдань</span>
                            <strong>{goal.tasksCount ?? tasks.length}</strong>
                        </div>

                        <div>
                            <span>Завершили всі завдання</span>
                            <strong>{goal.completedParticipants ?? 0}</strong>
                        </div>

                        <div>
                            <span>Загальний прогрес</span>
                            <strong>
                                {Math.round(percentage(goal.progress))}%
                            </strong>
                        </div>
                    </div>
                </section>

                <section className="ggd-panel">
                    <h2>Учасники цілі</h2>

                    {participants.length === 0 ? (<p className="ggd-muted">
                        Поки ніхто не долучився.
                    </p>) : (<div className="ggd-participants">
                        {participants.map(participant => (<div className="ggd-participant" key={participant.id}>
                            <div className="ggd-participant-avatar">
                                {String(participant.userId).slice(-2)}
                            </div>

                            <div className="ggd-participant-info">
                                <strong>
                                    Учасник #{participant.userId}
                                </strong>

                                <ProgressBar label="Прогрес" value={participant.progress} />
                            </div>
                        </div>))}
                    </div>)}
                </section>
            </aside>
        </div>

        <ConfirmDialog open={taskToDelete !== null} title="Видалити завдання?" message={taskToDelete
            ? `Видалити завдання «${taskToDelete.title}»? Усі відмітки виконання також будуть втрачені.`
            : ''} confirmText="Видалити" variant="danger" loading={busyTaskId !== null} onCancel={() => {
                if (busyTaskId === null)
                    setTaskToDelete(null);
            }} onConfirm={removeTask} />

        <ConfirmDialog open={confirmLeave} title="Залишити групову ціль?" message="Ви більше не будете учасником цієї цілі. Ваші відмітки виконання можуть бути втрачені." confirmText="Залишити ціль" variant="danger" loading={busyMembership} onCancel={() => {
            if (!busyMembership)
                setConfirmLeave(false);
        }} onConfirm={toggleMembership} />

        {editorTask !== undefined && canEditTasks && (<GroupGoalTaskModal key={editorTask?.id ?? 'new'} task={editorTask} goal={goal} saving={saving} onSave={saveTask} onClose={() => {
            if (!saving)
                setEditorTask(undefined);
        }} />)}
    </main>);
}