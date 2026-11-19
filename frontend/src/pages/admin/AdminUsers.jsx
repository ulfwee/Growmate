import React from 'react';
import AdminTable from '../../components/admin/AdminTable';
import { getAdminUsers, deleteAdminUser } from '../../services/adminService';

const formatDate = value => value ? new Date(value).toLocaleDateString('uk-UA') : '—';

const columns = [
    {
        key: 'username',
        label: 'Користувач',
        render: user => (
            <div className="admin-user-cell">
                <div className="admin-user-avatar">
                    {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" />
                    ) : (
                        user.username?.charAt(0).toUpperCase()
                    )}
                </div>

                <div className="admin-cell-details">
                    <strong>{user.username}</strong>
                    <span>
                        {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Ім’я не вказано'}
                    </span>
                </div>
            </div>
        ),
    },
    { key: 'email', label: 'Email' },
    {
        key: 'role',
        label: 'Роль',
        render: user => (
            <span className={`admin-role ${user.role}`}>
                {user.role === 'admin' ? 'Адміністратор' : 'Користувач'}
            </span>
        ),
    },
    { key: 'totalXp', label: 'XP' },
    { key: 'clubsCount', label: 'Клуби' },
    { key: 'postsCount', label: 'Дописи' },
    { key: 'createdAt', label: 'Дата реєстрації', render: user => formatDate(user.createdAt) },
];

export default function AdminUsers() {
    return (
        <AdminTable
            title="Користувачі"
            subtitle="Перегляд та керування обліковими записами платформи."
            columns={columns}
            loadData={getAdminUsers}
            deleteItem={deleteAdminUser}
            deleteLabel="користувача"
            getDeleteName={user => user.username}
            canDelete={user => user.role !== 'admin'}
            searchPlaceholder="Пошук за ім’ям або email..."
        />
    );
}