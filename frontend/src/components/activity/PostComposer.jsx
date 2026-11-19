import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faXmark, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import CustomSelect from '../CustomSelect';
import Avatar from './Avatar';

export default function PostComposer({ user, handlePublish, content, setContent, composerExpanded, setComposerExpanded, fileInputRef, chooseAttachment, attachment, previewUrl, clearAttachment, submitting, postType, setPostType }) {
    return (
        <form className="feed-composer" onSubmit={handlePublish}>
            <div className="feed-composer-top">
                <Avatar
                    username={user?.username}
                    avatarUrl={user?.avatarUrl}
                />

                <textarea
                    value={content}
                    maxLength={5000}
                    rows={composerExpanded ? 4 : 2}
                    onFocus={() => setComposerExpanded(true)}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Чим ви хочете поділитися сьогодні?"
                />
            </div>

            <div className="feed-attachment-area">
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.txt" hidden onChange={chooseAttachment} />
                {attachment && (
                    <div className="feed-attachment-preview">
                        {previewUrl ? <img src={previewUrl} alt="Попередній перегляд" /> : <FontAwesomeIcon icon={faPaperclip} />}
                        <span title={attachment.name}>{attachment.name} ({(attachment.size / 1024 / 1024).toFixed(2)} МБ)</span>
                        <button type="button" onClick={clearAttachment} aria-label="Прибрати вкладення"><FontAwesomeIcon icon={faXmark} /></button>
                    </div>
                )}
                <div className="feed-composer-tools">
                    <button type="button" className="feed-attach-button" disabled={submitting} onClick={() => fileInputRef.current?.click()} title="Прикріпити файл" aria-label="Прикріпити файл">
                        <FontAwesomeIcon icon={faPaperclip} />
                    </button>
                    <span className="feed-attachment-hint">{attachment ? 'Файл додано' : ''}</span>
                </div>
            </div>
            <div className="feed-composer-bottom">
                <div className="feed-post-type">
                    <CustomSelect
                        value={postType}
                        onChange={setPostType}
                        disabled={submitting}
                        placeholder="Тип допису"
                        options={[
                            { value: 'update', label: 'Оновлення' },
                            { value: 'report', label: 'Звіт про прогрес' },
                            { value: 'achievement', label: 'Досягнення' },
                        ]}
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting || (!content.trim() && !attachment)}
                >
                    <FontAwesomeIcon icon={faPaperPlane} />
                    {submitting ? 'Публікація...' : 'Опублікувати'}
                </button>
            </div>
        </form>

    );
}