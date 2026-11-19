import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { getAchievementsWithStatus } from '../../services/achievementsService';
import { getAchievementImage } from '../../data/achievementImages';
import '../../css/ProfilePage.css';

export default function ProfileAchievements() {
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const scrollRef = useRef(null);

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const data = await getAchievementsWithStatus();
                if (!active) return;
                setAchievements(data.filter(item => item.isEarned).sort(
                    (a, b) => new Date(b.earnedAt ?? 0) - new Date(a.earnedAt ?? 0)
                ));
            } catch {
                if (active) setError('Не вдалося завантажити досягнення.');
            } finally {
                if (active) setLoading(false);
            }
        }

        load();
        return () => { active = false; };
    }, []);

    const scroll = direction => {
        if (!scrollRef.current) return;
        const card = scrollRef.current.querySelector('.gm-profile-achievement');
        const distance = card ? card.getBoundingClientRect().width + 20 : 220;
        scrollRef.current.scrollBy({ left: direction * distance, behavior: 'smooth' });
    };

    return (
        <section className="gm-profile-achievements">
            <div className="gm-profile-achievements-header">
                <div>
                    <h2>Мої досягнення</h2>
                    <p>Нагороди, які ти вже здобула на шляху до своїх цілей.</p>
                </div>

                <div className="gm-profile-achievements-actions">
                    <Link to="/achievements">Усі досягнення <FontAwesomeIcon icon={faArrowRight} /></Link>
                    {achievements.length > 0 && (
                        <div className="gm-profile-achievements-controls">
                            <button type="button" aria-label="Попередні досягнення" onClick={() => scroll(-1)}>
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </button>
                            <button type="button" aria-label="Наступні досягнення" onClick={() => scroll(1)}>
                                <FontAwesomeIcon icon={faChevronRight} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <p className="gm-profile-muted">Завантаження досягнень...</p>
            ) : error ? (
                <p className="gm-profile-muted" role="alert">{error}</p>
            ) : achievements.length === 0 ? (
                <div className="gm-profile-achievements-empty">
                    <p>Поки немає отриманих досягнень. Створи першу ціль або виконай завдання, щоб отримати свою першу нагороду.</p>
                    <Link to="/achievements">Переглянути нагороди</Link>
                </div>
            ) : (
                <div className="gm-profile-achievements-track" ref={scrollRef}>
                    {achievements.map(achievement => (
                        <div key={achievement.achievementId ?? achievement.id} className="gm-profile-achievement">
                            <img src={getAchievementImage(achievement)} alt={achievement.name} />
                            <span>{achievement.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}