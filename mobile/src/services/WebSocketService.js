import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import config from '../config';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.subscriptions = new Set();
    this.appStateSubscription = null;
    this.heartbeatInterval = null;
    this.lastHeartbeat = null;
  }

  // Initialize WebSocket connection
  async initialize() {
    try {
      if (this.socket && this.isConnected) {
        console.log('WebSocket already connected');
        return true;
      }

      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.ACCESS_TOKEN);
      
      if (!token) {
        console.warn('No auth token found for WebSocket connection');
      }

      const socketOptions = {
        transports: ['websocket'],
        timeout: config.TIMEOUTS.WEBSOCKET_CONNECTION,
        auth: {
          token,
        },
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      };

      this.socket = io(config.WEBSOCKET_URL, socketOptions);
      this.setupEventHandlers();
      this.setupAppStateHandling();

      return new Promise((resolve) => {
        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.resubscribeAll();
          this.notifyListeners('connected', { connected: true });
          resolve(true);
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.isConnected = false;
          this.notifyListeners('connection_error', { error: error.message });
          resolve(false);
        });
      });
    } catch (error) {
      console.error('WebSocket initialization error:', error);
      return false;
    }
  }

  // Setup event handlers
  setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.stopHeartbeat();
      this.notifyListeners('disconnected', { reason });

      // Attempt reconnection for certain disconnect reasons
      if (reason === 'io server disconnect') {
        this.reconnect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.resubscribeAll();
      this.notifyListeners('reconnected', { attemptNumber });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
      this.reconnectAttempts++;
      this.notifyListeners('reconnect_error', { 
        error: error.message, 
        attempt: this.reconnectAttempts 
      });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed after max attempts');
      this.notifyListeners('reconnect_failed', {});
    });

    // Data events
    this.socket.on(config.WS_EVENTS.PRICE_UPDATE, (data) => {
      this.notifyListeners('price_update', data);
    });

    this.socket.on(config.WS_EVENTS.ORDER_UPDATE, (data) => {
      this.notifyListeners('order_update', data);
    });

    this.socket.on(config.WS_EVENTS.BALANCE_UPDATE, (data) => {
      this.notifyListeners('balance_update', data);
    });

    this.socket.on(config.WS_EVENTS.NOTIFICATION, (data) => {
      this.notifyListeners('notification', data);
    });

    this.socket.on(config.WS_EVENTS.TRANSACTION_UPDATE, (data) => {
      this.notifyListeners('transaction_update', data);
    });

    // Heartbeat
    this.socket.on('pong', (data) => {
      this.lastHeartbeat = new Date();
      this.notifyListeners('heartbeat', { timestamp: this.lastHeartbeat });
    });

    // Authentication events
    this.socket.on('auth_required', () => {
      console.log('WebSocket authentication required');
      this.authenticate();
    });

    this.socket.on('auth_success', () => {
      console.log('WebSocket authentication successful');
      this.notifyListeners('auth_success', {});
    });

    this.socket.on('auth_failed', (error) => {
      console.error('WebSocket authentication failed:', error);
      this.notifyListeners('auth_failed', { error });
    });
  }

  // Setup app state handling
  setupAppStateHandling() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App became active, reconnect if needed
        if (!this.isConnected) {
          this.reconnect();
        }
      } else if (nextAppState === 'background') {
        // App went to background, maintain connection but reduce activity
        this.notifyListeners('app_backgrounded', {});
      }
    });
  }

  // Authenticate WebSocket connection
  async authenticate() {
    try {
      const token = await AsyncStorage.getItem(config.STORAGE_KEYS.ACCESS_TOKEN);
      
      if (token && this.socket) {
        this.socket.emit('authenticate', { token });
      }
    } catch (error) {
      console.error('WebSocket authentication error:', error);
    }
  }

  // Add event listener
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  // Remove event listener
  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
      if (this.listeners.get(event).size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // Notify all listeners for an event
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }
  }

  // Subscribe to real-time updates
  subscribe(channel, params = {}) {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket not connected, queuing subscription:', channel);
      this.subscriptions.add({ channel, params });
      return;
    }

    this.socket.emit('subscribe', { channel, ...params });
    this.subscriptions.add({ channel, params });
    console.log('Subscribed to WebSocket channel:', channel);
  }

  // Unsubscribe from updates
  unsubscribe(channel, params = {}) {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe', { channel, ...params });
    }

    // Remove from subscriptions
    this.subscriptions.forEach(sub => {
      if (sub.channel === channel && JSON.stringify(sub.params) === JSON.stringify(params)) {
        this.subscriptions.delete(sub);
      }
    });

    console.log('Unsubscribed from WebSocket channel:', channel);
  }

  // Resubscribe to all channels after reconnection
  resubscribeAll() {
    console.log('Resubscribing to all WebSocket channels');
    
    this.subscriptions.forEach(({ channel, params }) => {
      if (this.socket && this.isConnected) {
        this.socket.emit('subscribe', { channel, ...params });
      }
    });
  }

  // Subscribe to price updates
  subscribeToPriceUpdates(symbols = []) {
    this.subscribe('price_updates', { symbols });
  }

  // Subscribe to order updates
  subscribeToOrderUpdates(userId) {
    this.subscribe('order_updates', { userId });
  }

  // Subscribe to balance updates
  subscribeToBalanceUpdates(userId) {
    this.subscribe('balance_updates', { userId });
  }

  // Subscribe to property updates
  subscribeToPropertyUpdates(propertyId = null) {
    this.subscribe('property_updates', { propertyId });
  }

  // Subscribe to trading pair updates
  subscribeToTradingPair(symbol) {
    this.subscribe('trading_pair', { symbol });
  }

  // Subscribe to user notifications
  subscribeToNotifications(userId) {
    this.subscribe('notifications', { userId });
  }

  // Subscribe to transaction updates
  subscribeToTransactionUpdates(address) {
    this.subscribe('transaction_updates', { address });
  }

  // Send message
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit:', event);
    }
  }

  // Start heartbeat
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('ping', { timestamp: new Date().toISOString() });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Manual reconnection
  async reconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }

    console.log('Attempting WebSocket reconnection...');
    return await this.initialize();
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.stopHeartbeat();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.subscriptions.clear();
    this.listeners.clear();

    console.log('WebSocket disconnected');
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      subscriptionCount: this.subscriptions.size,
      listenerCount: Array.from(this.listeners.values()).reduce(
        (total, listeners) => total + listeners.size, 
        0
      ),
    };
  }

  // Get subscriptions
  getSubscriptions() {
    return Array.from(this.subscriptions);
  }

  // Check if connected
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }

  // Get latency
  getLatency() {
    if (!this.lastHeartbeat) {
      return null;
    }

    return new Date().getTime() - this.lastHeartbeat.getTime();
  }
}

// Create and export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;