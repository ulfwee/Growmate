import React, { useEffect, useState } from 'react';
import { getLeaderboard } from '../services/leaderboardService';
import '../css/StatisticsPage.css';
const formatXp = (xp) => new Intl.NumberFormat('uk-UA').format(xp ?? 0);
const confettiColors = ['#9672c2', '#e9bd64', '#db92b5', '#8dbba7', '#d7c0f0', '#f1a6a6'];
const confetti = Array.from({ length: 110 }, (_, i) => ({
    id: i,
    left: `${(i * 37.7) % 100}%`,
    delay: `${(i * 0.073) % 2.3}s`,
    duration: `${3.1 + (i % 7) * 0.25}s`,
    drift: `${((i * 17) % 160) - 80}px`,
    rotation: `${360 + (i % 5) * 140}deg`,
    color: confettiColors[i % confettiColors.length],
    width: i % 4 === 0 ? '6px' : '9px',
    height: i % 3 === 0 ? '9px' : '15px',
}));
function Avatar({ person, large = false }) {
    const initials = (person?.displayName || person?.username || '?').trim().charAt(0).toUpperCase();
    const className = `lb-avatar ${large ? 'lb-avatar-large' : ''}`;
    return person?.avatarUrl ? (<img className={className} src={person.avatarUrl} alt={person.displayName || person.username || ''} />) : (<span className={`${className} lb-avatar-fallback`}>{initials}</span>);
}
function PodiumPlace({ person, place }) {
    return (<div className={`lb-place lb-place-${place} ${person?.isCurrentUser ? 'lb-place-mine' : ''}`}>
        {person && (<>
            <div className="lb-person">
                <div className="lb-avatar-wrap">
                    {place === 1 && <span className="lb-crown" aria-hidden="true">♛</span>}
                    <Avatar person={person} large />
                </div>
                <strong title={person.displayName}>{person.displayName}</strong>
                <span>{formatXp(person.totalXp)} XP</span>
                {person.isCurrentUser && <small className="lb-you-label">Це ти!</small>}
            </div>
            <div className="lb-column"><span>{place}</span></div>
        </>)}
    </div>);
}
function ConfettiEffect() {
    return (<div className="lb-confetti" aria-hidden="true">
        {confetti.map((piece) => (<i key={piece.id} style={{
            left: piece.left,
            width: piece.width,
            height: piece.height,
            backgroundColor: piece.color,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            '--confetti-drift': piece.drift,
            '--confetti-rotation': piece.rotation,
        }} />))}
    </div>);
}
export default function StatisticsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await getLeaderboard();
            setData(result);
        }
        catch (e) {
            setData(null);
            setError(e.message || 'Не вдалося завантажити рейтинг.');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);
    const podium = data?.topThree || [];
    const otherUsers = data?.otherUsers || [];
    const isWinner = data?.currentUser?.rank === 1 && data?.totalUsers > 0;
    return (<main className="lb-page">
        {data && isWinner && <ConfettiEffect />}
        <div className="lb-content">
            <div className="lb-heading">
                <span className="lb-eyebrow">СПІЛЬНОТА GROWMATE</span>
                <h1>Рейтинг користувачів</h1>
                <p>Розвивайся, виконуй завдання та піднімайся у загальному рейтингу за XP.</p>
                {data && (<div className="lb-heading-meta">
                    <span>Учасників: <strong>{data.totalUsers}</strong></span>
                    {data.currentUser && (<>
                        <span className="lb-meta-divider" />
                        <span>Твоє місце: <strong>#{data.currentUser.rank}</strong></span>
                        <span className="lb-meta-divider" />
                        <span>Твій досвід: <strong>{formatXp(data.currentUser.totalXp)} XP</strong></span>
                    </>)}
                </div>)}
            </div>
            {loading && <p className="lb-message">Завантаження рейтингу...</p>}
            {error && (<div className="lb-message lb-error">
                {error}
                <button type="button" onClick={load}>Повторити</button>
            </div>)}
            {!loading && data && (<>
                {podium.length > 0 ? (<section className="lb-podium-section" aria-label="Трійка лідерів">
                    <div className="lb-podium">
                        <PodiumPlace person={podium[1]} place={2} />
                        <PodiumPlace person={podium[0]} place={1} />
                        <PodiumPlace person={podium[2]} place={3} />
                    </div>
                    <div className="lb-podium-base" />
                </section>) : (<p className="lb-message">Поки немає користувачів у рейтингу.</p>)}
                {otherUsers.map((person) => (<div key={person.id} className={`lb-row ${person.isCurrentUser ? 'lb-row-mine' : ''}`}>
                    <span className="lb-rank">{person.rank}</span>
                    <Avatar person={person} />
                    <div className="lb-row-name">
                        <strong>{person.displayName}</strong>
                        {person.isCurrentUser && <span>Це ти!</span>}
                    </div>
                    <strong className="lb-row-xp">{formatXp(person.totalXp)} XP</strong>
                </div>))}
            </>)}
        </div>
    </main>);
}