import React, { useEffect, useState } from 'react';
import '../../css/GroupGoalTaskModal.css';

export default function GroupGoalTaskModal({ task, goal, saving, onSave, onClose }) {
    const [title, setTitle] = useState(task?.title ?? '');
    const [description, setDescription] = useState(task?.description ?? '');
    const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? '');
    const [error, setError] = useState('');

    useEffect(() => {
        const handleEscape = event => {
            if (event.key === 'Escape' && !saving) onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [saving, onClose]);

    const handleSubmit = async event => {
        event.preventDefault();

        if (!title.trim()) {
            setError('Вкажіть назву завдання.');
            return;
        }
        if (!dueDate) {
            setError('Оберіть дату виконання завдання.');
            return;
        }
        if ((goal?.startDate && dueDate < goal.startDate.slice(0, 10)) ||
            (goal?.endDate && dueDate > goal.endDate.slice(0, 10))) {
            setError('Дата повинна належати періоду групової цілі.');
            return;
        }

        setError('');
        try {
            await onSave({
                title: title.trim(), description: description.trim() || null,
                dueDate, sortOrder: task?.sortOrder ?? 0,
            });
        } catch (err) {
            setError(err.message || 'Не вдалося зберегти завдання.');
        }
    };

    return (
        <div className="ggtm-backdrop" onMouseDown={event => {
            if (event.target === event.currentTarget && !saving) onClose();
        }}>
            <div className="ggtm-modal" role="dialog" aria-modal="true" aria-labelledby="ggtm-title">
                <div className="ggtm-header">
                    <div>
                        <h2 id="ggtm-title">{task ? 'Редагувати завдання' : 'Нове завдання'}</h2>
                        <p>Заплануйте одноразове завдання для учасників цілі.</p>
                    </div>
                    <button type="button" className="ggtm-close" onClick={onClose} disabled={saving} aria-label="Закрити">×</button>
                </div>

                <form onSubmit={handleSubmit} className="ggtm-form">
                    <label className="ggtm-field">
                        <span className="ggtm-field-label">Назва завдання <span className="ggtm-required">*</span></span>
                        <input type="text" value={title} onChange={event => setTitle(event.target.value)} placeholder="Наприклад, Опрацювати перший розділ" maxLength={200} required autoFocus />
                    </label>

                    <label className="ggtm-field">
                        <span className="ggtm-field-label">Опис (необов'язково)</span>
                        <textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Що саме потрібно виконати?" rows={4} />
                    </label>

                    <label className="ggtm-field">
                        <span className="ggtm-field-label">Дата завдання <span className="ggtm-required">*</span></span>
                        <input type="date" value={dueDate} min={goal?.startDate?.slice(0, 10)} max={goal?.endDate?.slice(0, 10)} onChange={event => setDueDate(event.target.value)} required />
                    </label>

                    {error && <p className="ggtm-error" role="alert">{error}</p>}
                    <div className="ggtm-actions">
                        <button type="button" className="ggtm-cancel" onClick={onClose} disabled={saving}>Скасувати</button>
                        <button type="submit" className="ggtm-save" disabled={saving}>
                            {saving ? 'Збереження...' : task ? 'Зберегти зміни' : 'Створити завдання'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}