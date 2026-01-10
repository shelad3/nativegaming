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

    const initSocket = useCallback((token?: string | null) => {
        const SOCKET_URL = 'http://localhost:5000';
        const fetchedToken = token || getAuthToken();

        const socketInstance = io(SOCKET_URL, {
            transports: ['websocket'],
            autoConnect: true,
            auth: {
                token: fetchedToken // Pass token here
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

        // Log errors to debug auth failures
        socketInstance.on('connect_error', (err) => {
            console.error('Socket Connection Error:', err.message);
        });

        setSocket((prev) => {
            if (prev) prev.disconnect();
            return socketInstance;
        });
    }, []);

    useEffect(() => {
        // Initial connection (guest or stored token)
        initSocket();

        return () => {
            setSocket((prev) => {
                if (prev) prev.disconnect();
                return null;
            });
        };
    }, [initSocket]);

    const connectWithToken = (token: string) => {
        initSocket(token);
    };

    const disconnect = () => {
        setSocket((prev) => {
            if (prev) prev.disconnect();
            return null;
        });
        setIsConnected(false);
    };

    return (
        <SocketContext.Provider value={{ socket, isConnected, connectWithToken, disconnect }}>
            {children}
        </SocketContext.Provider>
    );
};
