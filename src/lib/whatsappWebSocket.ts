/**
 * WhatsApp WebSocket Client
 * 
 * Manages WebSocket connection for real-time WhatsApp message updates.
 * Provides connection management, auto-reconnection, and message handling.
 */

type WhatsappMessage = {
    id: string;
    room_id: string;
    text: string;
    type: 'incoming' | 'outgoing';
    timestamp: string;
    status: string;
    message_type: string;
    media_url?: string;
    media_mimetype?: string;
    sender_name?: string;
    avatar?: string;
    normalized_phone?: string;
    identity_key?: string;
};

type WebSocketMessage = {
    type: 'new_whatsapp_message' | 'heartbeat';
    data?: WhatsappMessage;
};

type MessageHandler = (message: WhatsappMessage) => void;

class WhatsAppWebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectDelay = 1000;
    private pingInterval: NodeJS.Timeout | null = null;
    private messageHandlers: Set<MessageHandler> = new Set();
    private isConnecting = false;

    /**
     * Connect to the WhatsApp WebSocket endpoint
     */
    connect(accessToken: string): void {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
            console.log('[WhatsAppWS] Already connected or connecting');
            return;
        }

        this.isConnecting = true;

        // Determine WebSocket URL based on environment
        const apiUrl = import.meta.env.VITE_API_URL || 'https://knudge-api-dev.finbyz.com';
        const wsUrl = apiUrl
            .replace('https://', 'wss://')
            .replace('http://', 'ws://');

        const url = `${wsUrl}/ws/whatsapp/messages?token=${accessToken}`;

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('[WhatsAppWS] Connected');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
                this.startPing();
            };

            this.ws.onmessage = (event) => {
                if (event.data === 'pong') return;

                try {
                    const message: WebSocketMessage = JSON.parse(event.data);

                    if (message.type === 'heartbeat') {
                        this.ws?.send('ping');
                        return;
                    }

                    if (message.type === 'new_whatsapp_message' && message.data) {
                        console.log('[WhatsAppWS] New message from:', message.data.sender_name);
                        // Notify all handlers
                        this.messageHandlers.forEach(handler => {
                            try {
                                handler(message.data!);
                            } catch (e) {
                                console.error('[WhatsAppWS] Handler error:', e);
                            }
                        });
                    }
                } catch (e) {
                    if (event.data !== 'pong') {
                        console.error('[WhatsAppWS] Parse error:', e);
                    }
                }
            };

            this.ws.onclose = (event) => {
                console.log('[WhatsAppWS] Disconnected:', event.code, event.reason);
                this.isConnecting = false;
                this.stopPing();

                if (event.code !== 1000) {
                    this.scheduleReconnect(accessToken);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[WhatsAppWS] Error:', error);
                this.isConnecting = false;
            };

        } catch (e) {
            console.error('[WhatsAppWS] Connection error:', e);
            this.isConnecting = false;
            this.scheduleReconnect(accessToken);
        }
    }

    disconnect(): void {
        this.stopPing();
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.reconnectAttempts = 0;
    }

    private scheduleReconnect(accessToken: string): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[WhatsAppWS] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

        console.log(`[WhatsAppWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect(accessToken);
        }, delay);
    }

    private startPing(): void {
        this.stopPing();
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send('ping');
            }
        }, 30000);
    }

    private stopPing(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    onMessage(handler: MessageHandler): () => void {
        this.messageHandlers.add(handler);
        return () => {
            this.messageHandlers.delete(handler);
        };
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

export const whatsappWS = new WhatsAppWebSocketClient();
export type { WhatsappMessage, MessageHandler };
