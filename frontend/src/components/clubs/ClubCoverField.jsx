import React, { useEffect, useRef, useState } from 'react';
import { uploadClubCover } from '../../services/clubsService';
import { getImageUrl } from '../../utils/imageUrl';
import '../../css/ClubCoverField.css';

export default function ClubCoverField({ value = '', onChange, onUploadingChange, onError }) {
  const [mode, setMode] = useState('file');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState('');
  const fileRef = useRef(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      onError?.('Дозволені JPG, PNG, WebP до 5 МБ.');
      event.target.value = '';
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    onUploadingChange?.(true);
    onError?.('');

    try {
      const result = await uploadClubCover(file);
      onChange(result.url);
    } catch (error) {
      setPreview('');
      onError?.(error.message || 'Не вдалося завантажити обкладинку.');
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      event.target.value = '';
    }
  };

  return (
    <div className="gm-cover-field">
      <span className="gm-field-label">Обкладинка клубу <small>(необов'язково)</small></span>

      <div className="gm-cover-tabs">
        <button type="button" className={mode === 'file' ? 'active' : ''} onClick={() => setMode('file')}>
          З пристрою
        </button>
        <button type="button" className={mode === 'url' ? 'active' : ''} onClick={() => setMode('url')}>
          За посиланням
        </button>
      </div>

      {mode === 'file' ? (
        <div className="gm-cover-drop">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={uploading} />
          <span>{uploading ? 'Завантаження зображення...' : 'Оберіть JPG, PNG або WebP (до 5 МБ)'}</span>
        </div>
      ) : (
        <input
          className="gm-cover-url"
          type="url"
          maxLength={500}
          value={value || ''}
          onChange={event => { setPreview(''); onChange(event.target.value); }}
          placeholder="https://example.com/cover.jpg"
        />
      )}

      {(preview || value) && (
        <div className="gm-cover-preview">
          <img
            src={preview || getImageUrl(value)}
            alt="Попередній перегляд обкладинки"
            onError={event => { event.currentTarget.style.display = 'none'; }}
          />
          <button type="button" onClick={() => {
            setPreview('');
            onChange('');
            if (fileRef.current) fileRef.current.value = '';
          }}>
            Прибрати обкладинку
          </button>
        </div>
      )}
    </div>
  );
}