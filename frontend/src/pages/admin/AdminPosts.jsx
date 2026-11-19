import React from 'react';
import AdminTable from '../../components/admin/AdminTable';
import { getAdminPosts, deleteAdminPost } from '../../services/adminService';

const formatDate = value => value ? new Date(value).toLocaleDateString('uk-UA') : '—';

const columns = [
    {
        key: 'content',
        label: 'Допис',
        render: post => <div className="admin-content-preview">{post.content || 'Без тексту'}</div>,
    },
    { key: 'username', label: 'Автор' },
    { key: 'clubName', label: 'Клуб', render: post => post.clubName || '—' },
    { key: 'commentsCount', label: 'Коментарі' },
    { key: 'reactionsCount', label: 'Реакції' },
    { key: 'createdAt', label: 'Опубліковано', render: post => formatDate(post.createdAt) },
];

export default function AdminPosts() {
    return (
        <AdminTable
            title="Дописи"
            subtitle="Перегляд і модерація публікацій користувачів."
            columns={columns}
            loadData={getAdminPosts}
            deleteItem={deleteAdminPost}
            deleteLabel="допис"
            getDeleteName={post => post.content?.slice(0, 50) || `#${post.id}`}
            searchPlaceholder="Пошук за текстом допису..."
        />
    );
}