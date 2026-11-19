import React from 'react';
import Avatar from './Avatar';

export default function MembersPanel({ selectedClub, members, membersLoading, membersError }) {
    return (
        <aside className="feed-members-panel" aria-label="Учасники клубу">
            {selectedClub && (
                <div className="feed-members-card">
                    <div className="feed-members-head"><h3>Учасники клубу</h3><span>{selectedClub.membersCount ?? members.length}</span></div>
                    {membersLoading && <p className="feed-muted">Завантаження...</p>}
                    {membersError && <p className="feed-muted">{membersError}</p>}
                    {!membersLoading && !membersError && members.map((member) => {
                        const name = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.username || 'Учасник';
                        const owner = String(member.userId ?? member.id) === String(selectedClub.ownerId) || member.role === 'owner';
                        return (
                            <div className="feed-member" key={member.userId ?? member.id}>
                                <Avatar username={name} avatarUrl={member.avatarUrl} />
                                <div className="feed-member-info"><strong>{name}</strong><small>{owner ? 'Засновник' : 'Учасник'}</small></div>
                            </div>
                        );
                    })}
                    {!membersLoading && !membersError && !members.length && <p className="feed-muted">Список учасників порожній.</p>}
                </div>
            )}
        </aside>
    );
}