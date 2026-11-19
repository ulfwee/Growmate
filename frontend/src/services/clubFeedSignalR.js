import * as signalR from '@microsoft/signalr';
import { API_ORIGIN } from '../components/activity/activityUtils';

export function createClubFeedConnection() {
    const hubUrl = `${API_ORIGIN}/hubs/club-feed`;

    console.log('ClubFeed SignalR URL:', hubUrl);

    return new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
            accessTokenFactory: () =>
                localStorage.getItem('token') || '',
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();
}