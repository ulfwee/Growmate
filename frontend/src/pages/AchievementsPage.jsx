import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAward, faCheckCircle, faLock } from '@fortawesome/free-solid-svg-icons';
import { getAchievementsWithStatus } from '../services/achievementsService';
import { getAchievementImage } from '../data/achievementImages';
import '../css/AchievementsPage.css';

export default function AchievementsPage() {
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function loadAchievements() {
            try {
                setLoading(true);
                setError('');

                const result = await getAchievementsWithStatus();
                if (!active) return;

                setAchievements(result);
            } catch (err) {
                console.error('Помилка завантаження досягнень:', err);
                if (active) setError('Не вдалося завантажити досягнення.');
            } finally {
                if (active) setLoading(false);
            }
        }

        loadAchievements();

        return () => {
            active = false;
        };
    }, []);

    const earnedCount = useMemo(
        () => achievements.filter(item => item.isEarned).length,
        [achievements]
    );

    return (
        <main className="gm-achievements-page">
            <div className="gm-achievements-container">
                <header className="gm-achievements-header">
                    <div className="gm-achievements-heading">
                        <span className="gm-achievements-eyebrow">
                            <FontAwesomeIcon icon={faAward} />
                            Твоя колекція нагород
                        </span>

                        <h1>Мої досягнення</h1>
                        <p>
                            Кожен крок до мети має значення.
                            Збирай нагороди за свої успіхи та активність.
                        </p>
                    </div>

                    <div className="gm-achievements-progress">
                        <span>Відкрито досягнень</span>
                        <strong>
                            {earnedCount}
                            <small> / {achievements.length}</small>
                        </strong>

                        <div className="gm-achievements-progress-track">
                            <div
                                style={{
                                    width: achievements.length
                                        ? `${(earnedCount / achievements.length) * 100}%`
                                        : '0%',
                                }}
                            />
                        </div>
                    </div>
                </header>

                {loading ? (
                    <p className="gm-achievements-message">Завантаження досягнень...</p>
                ) : error ? (
                    <p className="gm-achievements-message" role="alert">{error}</p>
                ) : achievements.length === 0 ? (
                    <p className="gm-achievements-message">Досягнень поки немає.</p>
                ) : (
                    <div className="gm-achievements-grid">
                        {achievements.map(achievement => (
                            <article
                                key={achievement.id}
                                className={`gm-achievement-item ${achievement.isEarned
                                    ? 'gm-achievement-item--earned'
                                    : 'gm-achievement-item--locked'}`}
                            >
                                <div
                                    className={`gm-achievement-image-wrap ${!achievement.isEarned
                                        ? 'gm-achievement-has-tooltip'
                                        : ''}`}
                                    tabIndex={!achievement.isEarned ? 0 : undefined}
                                    aria-label={!achievement.isEarned
                                        ? `${achievement.name}. Як отримати: ${achievement.description}`
                                        : undefined}
                                >
                                    <img
                                        src={getAchievementImage(achievement)}
                                        alt={achievement.isEarned ? achievement.name : 'Заблоковане досягнення'}
                                        className="gm-achievement-image"
                                    />

                                    {!achievement.isEarned && (
                                        <div className="gm-achievement-tooltip" role="tooltip">
                                            <span className="gm-achievement-tooltip-title">
                                                <FontAwesomeIcon icon={faLock} />
                                                Як отримати?
                                            </span>
                                            <p>{achievement.description}</p>
                                        </div>
                                    )}
                                </div>

                                <h3>{achievement.name}</h3>

                                {achievement.isEarned && (
                                    <div className="gm-achievement-details">
                                        <span className="gm-achievement-earned-label">
                                            <FontAwesomeIcon icon={faCheckCircle} />
                                            Отримано
                                        </span>
                                        <p>{achievement.description}</p>

                                        {achievement.earnedAt && (
                                            <time dateTime={achievement.earnedAt}>
                                                {new Date(achievement.earnedAt).toLocaleDateString('uk-UA')}
                                            </time>
                                        )}
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}