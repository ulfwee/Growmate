import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPen, faBolt, faFire, faEnvelope, faCalendar, faCheck, faTimes, faSignOutAlt, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { deleteMe, updateProfileWithAvatar } from '../services/authService';
import { getInterests, getMyInterests, saveMyInterests } from '../services/interestsService';
import '../css/ProfilePage.css';
import ProfileAchievements from '../components/profile/ProfileAchievements';
import { useXp } from '../context/XpContext';
const MAX_INTERESTS = 5;
const makeForm = (user) => ({
    username: user?.username || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    avatarUrl: user?.avatarUrl || '',
    bio: user?.bio || '',
    birthDate: user?.birthDate ? String(user.birthDate).slice(0, 10) : '',
});
const displayName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'Користувач';
export default function ProfilePage({ user, onUserUpdated, onLogout }) {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { stats } = useXp();
    const totalXp = stats?.totalXp ?? user?.totalXp ?? 0;
    const currentStreak = stats?.currentStreak ?? user?.currentStreak ?? 0;
    const level = stats?.level ?? 1;
    const xpInLevel = stats?.xpInLevel ?? 0;
    const xpForNextLevel = stats?.xpForNextLevel ?? 100;
    const levelProgressPercent = stats?.levelProgressPercent ?? 0;
    const [form, setForm] = useState(() => makeForm(user));
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [interests, setInterests] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [draftIds, setDraftIds] = useState([]);
    const [editingInterests, setEditingInterests] = useState(false);
    const [interestLoading, setInterestLoading] = useState(true);
    const [interestSaving, setInterestSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    useEffect(() => {
        if (!editing)
            setForm(makeForm(user));
    }, [user, editing]);
    useEffect(() => {
        let active = true;
        Promise.allSettled([getInterests(), getMyInterests()]).then(([all, mine]) => {
            if (!active)
                return;
            if (all.status === 'fulfilled')
                setInterests(Array.isArray(all.value) ? all.value : []);
            if (mine.status === 'fulfilled') {
                const ids = (Array.isArray(mine.value) ? mine.value : []).map(x => Number(x.id));
                setSelectedIds(ids);
                setDraftIds(ids);
            }
            if (all.status === 'rejected' || mine.status === 'rejected')
                showToast('Не вдалося завантажити інтереси.', 'error');
        }).finally(() => {
            if (active)
                setInterestLoading(false);
        });
        return () => { active = false; };
    }, [showToast]);
    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };
    const handleAvatarChange = (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            showToast('Оберіть JPG, PNG або WEBP.', 'error');
            event.target.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('Фото не повинно перевищувати 5 МБ.', 'error');
            event.target.value = '';
            return;
        }
        if (avatarPreview)
            URL.revokeObjectURL(avatarPreview);
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };
    const openProfileEditor = () => {
        setForm(makeForm(user));
        setEditing(true);
    };
    const saveProfile = async (event) => {
        event.preventDefault();
        if (!form.username.trim()) {
            showToast('Вкажіть ім’я користувача.', 'error');
            return;
        }
        setSaving(true);
        try {
            await updateProfileWithAvatar({
                username: form.username.trim(),
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                bio: form.bio.trim(),
                birthDate: form.birthDate || '',
            }, avatarFile);
            await onUserUpdated?.();
            setEditing(false);
            setAvatarFile(null);
            if (avatarPreview) {
                URL.revokeObjectURL(avatarPreview);
                setAvatarPreview(null);
            }
            showToast('Профіль успішно оновлено.');
        }
        catch (error) {
            showToast(error.message || 'Не вдалося зберегти профіль.', 'error');
        }
        finally {
            setSaving(false);
        }
    };
    const openInterestsEditor = () => {
        setDraftIds([...selectedIds]);
        setEditingInterests(true);
    };
    const toggleInterest = (id) => {
        setDraftIds(prev => prev.includes(id)
            ? prev.filter(x => x !== id)
            : prev.length < MAX_INTERESTS ? [...prev, id] : prev);
    };
    const saveInterests = async () => {
        setInterestSaving(true);
        try {
            await saveMyInterests(draftIds);
            setSelectedIds([...draftIds]);
            setEditingInterests(false);
            showToast('Інтереси успішно оновлено.');
        }
        catch (error) {
            showToast(error.message || 'Не вдалося зберегти інтереси.', 'error');
        }
        finally {
            setInterestSaving(false);
        }
    };
    const deleteAccount = async () => {
        setDeleting(true);
        try {
            await deleteMe();
            setConfirmDelete(false);
            onLogout?.();
            navigate('/');
        }
        catch (error) {
            showToast(error.message || 'Не вдалося видалити акаунт.', 'error');
        }
        finally {
            setDeleting(false);
        }
    };
    useEffect(() => {
        if (!editing && !editingInterests && !confirmDelete)
            return;
        const onKeyDown = (event) => {
            if (event.key === 'Escape' && !saving && !interestSaving && !deleting) {
                setEditing(false);
                setEditingInterests(false);
                setConfirmDelete(false);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [editing, editingInterests, confirmDelete, saving, interestSaving, deleting]);
    const chosenInterests = interests.filter(x => selectedIds.includes(Number(x.id)));
    return (<main className="gm-profile-page">
        <div className="gm-profile-cover" aria-hidden="true">
            <span className="gm-cover-star gm-cover-star-1">✦</span>
            <span className="gm-cover-star gm-cover-star-2">✧</span>
            <span className="gm-cover-star gm-cover-star-3">✦</span>
        </div>

        <div className="gm-profile-identity">

            <div className="gm-profile-user">
                <div className="gm-profile-avatar">
                    {user?.avatarUrl ? (<img src={user.avatarUrl} alt="Аватар користувача" />) : (<FontAwesomeIcon icon={faUser} />)}
                </div>

                <div className="gm-profile-identity-text">
                    <h1>{displayName(user)}</h1>

                    <span>@{user?.username || 'username'}</span>

                    <p>
                        {user?.bio ||
                            'Розкажіть трохи про себе та свої цілі.'}
                    </p>
                </div>
            </div>

            <div className="gm-profile-stats">

                <div className="gm-profile-stat">
                    <FontAwesomeIcon icon={faFire} className="gm-stat-fire" />

                    <div>
                        <strong>{currentStreak} дн.</strong>
                    </div>
                </div>


                <div className="gm-profile-level">
                    <div className="gm-profile-level-heading">
                        <span className="gm-profile-level-star">✦</span>
                        <strong>Lv. {level}</strong>
                    </div>

                    <div className="gm-profile-level-progress">
                        <div className="gm-profile-level-track" role="progressbar" aria-label="Прогрес до наступного рівня" aria-valuenow={levelProgressPercent} aria-valuemin={0} aria-valuemax={100}>
                            <div className="gm-profile-level-fill" style={{
                                width: `${Math.min(100, Math.max(0, levelProgressPercent))}%`,
                            }} />
                        </div>

                        <span className="gm-profile-level-caption">
                            {xpInLevel} / {xpForNextLevel} XP
                        </span>
                    </div>
                </div>


                <div className="gm-profile-stat">
                    <FontAwesomeIcon icon={faBolt} className="gm-stat-xp" />

                    <div>
                        <strong>{totalXp.toLocaleString('uk-UA')} XP</strong>
                    </div>
                </div>
            </div>

            <button className="gm-profile-edit-btn" type="button" onClick={openProfileEditor}>
                <FontAwesomeIcon icon={faPen} />
                Редагувати профіль
            </button>

        </div>

        <div className="gm-profile-content">
            <div className="gm-profile-panels">
                <section className="gm-profile-panel">
                    <div className="gm-profile-panel-heading">
                        <h2>Мої інтереси</h2>
                        <button type="button" className="gm-profile-icon-btn" title="Змінити інтереси" aria-label="Змінити інтереси" onClick={openInterestsEditor}><FontAwesomeIcon icon={faPen} /></button>
                    </div>
                    {interestLoading ? <p className="gm-profile-muted">Завантаження інтересів...</p> : chosenInterests.length ? (<div className="gm-profile-interest-tags">{chosenInterests.map(item => <span key={item.id}>{item.name}</span>)}</div>) : (<div className="gm-profile-no-interests"><p>Ви ще не обрали інтереси.</p><button type="button" onClick={openInterestsEditor}><FontAwesomeIcon icon={faPlus} /> Додати інтереси</button></div>)}
                </section>
                <section className="gm-profile-panel">
                    <div className="gm-profile-panel-heading">
                        <h2>Особиста інформація</h2>
                        <button type="button" className="gm-profile-icon-btn" title="Редагувати дані" aria-label="Редагувати дані" onClick={openProfileEditor}><FontAwesomeIcon icon={faPen} /></button>
                    </div>
                    <div className="gm-profile-info-row"><FontAwesomeIcon icon={faEnvelope} /><div><span>Електронна пошта</span><strong>{user?.email || 'Не вказано'}</strong></div></div>
                    <div className="gm-profile-info-row"><FontAwesomeIcon icon={faCalendar} /><div><span>Дата народження</span><strong>{user?.birthDate ? new Date(`${String(user.birthDate).slice(0, 10)}T12:00:00`).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Не вказано'}</strong></div></div>
                </section>
            </div>
            <ProfileAchievements />
            <section className="gm-profile-account">
                <h2>Керування акаунтом</h2>
                <div className="gm-profile-account-actions">
                    <button type="button" onClick={onLogout}><FontAwesomeIcon icon={faSignOutAlt} /> Вийти з акаунту</button>
                    <button type="button" className="danger" onClick={() => setConfirmDelete(true)}><FontAwesomeIcon icon={faTrash} /> Видалити акаунт</button>
                </div>
            </section>
        </div>

        {editing && (<div className="gm-profile-modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving)
                setEditing(false);
        }}>
            <div className="gm-profile-modal" role="dialog" aria-modal="true" aria-labelledby="gm-profile-edit-title">
                <div className="gm-profile-modal-header">
                    <div><h2 id="gm-profile-edit-title">Редагування профілю</h2><p>Оновіть особисті дані та інформацію про себе.</p></div>
                    <button type="button" className="gm-profile-icon-btn" aria-label="Закрити" disabled={saving} onClick={() => setEditing(false)}><FontAwesomeIcon icon={faTimes} /></button>
                </div>
                <form onSubmit={saveProfile}>
                    <div className="gm-profile-fields">
                        <label>Ім'я<input name="firstName" value={form.firstName} onChange={handleChange} maxLength={100} /></label>
                        <label>Прізвище<input name="lastName" value={form.lastName} onChange={handleChange} maxLength={100} /></label>
                        <label>Username<input name="username" value={form.username} onChange={handleChange} required maxLength={100} /></label>

                        <label>
                            Дата народження
                            <input type="date" name="birthDate" value={form.birthDate} onChange={handleChange} min="1900-01-01" max={new Date().toLocaleDateString('en-CA')} />
                        </label>

                        <div className="gm-avatar-upload gm-profile-wide">
                            <div className="gm-avatar-upload-preview">
                                {avatarPreview || user?.avatarUrl ? (<img src={avatarPreview || user.avatarUrl} alt="Фото профілю" />) : (<FontAwesomeIcon icon={faUser} />)}
                            </div>

                            <div className="gm-avatar-upload-content">
                                <strong>Фото профілю</strong>
                                <p>JPG, PNG або WEBP. Максимум 5 МБ.</p>
                            </div>

                            <label className="gm-avatar-upload-button">
                                Обрати фотографію
                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} hidden />
                            </label>
                        </div>
                        <label className="gm-profile-wide">Про мене<textarea name="bio" value={form.bio} onChange={handleChange} rows={3} maxLength={500} placeholder="Ваші захоплення, цілі та інтереси..." /></label>
                    </div>
                    <div className="gm-profile-modal-actions">
                        <button type="button" className="gm-profile-secondary-btn" disabled={saving} onClick={() => setEditing(false)}>Скасувати</button>
                        <button type="submit" className="gm-profile-primary-btn" disabled={saving}><FontAwesomeIcon icon={faCheck} /> {saving ? 'Збереження...' : 'Зберегти зміни'}</button>
                    </div>
                </form>
            </div>
        </div>)}

        {editingInterests && (<div className="gm-profile-modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget && !interestSaving)
                setEditingInterests(false);
        }}>
            <div className="gm-profile-modal" role="dialog" aria-modal="true" aria-labelledby="gm-profile-interests-title">
                <div className="gm-profile-modal-header">
                    <div><h2 id="gm-profile-interests-title">Мої інтереси</h2><p>Оберіть до {MAX_INTERESTS} інтересів ({draftIds.length}/{MAX_INTERESTS}).</p></div>
                    <button type="button" className="gm-profile-icon-btn" aria-label="Закрити" disabled={interestSaving} onClick={() => setEditingInterests(false)}><FontAwesomeIcon icon={faTimes} /></button>
                </div>
                <div className="gm-profile-interest-tags gm-profile-interest-options">
                    {interests.map(item => <button type="button" key={item.id} className={draftIds.includes(Number(item.id)) ? 'selected' : ''} onClick={() => toggleInterest(Number(item.id))} disabled={interestSaving || (!draftIds.includes(Number(item.id)) && draftIds.length >= MAX_INTERESTS)}>{item.name}</button>)}
                </div>
                <div className="gm-profile-modal-actions">
                    <button type="button" className="gm-profile-secondary-btn" disabled={interestSaving} onClick={() => setEditingInterests(false)}>Скасувати</button>
                    <button type="button" className="gm-profile-primary-btn" disabled={interestSaving} onClick={saveInterests}>{interestSaving ? 'Збереження...' : 'Зберегти інтереси'}</button>
                </div>
            </div>
        </div>)}

        {confirmDelete && (<div className="gm-profile-modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting)
                setConfirmDelete(false);
        }}>
            <div className="gm-profile-modal gm-profile-modal-small" role="alertdialog" aria-modal="true" aria-labelledby="gm-profile-delete-title" aria-describedby="gm-profile-delete-description">
                <div className="gm-profile-modal-header"><div><h2 id="gm-profile-delete-title">Видалити акаунт?</h2><p id="gm-profile-delete-description">Усі дані акаунту буде видалено. Цю дію неможливо скасувати.</p></div></div>
                <div className="gm-profile-modal-actions">
                    <button type="button" className="gm-profile-secondary-btn" disabled={deleting} onClick={() => setConfirmDelete(false)}>Скасувати</button>
                    <button type="button" className="gm-profile-danger-btn" disabled={deleting} onClick={deleteAccount}>{deleting ? 'Видалення...' : 'Так, видалити'}</button>
                </div>
            </div>
        </div>)}
    </main>);
}