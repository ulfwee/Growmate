import '../css/LevelProgress.css';

export default function LevelProgress({ stats, compact = false }) {
  if (!stats) return null;

  const { level, totalXp, xpInLevel, xpForNextLevel, xpRemaining, levelProgressPercent } = stats;

  return (
    <div className={`level-progress ${compact ? 'level-progress--compact' : ''}`}>
      <div className="level-progress__top">
        <div className="level-progress__identity">
          <span className="level-progress__icon">✦</span>
          <div><h3>Lv. {level}</h3></div>
        </div>
      </div>

      <div
        className="level-progress__track" role="progressbar"
        aria-valuenow={levelProgressPercent} aria-valuemin={0} aria-valuemax={100}
        aria-label="Прогрес до наступного рівня"
      >
        <div className="level-progress__fill" style={{ width: `${Math.min(100, Math.max(0, levelProgressPercent))}%` }} />
      </div>

      {!compact && (
        <div className="level-progress__bottom">
          <span>{xpInLevel} / {xpForNextLevel} XP</span>
          <span>Ще {xpRemaining} XP до {level + 1} рівня</span>
        </div>
      )}
    </div>
  );
}