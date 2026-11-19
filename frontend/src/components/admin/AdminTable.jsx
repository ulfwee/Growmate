import React, { useCallback, useEffect, useState } from 'react';
import ConfirmDialog from '../ConfirmDialog';
import { useToast } from '../ToastProvider';

export default function AdminTable({
  title, subtitle, columns, loadData, deleteItem,
  deleteLabel = 'запис', getDeleteName, canDelete,
  renderActions, searchPlaceholder = 'Пошук...',
}) {
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => {
    setReloadKey(value => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);

    loadData({ search, page, pageSize: 10 })
      .then(data => {
        if (!active) return;

        setItems(data.items ?? []);
        setTotalPages(data.totalPages ?? 0);
        setTotalCount(data.totalCount ?? 0);
      })
      .catch(err => {
        if (active)
          showToast(err.message || 'Не вдалося завантажити дані.', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadData, search, page, reloadKey, showToast]);

  const handleSearch = event => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    refresh();
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !deleteItem || deleting) return;

    try {
      setDeleting(true);
      await deleteItem(itemToDelete.id);
      setItemToDelete(null);

      showToast('Запис успішно видалено.', 'success');

      if (items.length === 1 && page > 1)
        setPage(previous => previous - 1);
      else
        refresh();
    } catch (err) {
      setItemToDelete(null);
      showToast(err.message || 'Не вдалося видалити запис.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteName = itemToDelete
    ? (getDeleteName?.(itemToDelete) || itemToDelete.name ||
       itemToDelete.title || itemToDelete.username || `#${itemToDelete.id}`)
    : '';

  const hasActions = Boolean(deleteItem || renderActions);

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <span className="admin-total">
          Усього записів: <strong>{totalCount}</strong>
        </span>
      </div>

      <div className="admin-panel">
        <div className="admin-toolbar">
          <form className="admin-search-form" onSubmit={handleSearch}>
            <input
              className="admin-search"
              type="search"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder={searchPlaceholder}
            />
            <button type="submit" className="admin-primary-button">
              Знайти
            </button>
          </form>

          <button type="button" className="admin-secondary-button" onClick={refresh} disabled={loading}>
            Оновити
          </button>
        </div>

        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                {columns.map(column => (
                  <th key={column.key}>{column.label}</th>
                ))}

                {hasActions && <th className="admin-actions-th">Дії</th>}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (hasActions ? 1 : 0)} className="admin-table-message">
                    Завантаження даних...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (hasActions ? 1 : 0)} className="admin-table-message">
                    Записів не знайдено.
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id}>
                    {columns.map(column => (
                      <td key={column.key}>
                        {column.render
                          ? column.render(item)
                          : (item[column.key] ?? '—')}
                      </td>
                    ))}

                    {hasActions && (
                      <td className="admin-actions-cell">
                        <div className="admin-row-actions">
                          {renderActions?.(item, refresh)}

                          {deleteItem && (
                            canDelete?.(item) === false ? (
                              <span className="admin-action-unavailable">
                                Недоступно
                              </span>
                            ) : (
                              <button type="button" className="admin-delete-button" disabled={deleting} onClick={() => setItemToDelete(item)}>
                                Видалити
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-pagination">
          <span>Сторінка {page} із {Math.max(totalPages, 1)}</span>

          <div className="admin-pagination-actions">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>
              Назад
            </button>

            <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage(value => value + 1)}>
              Далі
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={itemToDelete !== null}
        title={`Видалення ${deleteLabel}`}
        message={
          `Ви впевнені, що хочете видалити ${deleteLabel} ` +
          `«${deleteName}»? Цю дію неможливо скасувати.`
        }
        confirmText="Видалити"
        cancelText="Скасувати"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) setItemToDelete(null);
        }}
      />
    </section>
  );
}
