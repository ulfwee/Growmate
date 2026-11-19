import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faArrowLeft, faComment, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { getClubs } from '../services/clubsService';
import { createClubFeedConnection } from '../services/clubFeedSignalR';
import { getClubPosts, createPost, uploadPostAttachment } from '../services/postsService';
import ClubSidebar from '../components/activity/ClubSidebar';
import PostComposer from '../components/activity/PostComposer';
import PostFilters from '../components/activity/PostFilters';
import PostCard from '../components/activity/PostCard';
import MembersPanel from '../components/activity/MembersPanel';
import { API_ORIGIN } from '../components/activity/activityUtils';
import '../css/ActivityPage.css';

export default function ActivityPage({ user, onUserStatsChanged }) {
  const [params, setParams] = useSearchParams();
  const selectedClubId = params.get('club') || params.get('clubId');

  const [clubs, setClubs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('new');

  const [clubsLoading, setClubsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);

  const [error, setError] = useState('');
  const [clubsError, setClubsError] = useState('');

  const [search, setSearch] = useState('');
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!attachment || !attachment.type.startsWith('image/')) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(attachment);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  const chooseAttachment = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = /\.(jpe?g|png|webp|pdf|docx|txt)$/i;
    if (!allowed.test(file.name)) { setError('Дозволено JPG, PNG, WebP, PDF, DOCX і TXT.'); event.target.value = ''; return; }
    if (file.size > 10 * 1024 * 1024) { setError('Максимальний розмір файлу — 10 МБ.'); event.target.value = ''; return; }
    setAttachment(file);
    setError('');
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const [postType, setPostType] = useState('update');
  const [submitting, setSubmitting] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);

  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let active = true;

    const loadClubs = async () => {
      try {
        const data = await getClubs();
        if (!active) return;

        const mine = (Array.isArray(data) ? data : []).filter(
          (club) => club.isMember || club.isOwner
        );

        setClubs(mine);

        const currentId = new URLSearchParams(
          window.location.search
        ).get('club');

        const exists = mine.some(
          (club) => String(club.id) === String(currentId)
        );

        if (!exists && mine.length) {
          setParams(
            { club: String(mine[0].id) },
            { replace: true }
          );
        }
      } catch (err) {
        if (active) setClubsError(err.message);
      } finally {
        if (active) setClubsLoading(false);
      }
    };

    loadClubs();

    return () => {
      active = false;
    };
  }, [setParams]);

  useEffect(() => {
    if (!selectedClubId) { setMembers([]); return; }
    let active = true;
    setMembersLoading(true);
    setMembersError('');
    const token = localStorage.getItem('token');
    fetch(`${API_ORIGIN}/api/clubs/${selectedClubId}/members`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => { if (active) setMembers(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) { setMembers([]); setMembersError('Не вдалося завантажити учасників.'); } })
      .finally(() => { if (active) setMembersLoading(false); });
    return () => { active = false; };
  }, [selectedClubId]);

  const visiblePosts = useMemo(() => {
    const filtered = filter === 'all' ? posts : posts.filter((post) => post.postType === filter);
    return [...filtered].sort((a, b) => {
      const difference = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sort === 'old' ? difference : -difference;
    });
  }, [posts, filter, sort]);

  const selectedClub = clubs.find(
    (club) => String(club.id) === String(selectedClubId)
  );

  const refreshPosts = useCallback(async () => {
    if (!selectedClubId) {
      setPosts([]);
      return;
    }

    const data = await getClubPosts(selectedClubId);
    setPosts(Array.isArray(data) ? data : []);
  }, [selectedClubId]);

  useEffect(() => {
    if (!selectedClubId) return;

    let disposed = false;
    const connection = createClubFeedConnection();

    const refresh = () => {
      if (disposed) return;

      refreshPosts().catch(console.error);
      setRefreshVersion((prev) => prev + 1);
    };

    [
      'PostCreated',
      'PostUpdated',
      'PostDeleted',
      'CommentCreated',
      'CommentUpdated',
      'CommentDeleted',
      'ReactionChanged',
    ].forEach((event) => connection.on(event, refresh));

    const joinClub = async () => {
      if (disposed) return;

      await connection.invoke('JoinClub', Number(selectedClubId));
      refresh();
    };

    connection.onreconnected(() => {
      joinClub().catch(console.error);
    });

    const start = async () => {
      try {
        await connection.start();

        if (disposed) {
          await connection.stop();
          return;
        }

        await joinClub();
      } catch (err) {
        if (!disposed) {
          console.error('Помилка SignalR:', err);
        }
      }
    };

    start();

    return () => {
      disposed = true;

      if (connection.state === 'Connected') {
        connection.stop().catch(console.error);
      }
    };
  }, [selectedClubId, refreshPosts]);

  useEffect(() => {
    let active = true;

    setPosts([]);
    setPostsLoading(true);
    setError('');

    if (!selectedClubId) {
      setPostsLoading(false);
      return;
    }

    getClubPosts(selectedClubId)
      .then((data) => {
        if (active) {
          setPosts(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setPostsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedClubId]);

  const handlePublish = async (e) => {
    e.preventDefault();

    if ((!content.trim() && !attachment) || !selectedClub || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const uploaded = attachment ? await uploadPostAttachment(selectedClub.id, attachment) : null;
      await createPost({
        clubId: selectedClub.id,
        content: content.trim() || 'Вкладення',
        postType,
        imageUrl: uploaded?.url ?? null,
      });
      await onUserStatsChanged?.();

      setContent('');
      clearAttachment();
      setPostType('update');
      setComposerExpanded(false);

      await refreshPosts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClubs = useMemo(
    () =>
      clubs.filter((club) =>
        (club.name || '')
          .toLocaleLowerCase('uk')
          .includes(search.toLocaleLowerCase('uk'))
      ),
    [clubs, search]
  );

  const selectClub = (clubId) => {
    setParams({ club: String(clubId) });
    setContent('');
    clearAttachment();
    setComposerExpanded(false);
  };

  return (
    <main className="feed-page">
      <div className="feed-layout">
        <aside className="feed-sidebar">
          <div className="feed-sidebar-top">
            <div className="feed-sidebar-head">
              <div>
                <span className="feed-sidebar-label">СПІЛЬНОТИ</span>
                <h2>Мої клуби</h2>
              </div>

              <span className="feed-clubs-count">{clubs.length}</span>
            </div>

            <div className="feed-search-wrapper">
              <FontAwesomeIcon icon={faMagnifyingGlass} />

              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Пошук клубу..."
              />
            </div>
          </div>

          <div className="feed-sidebar-list">
            {clubsLoading && (
              <p className="feed-sidebar-message">
                Завантаження клубів...
              </p>
            )}

            {clubsError && <p className="feed-error">{clubsError}</p>}

            {!clubsLoading &&
              filteredClubs.map((club) => (
                <button
                  type="button"
                  key={club.id}
                  className={`feed-club ${String(selectedClubId) === String(club.id)
                    ? 'active'
                    : ''
                    }`}
                  onClick={() => selectClub(club.id)}
                >
                  <span className="feed-club-icon">
                    {club.coverUrl ? (
                      <img src={attachmentUrl(club.coverUrl)} alt="" loading="lazy" />
                    ) : (
                      <FontAwesomeIcon icon={faUsers} />
                    )}
                  </span>

                  <span className="feed-club-info">
                    <strong>{club.name}</strong>
                    <small>
                      <FontAwesomeIcon icon={faUsers} />
                      {club.membersCount ?? 0} учасників
                    </small>
                  </span>
                </button>
              ))}

            {!clubsLoading && !filteredClubs.length && (
              <p className="feed-sidebar-message">
                {clubs.length
                  ? 'Клубів не знайдено.'
                  : 'Ви ще не приєдналися до клубів.'}
              </p>
            )}
          </div>

          <div className="feed-sidebar-footer">
            <Link to="/clubs">
              <FontAwesomeIcon icon={faPlus} />
              Знайти нові клуби
              <FontAwesomeIcon icon={faArrowRight} />
            </Link>
          </div>
        </aside>

        <section className="feed-main">
          <div className="feed-main-content">
            {!selectedClub ? (
              <div className="feed-empty-state">
                <FontAwesomeIcon icon={faUsers} />
                <h3>Оберіть клуб</h3>
                <p>
                  Виберіть спільноту в лівій панелі,
                  щоб переглянути її дописи.
                </p>
              </div>
            ) : (
              <>
                <header className="feed-club-heading">
                  <div className="feed-current-club">
                    <Link className="feed-back" to={`/clubs/${selectedClub.id}`} aria-label="Повернутися до клубу" title="Повернутися до клубу">
                      <FontAwesomeIcon icon={faArrowLeft} />
                    </Link>
                    <h2>{selectedClub.name}</h2>
                  </div>
                  <div className="feed-club-heading-actions">
                    <span><FontAwesomeIcon icon={faUsers} /> {selectedClub.membersCount ?? 0} учасників</span>
                  </div>
                </header>

                <PostComposer user={user} handlePublish={handlePublish} content={content} setContent={setContent} composerExpanded={composerExpanded} setComposerExpanded={setComposerExpanded} fileInputRef={fileInputRef} chooseAttachment={chooseAttachment} attachment={attachment} previewUrl={previewUrl} clearAttachment={clearAttachment} submitting={submitting} postType={postType} setPostType={setPostType} />
                <div className="feed-posts-section">
                  <PostFilters filter={filter} setFilter={setFilter} sort={sort} setSort={setSort} />

                  {error && (
                    <p className="feed-error" role="alert">
                      {error}
                    </p>
                  )}

                  {postsLoading ? (
                    <div className="feed-empty-state">
                      Завантаження дописів...
                    </div>
                  ) : visiblePosts.length ? (
                    visiblePosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        userId={user?.id}
                        onRefresh={refreshPosts}
                        refreshVersion={refreshVersion}
                      />
                    ))
                  ) : (
                    !error && (
                      <div className="feed-empty-state">
                        <FontAwesomeIcon icon={faComment} />
                        <h3>Тут поки немає дописів</h3>
                        <p>
                          Станьте першим, хто поділиться своїм прогресом!
                        </p>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </section>
        <MembersPanel selectedClub={selectedClub} members={members} membersLoading={membersLoading} membersError={membersError} />
      </div>
    </main>
  );
}