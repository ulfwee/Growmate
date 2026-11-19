import React, { useCallback, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { getPostComments, createPostComment, deletePostComment } from '../../services/postsService';
import ConfirmDialog from '../ConfirmDialog';
import { useToast } from '../ToastProvider';
import Avatar from './Avatar';
import { formatDate } from './activityUtils';

export default function CommentSection({ post, userId, onCountChanged, refreshVersion }) {
    const { showToast } = useToast();
    const [comments, setComments] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [showAllComments, setShowAllComments] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState(null);
    const loadComments = useCallback(async () => {
        try {
            const data = await getPostComments(post.id);
            setComments(Array.isArray(data) ? data : []);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [post.id]);

    useEffect(() => {
        loadComments();
    }, [loadComments, refreshVersion]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!text.trim() || busy) return;

        setBusy(true);
        setError('');

        try {
            await createPostComment(post.id, text.trim());
            setText('');
            await loadComments();
            await onCountChanged();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const confirmDeleteComment = async () => {
        if (commentToDelete === null || busy) return;
        setBusy(true);
        setError('');
        try {
            await deletePostComment(post.id, commentToDelete);
            setCommentToDelete(null);
            setComments(current => current.filter(comment => String(comment.id) !== String(commentToDelete)));
            showToast('Коментар успішно видалено.');
            try {
                await loadComments();
                await onCountChanged();
            } catch (refreshError) {
                console.error('Не вдалося оновити коментарі:', refreshError);
            }
        } catch (err) {
            setError(err.message || 'Не вдалося видалити коментар.');
            showToast(err.message || 'Не вдалося видалити коментар.', 'error');
        } finally {
            setBusy(false);
        }
    };

    const sortedComments = [...comments].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    const visibleComments = showAllComments
        ? sortedComments
        : sortedComments.slice(-3);

    return (
        <section className="feed-comments">

            {error && <p className="feed-error">{error}</p>}

            {loading ? (
                <p className="feed-muted">Завантаження коментарів...</p>
            ) : (
                <div className="feed-comments-list">
                    {visibleComments.map((comment) => (<div className="feed-comment" key={comment.id}>
                        <Avatar
                            username={comment.username}
                            avatarUrl={comment.avatarUrl}
                            small
                        />

                        <div className="feed-comment-content">
                            <div className="feed-comment-meta">
                                <strong>{comment.username}</strong>
                                <small>{formatDate(comment.createdAt)}</small>
                            </div>

                            <p>{comment.content}</p>
                        </div>

                        {String(comment.userId) === String(userId) && (
                            <button
                                type="button"
                                className="feed-comment-delete"
                                disabled={busy}
                                onClick={() => setCommentToDelete(comment.id)}
                                title="Видалити коментар"
                                aria-label="Видалити коментар"
                            >
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        )}
                    </div>
                    ))}

                    {comments.length > 3 && (
                        <button
                            type="button"
                            className="feed-comments-toggle"
                            onClick={() => setShowAllComments(prev => !prev)}
                        >
                            {showAllComments
                                ? 'Згорнути коментарі'
                                : `Переглянути всі коментарі (${comments.length})`
                            }
                        </button>
                    )}

                    {!comments.length && (
                        <p className="feed-muted">
                            Коментарів ще немає. Будьте першими!
                        </p>
                    )}
                </div>
            )}

            <form className="feed-comment-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={text}
                    maxLength={2000}
                    onChange={e => setText(e.target.value)}
                    placeholder="Напишіть коментар..."
                    aria-label="Новий коментар"
                />

                <button
                    type="submit"
                    disabled={!text.trim() || busy}
                    aria-label="Надіслати коментар"
                >
                    <FontAwesomeIcon icon={faPaperPlane} />
                </button>
            </form>
            <ConfirmDialog
                open={commentToDelete !== null}
                title="Видалити коментар?"
                message="Ви впевнені, що хочете видалити цей коментар? Цю дію неможливо скасувати."
                confirmText="Видалити коментар"
                variant="danger"
                loading={busy}
                onCancel={() => { if (!busy) setCommentToDelete(null); }}
                onConfirm={confirmDeleteComment}
            />
        </section>
    );
}