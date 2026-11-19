import * as signalR from '@microsoft/signalr';

const API = import.meta.env.API_URL;

export function createClubFeedConnection() {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${API}/hubs/club-feed`, {
      accessTokenFactory: () =>
        localStorage.getItem('token') || '',
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build();
}