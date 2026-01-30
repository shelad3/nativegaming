import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '../services/api';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    connectWithToken: (token: string) => void;
    disconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    connectWithToken: () => { },
    disconnect: () => { }
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const lastTokenRef = React.useRef<string | null | undefined>(undefined);
    const socketRef = React.useRef<Socket | null>(null);

    const initSocket = useCallback((token?: string | null) => {
        const getSocketUrl = () => {
            if (typeof window !== 'undefined') {
                return `http://${window.location.hostname}:5000`;
            }
            return 'http://localhost:5000';
        };

        const SOCKET_URL = getSocketUrl();
        const fetchedToken = token !== undefined ? token : getAuthToken();

        // ONLY RECONNECT IF TOKEN HAS CHANGED
        if (lastTokenRef.current === fetchedToken && socketRef.current) {
            console.log('[SOCKET] Token unchanged, skipping re-init');
            return;
        }

        console.log('[SOCKET] Initializing with token:', fetchedToken ? 'EXISTS' : 'NONE');
        lastTokenRef.current = fetchedToken;

        const socketInstance = io(SOCKET_URL, {
            transports: ['websocket'],
            autoConnect: true,
            auth: {
                token: fetchedToken
            }
        });

        socketInstance.on('connect', () => {
            console.log('Connected to WebSocket Server');
            setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
            console.log('Disconnected from WebSocket Server');
            setIsConnected(false);
        });

        socketInstance.on('connect_error', (err) => {
            console.error('Socket Connection Error:', err.message);
        });

        setSocket((prev) => {
            if (prev) {
                console.log('[SOCKET] Disconnecting previous instance');
                prev.disconnect();
            }
            socketRef.current = socketInstance;
            return socketInstance;
        });
    }, []); // Removed socket dependency to break the circle

    useEffect(() => {
        initSocket();

        return () => {
            setSocket((prev) => {
                if (prev) prev.disconnect();
                return null;
            });
        };
    }, []); // Run only once on mount

    const connectWithToken = useCallback((token: string) => {
        initSocket(token);
    }, [initSocket]);

    const disconnect = useCallback(() => {
        lastTokenRef.current = undefined;
        setSocket((prev) => {
            if (prev) prev.disconnect();
            return null;
        });
        setIsConnected(false);
    }, []);

    const contextValue = React.useMemo(() => ({
        socket,
        isConnected,
        connectWithToken,
        disconnect
    }), [socket, isConnected, connectWithToken, disconnect]);

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
};
