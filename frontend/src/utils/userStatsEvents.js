export const USER_STATS_UPDATED = 'growmate:user-stats-updated';

export function notifyUserStatsUpdated() {
  window.dispatchEvent(new Event(USER_STATS_UPDATED));
}