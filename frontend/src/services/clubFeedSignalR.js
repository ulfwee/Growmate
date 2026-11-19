import * as signalR from '@microsoft/signalr';

const API = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5200'
).replace(/\/$/, '');

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