/**
 * Telegram WebSocket Client
 * 
 * Manages WebSocket connection for real-time Telegram message updates.
 * Provides connection management, auto-reconnection, and message handling.
 */

type TelegramMessage = {
    id: string;
    chat_id: string;
    text: string;
    direction: 'INCOMING' | 'OUTGOING';
    timestamp: string;
    contact_name: string;
    platform: 'telegram';
};

type WebSocketMessage = {
    type: 'new_telegram_message' | 'heartbeat';
    data?: TelegramMessage;
};

type MessageHandler = (message: TelegramMessage) => void;

class TelegramWebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectDelay = 1000; // Start with 1 second
    private pingInterval: NodeJS.Timeout | null = null;
    private messageHandlers: Set<MessageHandler> = new Set();
    private isConnecting = false;

    /**
     * Connect to the Telegram WebSocket endpoint
     */
    connect(accessToken: string): void {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
            console.log('[TelegramWS] Already connected or connecting');
            return;
        }

        this.isConnecting = true;

        // Determine WebSocket URL based on environment
        const apiUrl = import.meta.env.VITE_API_URL || 'https://knudge-api-dev.finbyz.com';
        const wsUrl = apiUrl
            .replace('https://', 'wss://')
            .replace('http://', 'ws://');

        const url = `${wsUrl}/ws/telegram/messages?token=${accessToken}`;

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('[TelegramWS] Connected');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
                this.startPing();
            };

            this.ws.onmessage = (event) => {
                // Handle plain text responses (like 'pong')
                if (typeof event.data === 'string') {
                    if (event.data === 'pong') {
                        // Pong response to our ping, ignore
                        return;
                    }
                }

                try {
                    const message: WebSocketMessage = JSON.parse(event.data);

                    if (message.type === 'heartbeat') {
                        // Server heartbeat, respond with ping
                        this.ws?.send('ping');
                        return;
                    }

                    if (message.type === 'new_telegram_message' && message.data) {
                        console.log('[TelegramWS] New message:', message.data.text?.slice(0, 50));
                        // Notify all handlers
                        this.messageHandlers.forEach(handler => {
                            try {
                                handler(message.data!);
                            } catch (e) {
                                console.error('[TelegramWS] Handler error:', e);
                            }
                        });
                    }
                } catch (e) {
                    // Only log if it's not a known plain text response
                    if (event.data !== 'pong') {
                        console.error('[TelegramWS] Parse error:', e);
                    }
                }
            };

            this.ws.onclose = (event) => {
                console.log('[TelegramWS] Disconnected:', event.code, event.reason);
                this.isConnecting = false;
                this.stopPing();

                // Attempt reconnection if not a clean close
                if (event.code !== 1000) {
                    this.scheduleReconnect(accessToken);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[TelegramWS] Error:', error);
                this.isConnecting = false;
            };

        } catch (e) {
            console.error('[TelegramWS] Connection error:', e);
            this.isConnecting = false;
            this.scheduleReconnect(accessToken);
        }
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect(): void {
        this.stopPing();
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.reconnectAttempts = 0;
    }

    /**
     * Schedule a reconnection attempt with exponential backoff
     */
    private scheduleReconnect(accessToken: string): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[TelegramWS] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

        console.log(`[TelegramWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect(accessToken);
        }, delay);
    }

    /**
     * Start sending periodic pings to keep connection alive
     */
    private startPing(): void {
        this.stopPing();
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send('ping');
            }
        }, 30000); // Ping every 30 seconds
    }

    /**
     * Stop the ping interval
     */
    private stopPing(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * Register a handler for new messages
     */
    onMessage(handler: MessageHandler): () => void {
        this.messageHandlers.add(handler);
        // Return unsubscribe function
        return () => {
            this.messageHandlers.delete(handler);
        };
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// Singleton instance
export const telegramWS = new TelegramWebSocketClient();

export type { TelegramMessage, MessageHandler };
