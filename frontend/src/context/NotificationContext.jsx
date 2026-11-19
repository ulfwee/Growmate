import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';

const NotificationContext = createContext(null);
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5200').replace(/\/$/, '').replace(/\/api$/, '');
const MAX_POPUPS = 3;

export function NotificationProvider({ userId, children }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [popups, setPopups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const connectionRef = useRef(null);
    const sessionRef = useRef(0);

    const refreshNotifications = useCallback(async () => {
        if (!userId) return;
        const session = sessionRef.current;

        try {
            setLoading(true);
            const data = await getNotifications(1, 20);
            if (session !== sessionRef.current) return;

            setNotifications(data.items ?? []);
            setUnreadCount(data.unreadCount ?? 0);
            setTotalCount(data.totalCount ?? 0);
        } catch (error) {
            console.error('Помилка завантаження сповіщень:', error);
        } finally {
            if (session === sessionRef.current) setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        sessionRef.current += 1;
        const session = sessionRef.current;

        setNotifications([]);
        setUnreadCount(0);
        setTotalCount(0);
        setPopups([]);

        if (!userId) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        let disposed = false;
        let startPromise = null;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_URL}/hubs/notifications`, {
                accessTokenFactory: () => localStorage.getItem('token') || '',
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        connectionRef.current = connection;

        const loadInitial = async () => {
            try {
                const data = await getNotifications(1, 20);
                if (disposed || session !== sessionRef.current) return;

                setNotifications(data.items ?? []);
                setUnreadCount(data.unreadCount ?? 0);
                setTotalCount(data.totalCount ?? 0);
            } catch (error) {
                if (!disposed) console.error('Помилка завантаження сповіщень:', error);
            }
        };

        const receiveNotification = notification => {
            if (disposed || session !== sessionRef.current) return;

            setNotifications(previous => {
                if (previous.some(item => item.id === notification.id)) return previous;
                return [notification, ...previous].slice(0, 20);
            });

            setUnreadCount(previous => previous + 1);
            setTotalCount(previous => previous + 1);
            setPopups(previous => [
                notification,
                ...previous.filter(item => item.id !== notification.id),
            ].slice(0, MAX_POPUPS));
        };

        connection.on('ReceiveNotification', receiveNotification);
        connection.onreconnected(() => {
            if (!disposed) loadInitial();
        });

        const start = async () => {
            try {
                await connection.start();
                if (!disposed) await loadInitial();
            } catch (error) {
                if (!disposed) {
                    console.error('Не вдалося підключитися до NotificationHub:', error);
                    await loadInitial();
                }
            }
        };

        startPromise = start();

        return () => {
            disposed = true;
            connection.off('ReceiveNotification', receiveNotification);
            if (connectionRef.current === connection) connectionRef.current = null;

            Promise.resolve(startPromise)
                .then(() => connection.stop())
                .catch(error => console.error('Помилка зупинки SignalR:', error));
        };
    }, [userId]);

    const loadMore = useCallback(async () => {
        if (!userId || loadingMore) return;

        const session = sessionRef.current;
        const nextPage = Math.floor(notifications.length / 20) + 1;

        try {
            setLoadingMore(true);
            const data = await getNotifications(nextPage, 20);
            if (session !== sessionRef.current) return;

            setNotifications(previous => {
                const ids = new Set(previous.map(item => item.id));
                const newItems = (data.items ?? []).filter(item => !ids.has(item.id));
                return [...previous, ...newItems];
            });

            setUnreadCount(data.unreadCount ?? 0);
            setTotalCount(data.totalCount ?? 0);
        } catch (error) {
            console.error('Не вдалося завантажити сповіщення:', error);
            throw error;
        } finally {
            if (session === sessionRef.current) setLoadingMore(false);
        }
    }, [userId, loadingMore, notifications.length]);

    const markAsRead = useCallback(async id => {
        await markNotificationAsRead(id);
        setNotifications(previous => previous.map(item =>
            item.id === id ? { ...item, isRead: true } : item
        ));

        const data = await getNotifications(1, 20);
        setUnreadCount(data.unreadCount ?? 0);
    }, []);

    const markAllAsRead = useCallback(async () => {
        await markAllNotificationsAsRead();
        setNotifications(previous => previous.map(item => ({ ...item, isRead: true })));
        setUnreadCount(0);
    }, []);

    const dismissPopup = useCallback(id => {
        setPopups(previous => previous.filter(item => item.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications, unreadCount, totalCount, popups, loading, loadingMore,
            refreshNotifications, loadMore, markAsRead, markAllAsRead, dismissPopup,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications потребує NotificationProvider.');
    return context;
}