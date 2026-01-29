import { io, Socket } from "socket.io-client";

// Remove /api suffix from API URL for Socket.IO connection
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api").replace(/\/api$/, "");

class SocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  /**
   * Initialize and connect socket
   */
  connect(token: string) {
    if (this.socket?.connected) {
      console.log("Socket already connected");
      return;
    }

    console.log("🔌 Connecting to Socket.IO server:", API_BASE_URL);

    this.socket = io(API_BASE_URL, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("✅ Socket connected:", this.socket?.id);
    });

    this.socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      console.error("   Trying to connect to:", API_BASE_URL);
    });

    // Re-attach all listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback as any);
      });
    });
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log("Socket disconnected");
    }
  }

  /**
   * Listen to event
   */
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  /**
   * Remove listener
   */
  off(event: string, callback?: Function) {
    if (callback) {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }

    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback as any);
      } else {
        this.socket.off(event);
      }
    }
  }

  /**
   * Emit event
   */
  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn("Socket not connected. Cannot emit:", event);
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.socket?.connected || false;
  }

  /**
   * Get socket instance
   */
  getSocket() {
    return this.socket;
  }
}

// Export singleton instance
export const socketClient = new SocketClient();
