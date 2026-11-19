import React, { useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import TransferOwnershipDialog from '../../components/admin/TransferOwnershipDialog';
import { getAdminClubs, deleteAdminClub } from '../../services/adminService';

const formatDate = value => value ? new Date(value).toLocaleDateString('uk-UA') : '—';

const columns = [
  {
    key: 'name',
    label: 'Клуб',
    render: club => (
      <div className="admin-cell-details">
        <strong>{club.name}</strong>
        <span>{club.categoryName || 'Без категорії'}</span>
      </div>
    ),
  },
  {
    key: 'ownerUsername',
    label: 'Власник',
    render: club => <span className="admin-owner-name">{club.ownerUsername || '—'}</span>,
  },
  {
    key: 'visibility',
    label: 'Доступ',
    render: club => (
      <span className="admin-role">
        {club.visibility === 'private' ? 'Приватний' : 'Публічний'}
      </span>
    ),
  },
  { key: 'membersCount', label: 'Учасники' },
  { key: 'postsCount', label: 'Дописи' },
  { key: 'createdAt', label: 'Створено', render: club => formatDate(club.createdAt) },
];

export default function AdminClubs() {
  const [selectedClub, setSelectedClub] = useState(null);
  const [refreshTable, setRefreshTable] = useState(null);

  const handleOpenTransfer = (club, refresh) => {
    setSelectedClub(club);
    setRefreshTable(() => refresh);
  };

  const handleTransferSuccess = () => {
    refreshTable?.();
    setSelectedClub(null);
  };

  return (
    <>
      <AdminTable
        title="Клуби"
        subtitle="Керування клубами та передача прав власності."
        columns={columns}
        loadData={getAdminClubs}
        deleteItem={deleteAdminClub}
        deleteLabel="клуб"
        getDeleteName={club => club.name}
        searchPlaceholder="Пошук клубу за назвою..."
        renderActions={(club, refresh) => (
          <button
            type="button"
            className="admin-transfer-button"
            onClick={() => handleOpenTransfer(club, refresh)}
          >
            Передати власність
          </button>
        )}
      />

      <TransferOwnershipDialog
        club={selectedClub}
        onClose={() => setSelectedClub(null)}
        onSuccess={handleTransferSuccess}
      />
    </>
  );
}