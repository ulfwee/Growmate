import React from 'react';
import { initials, attachmentUrl } from './activityUtils';

export default function Avatar({ username, avatarUrl, small = false }) {
    return (
        <div className={`feed-avatar ${small ? 'feed-avatar-small' : ''}`}>
            {avatarUrl ? (
                <img src={attachmentUrl(avatarUrl)} alt="" />
            ) : (
                initials(username)
            )}
        </div>
    );
}