import React from 'react';
import AdminTable from '../../components/admin/AdminTable';
import { getAdminAnnouncements, deleteAdminAnnouncement } from '../../services/adminService';

const formatDate = value => value ? new Date(value).toLocaleDateString('uk-UA') : '—';

const columns = [
    {
        key: 'title',
        label: 'Оголошення',
        render: item => (
            <div className="admin-cell-details">
                <strong>{item.title}</strong>
                <span className="admin-content-preview">{item.content || 'Без опису'}</span>
            </div>
        ),
    },
    { key: 'announcementType', label: 'Тип' },
    { key: 'clubId', label: 'ID клубу' },
    { key: 'authorId', label: 'ID автора' },
    { key: 'isPinned', label: 'Закріплено', render: item => item.isPinned ? 'Так' : 'Ні' },
    { key: 'createdAt', label: 'Створено', render: item => formatDate(item.createdAt) },
];

export default function AdminAnnouncements() {
    return (
        <AdminTable
            title="Оголошення"
            subtitle="Перегляд і модерація оголошень клубів."
            columns={columns}
            loadData={getAdminAnnouncements}
            deleteItem={deleteAdminAnnouncement}
            deleteLabel="оголошення"
            getDeleteName={item => item.title}
            searchPlaceholder="Пошук за назвою або текстом..."
        />
    );
}