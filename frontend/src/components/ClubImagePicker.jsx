import React, { useEffect, useState } from 'react';
import { getImageUrl } from '../utils/imageUrl';
import '../css/ClubImagePicker.css';

export default function ClubImagePicker({ value, onChange, disabled = false, label = 'Зображення' }) {
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!(value instanceof File)) {
      setPreview('');
      return;
    }

    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const selectFile = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Оберіть JPG, PNG або WebP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Максимальний розмір — 5 МБ.');
      return;
    }

    setError('');
    onChange(file);
  };

  const src = value instanceof File ? preview : value ? getImageUrl(value) : '';

  return (
    <div className="gm-image-picker">
      <span className="gm-image-picker-label">{label}</span>
      {src && <img className="gm-image-picker-preview" src={src} alt="Попередній перегляд" />}

      <div className="gm-image-picker-actions">
        <label className="gm-image-picker-upload">
          {src ? 'Замінити фото' : 'Обрати фото з пристрою'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectFile} disabled={disabled} />
        </label>

        {src && (
          <button type="button" disabled={disabled} onClick={() => { setError(''); onChange(null); }}>
            Прибрати фото
          </button>
        )}
      </div>

      <small>JPG, PNG або WebP · до 5 МБ</small>
      {error && <p role="alert" className="gm-image-picker-error">{error}</p>}
    </div>
  );
}