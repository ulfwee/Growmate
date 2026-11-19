import { apiCall } from './api';

export const getAllAchievements = () =>
    apiCall('/achievements');

export const getMyAchievements = () =>
    apiCall('/achievements/my');

const extractItems = response => {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.items)) {
        return response.items;
    }

    return [];
};

export const getAchievementsWithStatus = async () => {
    const [allResponse, myResponse] = await Promise.all([
        getAllAchievements(),
        getMyAchievements(),
    ]);

    const all = extractItems(allResponse);
    const mine = extractItems(myResponse);

    const earnedMap = new Map();

    mine.forEach(item => {
        const achievement = item.achievement ?? item;

        const achievementId =
            item.achievementId ??
            achievement.id;

        if (achievementId != null) {
            earnedMap.set(Number(achievementId), item);
        }
    });

    return all.map(achievement => {
        const earned = earnedMap.get(Number(achievement.id));

        return {
            ...achievement,
            isEarned: Boolean(earned),
            earnedAt: earned?.earnedAt ?? null,
        };
    });
};