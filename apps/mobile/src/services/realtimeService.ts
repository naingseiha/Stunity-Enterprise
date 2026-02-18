/**
 * Realtime Service
 * 
 * Centralized Supabase Realtime channel manager.
 * Handles postgres_changes subscriptions for social media features.
 * 
 * Architecture:
 * - Microservices write to Supabase DB via Prisma
 * - Supabase Realtime broadcasts DB changes (WAL) to clients
 * - This service subscribes to those broadcasts
 */

import { supabase } from '@/lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { AppState, AppStateStatus } from 'react-native';

// ============================================
// Types
// ============================================

export type TableEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface ChannelConfig {
    channelName: string;
    table: string;
    schema?: string;
    event?: TableEvent | '*';
    filter?: string;
    callback: (payload: RealtimePostgresChangesPayload<any>) => void;
}

// ============================================
// Realtime Service
// ============================================

class RealtimeService {
    private channels: Map<string, RealtimeChannel> = new Map();
    private appStateSubscription: any = null;
    private isInitialized = false;

    /**
     * Initialize the service — listens for app state changes
     * to pause/resume subscriptions
     */
    initialize() {
        if (this.isInitialized) return;

        this.appStateSubscription = AppState.addEventListener(
            'change',
            this.handleAppStateChange
        );
        this.isInitialized = true;

        if (__DEV__) {
            console.log('🔌 [RealtimeService] Initialized');
        }
    }

    /**
     * Subscribe to a postgres_changes channel
     */
    subscribe(config: ChannelConfig): RealtimeChannel {
        // Unsubscribe existing if channel name already used
        this.unsubscribe(config.channelName);

        const channel = supabase
            .channel(config.channelName)
            .on(
                'postgres_changes',
                {
                    event: config.event || '*',
                    schema: config.schema || 'public',
                    table: config.table,
                    filter: config.filter,
                },
                (payload) => {
                    if (__DEV__) {
                        console.log(`🔔 [RT] ${config.table} ${payload.eventType}`, {
                            id: (payload.new as any)?.id || (payload.old as any)?.id,
                        });
                    }
                    config.callback(payload);
                }
            )
            .subscribe((status) => {
                if (__DEV__) {
                    console.log(`🔌 [RT] ${config.channelName}: ${status}`);
                }
            });

        this.channels.set(config.channelName, channel);
        return channel;
    }

    /**
     * Subscribe to multiple tables on a single channel (fewer connections)
     */
    subscribeMultiple(
        channelName: string,
        configs: Array<{
            table: string;
            event?: TableEvent | '*';
            filter?: string;
            callback: (payload: RealtimePostgresChangesPayload<any>) => void;
        }>
    ): RealtimeChannel {
        this.unsubscribe(channelName);

        let channel = supabase.channel(channelName);

        for (const config of configs) {
            channel = channel.on(
                'postgres_changes',
                {
                    event: config.event || '*',
                    schema: 'public',
                    table: config.table,
                    filter: config.filter,
                },
                (payload) => {
                    if (__DEV__) {
                        console.log(`🔔 [RT] ${config.table} ${payload.eventType}`, {
                            id: (payload.new as any)?.id || (payload.old as any)?.id,
                        });
                    }
                    config.callback(payload);
                }
            );
        }

        const subscribedChannel = channel.subscribe((status) => {
            if (__DEV__) {
                console.log(`🔌 [RT] ${channelName}: ${status}`);
            }
        });

        this.channels.set(channelName, subscribedChannel);
        return subscribedChannel;
    }

    /**
     * Create a Broadcast channel (for ephemeral events like typing indicators)
     */
    createBroadcastChannel(
        channelName: string,
        onBroadcast?: (event: string, payload: any) => void
    ): RealtimeChannel {
        this.unsubscribe(channelName);

        let channel = supabase.channel(channelName);

        if (onBroadcast) {
            channel = channel.on('broadcast', { event: '*' }, (payload) => {
                if (__DEV__) {
                    console.log(`📡 [RT Broadcast] ${channelName}:`, payload);
                }
                onBroadcast(payload.event, payload.payload);
            });
        }

        const subscribedChannel = channel.subscribe();
        this.channels.set(channelName, subscribedChannel);
        return subscribedChannel;
    }

    /**
     * Create a Presence channel (for online status)
     */
    createPresenceChannel(
        channelName: string,
        userState: Record<string, any>,
        onSync?: (state: Record<string, any>) => void
    ): RealtimeChannel {
        this.unsubscribe(channelName);

        const channel = supabase.channel(channelName, {
            config: { presence: { key: userState.userId || 'anonymous' } },
        });

        if (onSync) {
            channel.on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                onSync(state);
            });
        }

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track(userState);
            }
            if (__DEV__) {
                console.log(`👤 [RT Presence] ${channelName}: ${status}`);
            }
        });

        this.channels.set(channelName, channel);
        return channel;
    }

    /**
     * Unsubscribe from a specific channel
     */
    unsubscribe(channelName: string) {
        const channel = this.channels.get(channelName);
        if (channel) {
            supabase.removeChannel(channel);
            this.channels.delete(channelName);
        }
    }

    /**
     * Unsubscribe from all channels
     */
    unsubscribeAll() {
        for (const [name, channel] of this.channels) {
            supabase.removeChannel(channel);
        }
        this.channels.clear();
        if (__DEV__) {
            console.log('🔌 [RealtimeService] All channels removed');
        }
    }

    /**
     * Get channel by name
     */
    getChannel(channelName: string): RealtimeChannel | undefined {
        return this.channels.get(channelName);
    }

    /**
     * Get active channel count
     */
    getActiveCount(): number {
        return this.channels.size;
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        this.unsubscribeAll();
        this.appStateSubscription?.remove();
        this.isInitialized = false;
    }

    // ========================================
    // Private
    // ========================================

    private handleAppStateChange = (state: AppStateStatus) => {
        if (state === 'active') {
            if (__DEV__) {
                console.log('🔌 [RealtimeService] App active — connections maintained by Supabase SDK');
            }
        } else if (state === 'background') {
            if (__DEV__) {
                console.log('🔌 [RealtimeService] App backgrounded — Supabase SDK handles gracefully');
            }
        }
    };
}

// Export singleton instance
export const realtimeService = new RealtimeService();
export default realtimeService;
