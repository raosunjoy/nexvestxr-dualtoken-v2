// ============================================================================
// WEBSOCKET HOOK - Real-time Trading Connection
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const WEBSOCKET_URL = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8080';
const RECONNECT_INTERVAL = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 10;

export const useWebSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const [connectionError, setConnectionError] = useState(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const heartbeatIntervalRef = useRef(null);
    const messageHandlersRef = useRef(new Map());
    
    const { user, getToken } = useAuth();

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            wsRef.current = new WebSocket(WEBSOCKET_URL);
            
            wsRef.current.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                setConnectionError(null);
                setReconnectAttempts(0);
                
                // Start heartbeat
                startHeartbeat();
                
                // Authenticate if user is logged in
                if (user && getToken()) {
                    authenticate();
                }
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    setLastMessage(message);
                    handleMessage(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            wsRef.current.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                setIsConnected(false);
                setIsAuthenticated(false);
                stopHeartbeat();
                
                // Attempt to reconnect
                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    setReconnectAttempts(prev => prev + 1);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, RECONNECT_INTERVAL);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setConnectionError('WebSocket connection failed');
            };

        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
            setConnectionError(error.message);
        }
    }, [user, getToken, reconnectAttempts]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        
        stopHeartbeat();
        
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        
        setIsConnected(false);
        setIsAuthenticated(false);
        setReconnectAttempts(0);
    }, []);

    const sendMessage = useCallback((message) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
            return true;
        } else {
            console.warn('WebSocket not connected, message not sent:', message);
            return false;
        }
    }, []);

    const authenticate = useCallback(() => {
        const token = getToken();
        if (token && isConnected) {
            sendMessage({
                type: 'authenticate',
                token
            });
        }
    }, [getToken, isConnected, sendMessage]);

    const subscribe = useCallback((channels) => {
        if (isConnected) {
            sendMessage({
                type: 'subscribe',
                channels
            });
        }
    }, [isConnected, sendMessage]);

    const unsubscribe = useCallback((channels) => {
        if (isConnected) {
            sendMessage({
                type: 'unsubscribe',
                channels
            });
        }
    }, [isConnected, sendMessage]);

    const startHeartbeat = () => {
        heartbeatIntervalRef.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                sendMessage({ type: 'ping' });
            }
        }, 30000); // Ping every 30 seconds
    };

    const stopHeartbeat = () => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
    };

    const handleMessage = (message) => {
        switch (message.type) {
            case 'welcome':
                console.log('WebSocket welcome:', message);
                break;
            case 'authenticated':
                console.log('WebSocket authenticated');
                setIsAuthenticated(true);
                break;
            case 'subscribed':
                console.log('Subscribed to channels:', message.channels);
                break;
            case 'error':
                console.error('WebSocket error:', message.error);
                setConnectionError(message.error.message);
                break;
            case 'pong':
                // Heartbeat response
                break;
            default:
                // Handle custom message types through registered handlers
                const handlers = messageHandlersRef.current.get(message.type);
                if (handlers) {
                    handlers.forEach(handler => handler(message));
                }
                break;
        }
    };

    const addMessageHandler = useCallback((messageType, handler) => {
        if (!messageHandlersRef.current.has(messageType)) {
            messageHandlersRef.current.set(messageType, new Set());
        }
        messageHandlersRef.current.get(messageType).add(handler);
        
        // Return cleanup function
        return () => {
            const handlers = messageHandlersRef.current.get(messageType);
            if (handlers) {
                handlers.delete(handler);
                if (handlers.size === 0) {
                    messageHandlersRef.current.delete(messageType);
                }
            }
        };
    }, []);

    const removeMessageHandler = useCallback((messageType, handler) => {
        const handlers = messageHandlersRef.current.get(messageType);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                messageHandlersRef.current.delete(messageType);
            }
        }
    }, []);

    // Trading-specific methods
    const placeOrder = useCallback((orderType, orderData) => {
        if (!isAuthenticated) {
            console.error('Must be authenticated to place orders');
            return false;
        }
        
        return sendMessage({
            type: 'place_order',
            orderType,
            orderData
        });
    }, [isAuthenticated, sendMessage]);

    const cancelOrder = useCallback((orderId) => {
        if (!isAuthenticated) {
            console.error('Must be authenticated to cancel orders');
            return false;
        }
        
        return sendMessage({
            type: 'cancel_order',
            orderId
        });
    }, [isAuthenticated, sendMessage]);

    const openMarginPosition = useCallback((accountId, positionData) => {
        if (!isAuthenticated) {
            console.error('Must be authenticated for margin trading');
            return false;
        }
        
        return sendMessage({
            type: 'open_margin_position',
            accountId,
            positionData
        });
    }, [isAuthenticated, sendMessage]);

    const closeMarginPosition = useCallback((positionId, closePrice = null, partial = false, closeAmount = null) => {
        if (!isAuthenticated) {
            console.error('Must be authenticated for margin trading');
            return false;
        }
        
        return sendMessage({
            type: 'close_margin_position',
            positionId,
            closePrice,
            partial,
            closeAmount
        });
    }, [isAuthenticated, sendMessage]);

    const executeArbitrage = useCallback((opportunityId, amount) => {
        if (!isAuthenticated) {
            console.error('Must be authenticated for arbitrage trading');
            return false;
        }
        
        return sendMessage({
            type: 'execute_arbitrage',
            opportunityId,
            amount
        });
    }, [isAuthenticated, sendMessage]);

    // Connect on mount, disconnect on unmount
    useEffect(() => {
        connect();
        
        return () => {
            disconnect();
        };
    }, []);

    // Re-authenticate when user changes
    useEffect(() => {
        if (isConnected && user && getToken() && !isAuthenticated) {
            authenticate();
        }
    }, [isConnected, user, getToken, isAuthenticated, authenticate]);

    return {
        ws: wsRef.current,
        isConnected,
        isAuthenticated,
        connectionError,
        reconnectAttempts,
        lastMessage,
        
        // Connection methods
        connect,
        disconnect,
        sendMessage,
        
        // Authentication
        authenticate,
        
        // Subscription methods
        subscribe,
        unsubscribe,
        
        // Message handling
        addMessageHandler,
        removeMessageHandler,
        
        // Trading methods
        placeOrder,
        cancelOrder,
        openMarginPosition,
        closeMarginPosition,
        executeArbitrage
    };
};