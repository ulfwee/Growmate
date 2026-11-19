import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPen, faLock, faGlobe } from '@fortawesome/free-solid-svg-icons';
import ClubCoverField from './ClubCoverField';
import CustomSelect from '../../components/CustomSelect';
import '../../css/ClubFormPolish.css';

export default function EditClubModal({ club, categories = [], interestIds = [], onClose, onSave, saving = false, error = '' }) {
  const [form, setForm] = useState(() => ({
    name: club.name || '',
    description: club.description || '',
    categoryId: String(club.categoryId ?? ''),
    coverUrl: club.coverUrl || '',
    visibility: club.visibility || 'public',
    rules: club.rules || '',
  }));
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState('');
  const set = (key, value) => setForm(old => ({ ...old, [key]: value }));

  useEffect(() => {
    const handler = event => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, saving]);

  const categoryOptions = categories.map(category => ({ value: String(category.id), label: category.name }));
  if (form.categoryId && !categoryOptions.some(category => category.value === form.categoryId)) {
    categoryOptions.unshift({ value: form.categoryId, label: club.categoryName || 'Поточна категорія' });
  }

  const submit = event => {
    event.preventDefault();
    if (uploadingCover || !form.name.trim() || !form.description.trim() || !form.categoryId) return;

    onSave({
      name: form.name.trim(),
      description: form.description.trim(),
      categoryId: Number(form.categoryId),
      coverUrl: form.coverUrl.trim() || null,
      visibility: form.visibility,
      rules: form.rules.trim() || null,
      interestIds: interestIds.map(Number),
    });
  };

  return (
    <div className="clubs-modal-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="clubs-modal gm-form-modal" role="dialog" aria-modal="true" aria-labelledby="edit-club-title">
        <header className="gm-form-head">
          <div className="gm-form-head-icon"><FontAwesomeIcon icon={faPen} /></div>
          <div>
            <h2 id="edit-club-title">Редагувати клуб</h2>
            <p>Оновіть інформацію та налаштування спільноти.</p>
          </div>
          <button type="button" className="clubs-icon-button" disabled={saving} onClick={onClose} aria-label="Закрити">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </header>

        <form className="gm-form-body" onSubmit={submit}>
          <div className="gm-form-section-label">Основна інформація</div>

          <label className="gm-form-field">
            <span className="gm-field-label">Назва клубу <span className="gm-required">*</span></span>
            <input required minLength={3} maxLength={150} value={form.name} onChange={event => set('name', event.target.value)} />
          </label>

          <label className="gm-form-field">
            <span className="gm-field-label">Опис клубу <span className="gm-required">*</span></span>
            <textarea required rows={3} value={form.description} onChange={event => set('description', event.target.value)} />
          </label>

          <div className="gm-form-grid">
            <div className="gm-form-field">
              <span className="gm-field-label">Категорія <span className="gm-required">*</span></span>
              <CustomSelect value={form.categoryId} onChange={value => set('categoryId', value)} options={categoryOptions} placeholder="Оберіть категорію" disabled={saving} />
            </div>
          </div>

          <ClubCoverField value={form.coverUrl} onChange={url => set('coverUrl', url)} onUploadingChange={setUploadingCover} onError={setCoverError} />
          {coverError && <p className="clubs-form-error" role="alert">{coverError}</p>}

          <div className="gm-form-section-label">Доступ до клубу</div>
          <div className="gm-visibility-grid">
            <label className={form.visibility === 'public' ? 'chosen' : ''}>
              <input type="radio" name="edit-visibility" checked={form.visibility === 'public'} onChange={() => set('visibility', 'public')} />
              <FontAwesomeIcon icon={faGlobe} />
              <span><strong>Публічний</strong><small>Вільний вступ</small></span>
            </label>
            <label className={form.visibility === 'private' ? 'chosen' : ''}>
              <input type="radio" name="edit-visibility" checked={form.visibility === 'private'} onChange={() => set('visibility', 'private')} />
              <FontAwesomeIcon icon={faLock} />
              <span><strong>Приватний</strong><small>Вступ за заявкою</small></span>
            </label>
          </div>

          <label className="gm-form-field">
            <span className="gm-field-label">Правила клубу <span className="gm-optional">необов'язково</span></span>
            <textarea rows={3} value={form.rules} onChange={event => set('rules', event.target.value)} />
          </label>

          <p className="gm-form-hint">Інтереси клубу зберігаються без змін.</p>
          {error && <p className="clubs-form-error" role="alert">{error}</p>}

          <footer className="gm-form-footer">
            <button type="button" className="clubs-button-secondary" disabled={saving} onClick={onClose}>Скасувати</button>
            <button type="submit" className="clubs-button-primary" disabled={saving || uploadingCover}>
              {saving ? 'Збереження...' : 'Зберегти зміни'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}