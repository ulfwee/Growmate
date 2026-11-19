import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faUsers, faLock, faGlobe, faImage } from '@fortawesome/free-solid-svg-icons';
import ClubCoverField from './ClubCoverField';
import CustomSelect from '../../components/CustomSelect';
import '../../css/ClubFormPolish.css';

const empty = { name: '', description: '', categoryId: '', coverUrl: '', visibility: 'public', rules: '' };

export default function CreateClubModal({ categories = [], onClose, onCreate, saving = false, error = '' }) {
  const [form, setForm] = useState(empty);
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

  const submit = event => {
    event.preventDefault();
    if (uploadingCover) return;
    if (!form.name.trim() || !form.description.trim() || !form.categoryId) return;

    onCreate({
      name: form.name.trim(),
      description: form.description.trim(),
      categoryId: Number(form.categoryId),
      coverUrl: form.coverUrl.trim() || null,
      visibility: form.visibility,
      rules: form.rules.trim() || null,
      interestIds: [],
    });
  };

  return (
    <div className="clubs-modal-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="clubs-modal gm-form-modal" role="dialog" aria-modal="true" aria-labelledby="create-club-title">
        <header className="gm-form-head">
          <div className="gm-form-head-icon"><FontAwesomeIcon icon={faUsers} /></div>
          <div>
            <h2 id="create-club-title">Створити клуб</h2>
            <p>Започаткуйте спільноту людей зі спільними інтересами.</p>
          </div>
          <button className="clubs-icon-button" type="button" disabled={saving} onClick={onClose} aria-label="Закрити">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </header>

        <form className="gm-form-body" onSubmit={submit}>
          <div className="gm-form-section-label">Основна інформація</div>

          <label className="gm-form-field">
            <span className="gm-field-label">Назва клубу <span className="gm-required">*</span></span>
            <input required minLength={3} maxLength={150} value={form.name} onChange={event => set('name', event.target.value)} placeholder="Наприклад, Frontend Together" />
          </label>

          <label className="gm-form-field">
            <span className="gm-field-label">Опис клубу <span className="gm-required">*</span></span>
            <textarea required rows={3} value={form.description} onChange={event => set('description', event.target.value)} placeholder="Розкажіть, чим займається ваша спільнота" />
          </label>

          <div className="gm-form-grid">
            <label className="gm-form-field">
              <span className="gm-field-label">Категорія <span className="gm-required">*</span></span>
              <span className="gm-select-wrap">
                <CustomSelect
                  value={form.categoryId}
                  onChange={value => setForm(previous => ({ ...previous, categoryId: value }))}
                  placeholder="Оберіть категорію"
                  options={categories.map(category => ({ value: category.id, label: category.name }))}
                />
              </span>
            </label>
          </div>

          <ClubCoverField value={form.coverUrl} onChange={url => set('coverUrl', url)} onUploadingChange={setUploadingCover} onError={setCoverError} />
          {coverError && <p className="clubs-form-error" role="alert">{coverError}</p>}

          <div className="gm-form-section-label">Доступ до клубу</div>
          <div className="gm-visibility-grid">
            <label className={form.visibility === 'public' ? 'chosen' : ''}>
              <input type="radio" name="create-visibility" checked={form.visibility === 'public'} onChange={() => set('visibility', 'public')} />
              <FontAwesomeIcon icon={faGlobe} />
              <span><strong>Публічний</strong><small>Можна приєднатися одразу</small></span>
            </label>
            <label className={form.visibility === 'private' ? 'chosen' : ''}>
              <input type="radio" name="create-visibility" checked={form.visibility === 'private'} onChange={() => set('visibility', 'private')} />
              <FontAwesomeIcon icon={faLock} />
              <span><strong>Приватний</strong><small>Вступ після схвалення заявки</small></span>
            </label>
          </div>

          <label className="gm-form-field">
            <span className="gm-field-label">Правила спільноти <span className="gm-optional">необов'язково</span></span>
            <textarea rows={3} value={form.rules} onChange={event => set('rules', event.target.value)} placeholder="Наприклад, поважайте інших учасників..." />
          </label>

          {error && <p className="clubs-form-error" role="alert">{error}</p>}
          <footer className="gm-form-footer">
            <button type="button" className="clubs-button-secondary" disabled={saving} onClick={onClose}>Скасувати</button>
            <button type="submit" className="clubs-button-primary" disabled={saving || uploadingCover || !categories.length}>
              {saving ? 'Створення...' : 'Створити клуб'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}