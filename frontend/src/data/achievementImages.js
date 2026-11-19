import firstStep from '../assets/FirstStepAchievement.png';
import firstResult from '../assets/FirstResultAchievement.png';
import teamPlayer from '../assets/TeamPlayerAchievement.png';
import activeMember from '../assets/ActiveMemberAchievement.png';
import persistence from '../assets/PersistenceAchievement.png';
import reachedGoal from '../assets/ReachedGoalAchievement.png';
import communityVoice from '../assets/VoiceOfCommunityAchievement.png';
import locked from '../assets/NotReachedAchievement.png';

const imagesByCode = {
    FIRST_GOAL_CREATED: firstStep,
    FIRST_TASK: firstResult,
    FIRST_CLUB: teamPlayer,
    FIRST_POST: activeMember,
    STREAK_7: persistence,
    FIRST_GOAL: reachedGoal,
    POSTS_5: communityVoice,
};

const imagesByName = {
    'Перший крок': firstStep,
    'Перший результат': firstResult,
    'Командний гравець': teamPlayer,
    'Активний учасник': activeMember,
    'Наполегливість': persistence,
    'Досягнута мета': reachedGoal,
    'Голос спільноти': communityVoice,
};

export function getAchievementImage(achievement) {
    if (!achievement.isEarned) {
        return locked;
    }

    return (
        imagesByCode[achievement.code] ||
        imagesByName[achievement.name] ||
        locked
    );
}
