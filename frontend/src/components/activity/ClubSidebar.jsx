import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faPlus, faArrowRight, faUsers } from '@fortawesome/free-solid-svg-icons';
import { attachmentUrl } from './activityUtils';

export default function ClubSidebar({ clubs, filteredClubs, selectedClubId, search, onSearchChange, onSelectClub, clubsLoading, clubsError }) {
    return (
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
                        onChange={event => onSearchChange(event.target.value)}
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
                            onClick={() => onSelectClub(club.id)}
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

    );
}