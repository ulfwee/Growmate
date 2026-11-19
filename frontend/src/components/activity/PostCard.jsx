import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsis, faPen, faTrash, faPaperclip } from '@fortawesome/free-solid-svg-icons';
import { faHeart, faComment as faCommentRegular } from '@fortawesome/free-regular-svg-icons';
import { faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons';
import { updatePost, deletePost, setPostReaction, removePostReaction } from '../../services/postsService';
import ConfirmDialog from '../ConfirmDialog';
import { useToast } from '../ToastProvider';
import Avatar from './Avatar';
import CommentSection from './CommentSection';
import { formatDate, POST_TYPES, attachmentUrl, attachmentLabel, isImageAttachment } from './activityUtils';

export default function PostCard({ post, userId, onRefresh, refreshVersion }) {
    const { showToast } = useToast();
    const [commentsOpen, setCommentsOpen] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [draft, setDraft] = useState(post.content);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const menuRef = useRef(null);

    const isOwner = String(post.userId) === String(userId);
    const isLiked = Boolean(post.myReaction);

    useEffect(() => {
        if (!menuOpen) return;

        const handleClick = (e) => {
            if (!menuRef.current?.contains(e.target)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

    const runAction = async (callback) => {
        setBusy(true);
        setError('');

        try {
            await callback();
            await onRefresh();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const handleLike = () => {
        runAction(() =>
            isLiked
                ? removePostReaction(post.id)
                : setPostReaction(post.id, 'like')
        );
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        if (!draft.trim()) return;

        runAction(async () => {
            await updatePost(post.id, {
                content: draft.trim(),
                imageUrl: post.imageUrl,
            });

            setEditing(false);
        });
    };

    const confirmDeletePost = async () => {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            await deletePost(post.id);
            setDeleteDialogOpen(false);
            showToast('Допис успішно видалено.');
            try {
                await onRefresh();
            } catch (refreshError) {
                console.error('Не вдалося оновити стрічку:', refreshError);
            }
        } catch (err) {
            setError(err.message || 'Не вдалося видалити допис.');
            showToast(err.message || 'Не вдалося видалити допис.', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <article className="feed-post">
            <div className="feed-post-header">
                <Avatar
                    username={post.username}
                    avatarUrl={post.avatarUrl}
                />

                <div className="feed-author">
                    <strong>{post.username}</strong>

                    <div className="feed-author-meta">
                        <span>{formatDate(post.createdAt)}</span>
                        <span className="feed-meta-dot">·</span>
                        <span className="feed-type-badge">{POST_TYPES[post.postType] || 'Оновлення'}</span>
                    </div>
                </div>

                {isOwner && (
                    <div className="feed-post-menu" ref={menuRef}>
                        <button
                            type="button"
                            className="feed-menu-trigger"
                            onClick={() => setMenuOpen(prev => !prev)}
                            aria-label="Дії з дописом"
                            aria-expanded={menuOpen}
                        >
                            <FontAwesomeIcon icon={faEllipsis} />
                        </button>

                        {menuOpen && (
                            <div className="feed-menu-dropdown">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDraft(post.content);
                                        setEditing(true);
                                        setMenuOpen(false);
                                    }}
                                >
                                    <FontAwesomeIcon icon={faPen} />
                                    Редагувати
                                </button>

                                <button
                                    type="button"
                                    className="danger"
                                    disabled={busy}
                                    onClick={() => { setMenuOpen(false); setDeleteDialogOpen(true); }}
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                    Видалити
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {editing ? (
                <form className="feed-edit" onSubmit={handleUpdate}>
                    <textarea
                        value={draft}
                        maxLength={5000}
                        onChange={e => setDraft(e.target.value)}
                    />

                    <div className="feed-edit-actions">
                        <button type="button" onClick={() => setEditing(false)}>
                            Скасувати
                        </button>

                        <button type="submit" disabled={busy || !draft.trim()}>
                            Зберегти
                        </button>
                    </div>
                </form>
            ) : (
                <p className="feed-post-text">{post.content}</p>
            )}

            {post.imageUrl && (isImageAttachment(post.imageUrl) ? (
                <img className="feed-post-image" src={attachmentUrl(post.imageUrl)} alt="Зображення до допису" loading="lazy" />
            ) : (
                <a className="feed-post-file" href={attachmentUrl(post.imageUrl)} target="_blank" rel="noopener noreferrer" download>
                    <FontAwesomeIcon icon={faPaperclip} /> <span>{attachmentLabel(post.imageUrl)}</span>
                </a>
            ))}

            <div className="feed-actions">
                <button type="button" className={`feed-like-button ${isLiked ? 'liked' : ''}`} disabled={busy} onClick={handleLike} aria-label={isLiked ? 'Прибрати вподобання' : 'Вподобати'} aria-pressed={isLiked}>
                    <FontAwesomeIcon icon={isLiked ? faHeartSolid : faHeart} /> <span>{post.reactionsCount || 0}</span>
                </button>
                <button type="button" className="feed-comment-button" onClick={() => setCommentsOpen((prev) => !prev)} aria-expanded={commentsOpen}>
                    <FontAwesomeIcon icon={faCommentRegular} /> <span>{post.commentsCount || 0}</span>
                </button>
            </div>

            {error && <p className="feed-error">{error}</p>}

            <ConfirmDialog
                open={deleteDialogOpen}
                title="Видалити допис?"
                message="Ви впевнені, що хочете видалити цей допис? Коментарі та реакції до нього також буде видалено."
                confirmText="Видалити допис"
                variant="danger"
                loading={busy}
                onCancel={() => { if (!busy) setDeleteDialogOpen(false); }}
                onConfirm={confirmDeletePost}
            />

            {commentsOpen && (
                <CommentSection
                    post={post}
                    userId={userId}
                    onCountChanged={onRefresh}
                    refreshVersion={refreshVersion}
                />
            )}
        </article>
    );
}