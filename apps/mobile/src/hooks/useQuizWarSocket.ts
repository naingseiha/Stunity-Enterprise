import { useEffect, useState } from 'react';
import type { QuizWar } from '@/types';
import { Config } from '@/config';
import { feedApi } from '@/api/client';

export function useQuizWarSocket(initialWar: QuizWar) {
  const [war, setWar] = useState<QuizWar>(initialWar);

  useEffect(() => {
    setWar(initialWar);
  }, [initialWar]);

  useEffect(() => {
    if (!war || war.status !== 'LIVE') return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isClosedIntentional = false;

    const connect = async () => {
      try {
        // Exchange the Authorization-header JWT for a short-lived opaque
        // ticket so the access token never appears on the WS URL.
        const ticketResponse = await feedApi.get<{
          success: boolean;
          data?: { ticket: string };
        }>(`/quiz-wars/${war.id}/ws-ticket`);

        const ticket = ticketResponse.data?.data?.ticket;
        if (!ticketResponse.data?.success || !ticket) return;

        const wsBaseUrl = Config.feedUrl.replace(/^http/, 'ws');
        const wsUrl = `${wsBaseUrl}/quiz-wars/${war.id}/ws?ticket=${encodeURIComponent(ticket)}`;

        if (__DEV__) {
          console.log(`🔌 [QuizWarSocket] Connecting to war ${war.id}`);
        }
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (__DEV__) {
            console.log('🔌 [QuizWarSocket] Connected successfully');
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message && message.type === 'QUIZ_WAR_UPDATED' && message.data) {
              if (__DEV__) {
                console.log('🔌 [QuizWarSocket] Score delta push received:', message.data);
              }
              setWar((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  status: message.data.status,
                  round: message.data.round,
                  timeRemainingSec: message.data.timeRemainingSec,
                  teamA: {
                    ...prev.teamA,
                    score: message.data.teamA.score,
                  },
                  teamB: {
                    ...prev.teamB,
                    score: message.data.teamB.score,
                  },
                  classmatesFighting: message.data.classmatesFighting,
                };
              });
            }
          } catch (e) {
            console.error('🔌 [QuizWarSocket] Failed to parse message:', e);
          }
        };

        ws.onclose = (e) => {
          if (__DEV__) {
            console.log('🔌 [QuizWarSocket] Closed:', e.code, e.reason);
          }
          if (!isClosedIntentional) {
            reconnectTimer = setTimeout(() => {
              void connect();
            }, 5000);
          }
        };

        ws.onerror = (err) => {
          console.error('🔌 [QuizWarSocket] Error:', err);
        };
      } catch (err) {
        console.error('🔌 [QuizWarSocket] Connection error:', err);
        if (!isClosedIntentional) {
          reconnectTimer = setTimeout(() => {
            void connect();
          }, 5000);
        }
      }
    };

    void connect();

    return () => {
      isClosedIntentional = true;
      if (ws) {
        ws.close();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [war.id, war.status]);

  return war;
}
