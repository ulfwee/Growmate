import React, { useEffect, useMemo, useState } from 'react';

import ConfirmDialog from '../ConfirmDialog';
import CustomSelect from '../CustomSelect';
import { useToast } from '../ToastProvider';
import { getAdminClubMembers, transferAdminClubOwnership } from '../../services/adminService';

export default function TransferOwnershipDialog({ club, onClose, onSuccess }) {
  const { showToast } = useToast();

  const [members, setMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!club) return;

    let active = true;

    setMembers([]);
    setSelectedUserId('');
    setLoadError(false);
    setLoading(true);
    setConfirmOpen(false);

    getAdminClubMembers(club.id)
      .then(data => {
        if (!active) return;
        setMembers(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        if (!active) return;

        setLoadError(true);
        showToast(err.message || 'Не вдалося завантажити учасників клубу.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [club?.id, showToast]);

  const candidates = useMemo(
    () => members.filter(member => member.status === 'active' && member.role !== 'owner'),
    [members]
  );

  const selectOptions = useMemo(
    () => candidates.map(member => ({
      value: String(member.userId),
      label: member.username,
    })),
    [candidates]
  );

  const selectedMember = candidates.find(member => String(member.userId) === selectedUserId);

  const handleTransfer = async () => {
    if (!club || !selectedMember || saving) return;

    try {
      setSaving(true);
      await transferAdminClubOwnership(club.id, selectedMember.userId);
      setConfirmOpen(false);

      showToast(
        `Власність над клубом «${club.name}» передано користувачу ${selectedMember.username}.`,
        'success'
      );

      onSuccess?.();
      onClose?.();
    } catch (err) {
      setConfirmOpen(false);
      showToast(err.message || 'Не вдалося передати власність над клубом.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!club) return null;

  return (
    <>
      <div
        className="admin-modal-backdrop"
        onMouseDown={event => {
          if (event.target === event.currentTarget && !saving && !confirmOpen)
            onClose?.();
        }}
      >
        <div
          className="admin-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-ownership-title"
        >
          <div className="admin-modal-header">
            <div>
              <h2 id="transfer-ownership-title">Передати власність</h2>
              <p>Клуб: <strong>{club.name}</strong></p>
            </div>

            <button
              type="button"
              className="admin-modal-close"
              onClick={onClose}
              disabled={saving || confirmOpen}
              aria-label="Закрити"
            >
              ×
            </button>
          </div>

          <div className="admin-modal-body">
            <div className="admin-current-owner">
              <span>Поточний власник</span>
              <strong>{club.ownerUsername || '—'}</strong>
            </div>

            <label className="admin-field-label">Новий власник</label>

            {loading ? (
              <p className="admin-modal-hint">Завантаження учасників...</p>
            ) : loadError ? (
              <div className="admin-modal-empty">
                Не вдалося отримати список учасників клубу.
              </div>
            ) : candidates.length === 0 ? (
              <div className="admin-modal-empty">
                У цьому клубі немає інших активних учасників,
                яким можна передати власність.
              </div>
            ) : (
              <CustomSelect
                value={selectedUserId}
                onChange={setSelectedUserId}
                options={selectOptions}
                placeholder="Оберіть учасника клубу"
                disabled={saving || confirmOpen}
                className="admin-owner-select"
              />
            )}

            <p className="admin-modal-hint">
              Після передачі новий власник зможе керувати клубом,
              а попередній залишиться звичайним учасником.
            </p>
          </div>

          <div className="admin-modal-actions">
            <button
              type="button"
              className="admin-secondary-button"
              onClick={onClose}
              disabled={saving || confirmOpen}
            >
              Скасувати
            </button>

            <button
              type="button"
              className="admin-primary-button"
              disabled={!selectedUserId || loading || loadError || saving || confirmOpen}
              onClick={() => setConfirmOpen(true)}
            >
              Передати власність
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Підтвердження передачі власності"
        message={
          `Передати клуб «${club.name}» користувачу ` +
          `«${selectedMember?.username || ''}»? ` +
          'Попередній власник втратить права керування клубом.'
        }
        confirmText="Передати"
        cancelText="Скасувати"
        variant="primary"
        loading={saving}
        onConfirm={handleTransfer}
        onCancel={() => {
          if (!saving) setConfirmOpen(false);
        }}
      />
    </>
  );
}