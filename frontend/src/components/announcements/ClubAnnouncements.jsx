import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsis, faHeart, faThumbtack, faPen, faTrash, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { faHeart as faHeartOutline } from '@fortawesome/free-regular-svg-icons';
import { useToast } from '../ToastProvider';
import {
  getClubAnnouncements, createClubAnnouncement, updateClubAnnouncement,
  deleteClubAnnouncement, likeClubAnnouncement, unlikeClubAnnouncement, pinClubAnnouncement,
} from '../../services/announcementsService';
import '../../css/ClubAnnouncements.css';
import CustomSelect from '../CustomSelect';
import ConfirmDialog from '../ConfirmDialog';
import ClubImagePicker from '../ClubImagePicker';
import { uploadClubImage } from '../../services/clubsService';
import { getImageUrl } from '../../utils/imageUrl';

const initialForm = { title: '', content: '', announcementType: 'general', imageUrl: '', relatedGroupGoalId: '' };

export default function ClubAnnouncements({ clubId, canManage = false, isMember = false, groupGoals = [] }) {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const closeMenu = event => {
      if (!menuRef.current?.contains(event.target)) setOpenMenuId(null);
    };
    const closeEscape = event => {
      if (event.key === 'Escape') setOpenMenuId(null);
    };

    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', closeEscape);
    };
  }, []);

  const reload = useCallback(async () => {
    const result = await getClubAnnouncements(clubId);
    setItems(Array.isArray(result) ? result : []);
  }, [clubId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getClubAnnouncements(clubId)
      .then(data => {
        if (active) setItems(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [clubId]);

  const openEditor = (item = null) => {
    setImageFile(null);
    setEditing(item || { id: null });
    setForm(item ? {
      title: item.title || '',
      content: item.content || '',
      announcementType: item.announcementType || 'general',
      imageUrl: item.imageUrl || '',
      relatedGroupGoalId: item.relatedGroupGoalId ? String(item.relatedGroupGoalId) : '',
    } : initialForm);
  };

  const save = async e => {
    e.preventDefault();
    if (!canManage || saving) return;
    if (!form.title.trim() || !form.content.trim()) return;

    if (form.announcementType === 'group_goal' && !form.relatedGroupGoalId) {
      showToast('Оберіть групову ціль.', 'error');
      return;
    }

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      announcementType: form.announcementType,
      imageUrl: form.imageUrl.trim() || null,
      relatedGroupGoalId: form.announcementType === 'group_goal' ? Number(form.relatedGroupGoalId) : null,
      relatedEventId: null,
      isPinned: editing?.id ? Boolean(editing.isPinned) : false,
    };

    setSaving(true);
    try {
      if (imageFile) payload.imageUrl = await uploadClubImage(clubId, imageFile);
      if (editing?.id) await updateClubAnnouncement(clubId, editing.id, payload);
      else await createClubAnnouncement(clubId, payload);

      await reload();
      setEditing(null);
      setImageFile(null);
      showToast(editing?.id ? 'Оголошення оновлено.' : 'Оголошення опубліковано.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const run = async (id, operation, message) => {
    setBusyId(id);
    try {
      await operation();
      await reload();
      if (message) showToast(message);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeleteAnnouncement = async () => {
    if (!announcementToDelete || busyId !== null) return;
    const item = announcementToDelete;
    setBusyId(item.id);

    try {
      await deleteClubAnnouncement(clubId, item.id);
      setItems(current => current.filter(entry => entry.id !== item.id));
      setAnnouncementToDelete(null);
      showToast('Допис видалено.');
      try {
        await reload();
      } catch (err) {
        console.error('Не вдалося оновити дописи:', err);
      }
    } catch (err) {
      showToast(err.message || 'Не вдалося видалити допис.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="ca-feed">
      <header className="ca-feed-header">
        <div>
          <h2>Стрічка клубу</h2>
          <p>Оголошення, новини та важливі оновлення спільноти.</p>
        </div>
        {canManage && (
          <button type="button" className="ca-button ca-button-primary" onClick={() => openEditor()}>
            + Новий допис
          </button>
        )}
      </header>

      {loading ? (
        <div className="ca-empty">Завантаження дописів...</div>
      ) : error ? (
        <div className="ca-empty" role="alert"><p>{error}</p></div>
      ) : items.length === 0 ? (
        <div className="ca-empty">
          <h3>Поки що немає дописів</h3>
          <p>Новини та важливі повідомлення клубу з’являться тут.</p>
          {canManage && (
            <button className="ca-button ca-button-primary" onClick={() => openEditor()}>
              Створити допис
            </button>
          )}
        </div>
      ) : (
        <div className="ca-post-list">
          {items.map(item => {
            const canAct = item.canPin || item.canEdit || item.canDelete;
            const typeLabel = item.announcementType === 'group_goal' ? 'Групова ціль' : item.announcementType === 'event' ? 'Подія' : 'Оголошення';
            const featured = Boolean(item.imageUrl || item.isPinned);

            return (
              <article key={item.id} className={`ca-post ca-post--${featured ? 'editorial' : 'minimal'} ${item.isPinned ? 'ca-post-pinned' : ''}`}>
                <div className="ca-post-top">
                  <div className="ca-post-eyebrow">
                    <span className={`ca-category ca-category--${item.announcementType || 'general'}`}>{typeLabel}</span>
                    {item.isPinned && (
                      <span className="ca-pinned-label"><FontAwesomeIcon icon={faThumbtack} /> Закріплено</span>
                    )}
                  </div>

                  <div className="ca-post-tools" ref={openMenuId === item.id ? menuRef : null}>
                    {canAct && (
                      <>
                        <button
                          type="button" className="ca-more-button" aria-label="Дії з дописом"
                          aria-haspopup="menu" aria-expanded={openMenuId === item.id}
                          onClick={() => setOpenMenuId(current => current === item.id ? null : item.id)}
                        >
                          <FontAwesomeIcon icon={faEllipsis} />
                        </button>

                        {openMenuId === item.id && (
                          <div className="ca-post-menu" role="menu">
                            {item.canPin && (
                              <button
                                type="button" role="menuitem" disabled={busyId !== null}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  run(item.id, () => pinClubAnnouncement(clubId, item.id, !item.isPinned), item.isPinned ? 'Відкріплено.' : 'Закріплено.');
                                }}
                              >
                                <FontAwesomeIcon icon={faThumbtack} /> {item.isPinned ? 'Відкріпити' : 'Закріпити'}
                              </button>
                            )}
                            {item.canEdit && (
                              <button type="button" role="menuitem" onClick={() => { setOpenMenuId(null); openEditor(item); }}>
                                <FontAwesomeIcon icon={faPen} /> Редагувати
                              </button>
                            )}
                            {item.canDelete && (
                              <button
                                type="button" role="menuitem" className="ca-danger-action"
                                disabled={busyId !== null}
                                onClick={() => { setOpenMenuId(null); setAnnouncementToDelete(item); }}
                              >
                                <FontAwesomeIcon icon={faTrash} /> Видалити
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="ca-post-main">
                  <div className="ca-post-content">
                    <h3>{item.title}</h3>
                    <p>{item.content}</p>
                    {item.relatedGroupGoalId && (
                      <Link className="ca-related-link" to={`/clubs/${clubId}/group-goals/${item.relatedGroupGoalId}`}>
                        Переглянути групову ціль →
                      </Link>
                    )}
                    {item.announcementType === 'event' && item.relatedEventId && (
                      <Link className="ca-related-link" to={`/clubs/${item.clubId}?tab=events`}>
                        Переглянути подію →
                      </Link>
                    )}
                  </div>
                  {item.imageUrl && (
                    <div className="ca-post-media">
                      <img className="ca-post-image" src={getImageUrl(item.imageUrl)} alt={item.title || 'Зображення допису'} loading="lazy" />
                    </div>
                  )}
                </div>

                <footer className="ca-post-bottom">
                  <div className="ca-author">
                    <div className="ca-avatar">
                      {item.authorAvatarUrl
                        ? <img src={item.authorAvatarUrl} alt="" />
                        : (item.authorName || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="ca-author-meta">
                      <strong>{item.authorName || 'Учасник клубу'}</strong>
                      <time dateTime={item.createdAt}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </time>
                    </div>
                  </div>
                  <div className="ca-post-engagement">
                    <span className="ca-likes-count"><FontAwesomeIcon icon={faHeart} /> {item.likesCount || 0}</span>
                    <button
                      type="button" aria-pressed={Boolean(item.isLiked)}
                      className={`ca-like ${item.isLiked ? 'ca-like-active' : ''}`}
                      disabled={!isMember || busyId !== null}
                      title={!isMember ? 'Приєднайтеся до клубу, щоб вподобати' : ''}
                      onClick={() => run(item.id, () => item.isLiked ? unlikeClubAnnouncement(clubId, item.id) : likeClubAnnouncement(clubId, item.id))}
                    >
                      <FontAwesomeIcon icon={item.isLiked ? faHeart : faHeartOutline} />
                      <span>{item.isLiked ? 'Вподобано' : 'Подобається'}</span>
                    </button>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <div
          className="ca-modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget && !saving) setEditing(null);
          }}
        >
          <section className="ca-modal" role="dialog" aria-modal="true" aria-label="Редагування оголошення">
            <div className="ca-modal-header">
              <h2>{editing.id ? 'Редагувати оголошення' : 'Нове оголошення'}</h2>
              <button className="ca-icon-button" disabled={saving} onClick={() => setEditing(null)} aria-label="Закрити">×</button>
            </div>

            <form className="ca-modal-form" onSubmit={save}>
              <div className="ca-field">
                <span>Тип <span className="ca-required">*</span></span>
                <CustomSelect
                  value={form.announcementType}
                  onChange={value => setForm(f => ({ ...f, announcementType: value, relatedGroupGoalId: '' }))}
                  disabled={saving}
                  options={[
                    { value: 'general', label: 'Звичайне оголошення' },
                    { value: 'group_goal', label: 'Про групову ціль' },
                    { value: 'event', label: 'Про подію' },
                  ]}
                />
              </div>

              <label className="ca-field">
                <span>Назва <span className="ca-required">*</span></span>
                <input required maxLength={200} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </label>

              <label className="ca-field">
                <span>Текст <span className="ca-required">*</span></span>
                <textarea required rows={6} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
              </label>

              {form.announcementType === 'event' && (
                <p className="ca-form-hint">
                  Оголошення про подію можна опублікувати як новину. Прив’язка до конкретної події з’явиться після реалізації модуля подій.
                </p>
              )}

              {form.announcementType === 'group_goal' && (
                <div className="ca-field">
                  <span>Групова ціль <span className="ca-required">*</span></span>
                  <CustomSelect
                    value={form.relatedGroupGoalId}
                    onChange={value => setForm(f => ({ ...f, relatedGroupGoalId: value }))}
                    placeholder="Оберіть групову ціль"
                    disabled={saving || groupGoals.length === 0}
                    options={groupGoals.map(goal => ({ value: String(goal.id), label: goal.title }))}
                  />
                  {groupGoals.length === 0 && <small>Немає доступних групових цілей.</small>}
                </div>
              )}

              <div className="ca-field">
                <ClubImagePicker
                  label="Зображення оголошення (необов’язково)"
                  value={imageFile || form.imageUrl}
                  disabled={saving}
                  onChange={value => {
                    if (value instanceof File) setImageFile(value);
                    else {
                      setImageFile(null);
                      setForm(current => ({ ...current, imageUrl: value || '' }));
                    }
                  }}
                />
              </div>

              <div className="ca-modal-footer">
                <button type="button" className="ca-button ca-button-secondary" disabled={saving} onClick={() => setEditing(null)}>Скасувати</button>
                <button type="submit" className="ca-button ca-button-primary" disabled={saving}>{saving ? 'Збереження...' : 'Зберегти'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={announcementToDelete !== null}
        title="Видалити допис?"
        message={announcementToDelete ? `Ви впевнені, що хочете видалити допис «${announcementToDelete.title}»? Цю дію неможливо скасувати.` : ''}
        confirmText="Видалити допис"
        variant="danger"
        loading={announcementToDelete !== null && busyId === announcementToDelete.id}
        onCancel={() => { if (busyId === null) setAnnouncementToDelete(null); }}
        onConfirm={confirmDeleteAnnouncement}
      />
    </section>
  );
}