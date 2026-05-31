import { useEffect, useState } from 'react';
import type { QuizWar } from '@/types';
import { Config } from '@/config';
import { tokenService } from '@/services/token';

export function useQuizWarSocket(initialWar: QuizWar) {
  const [war, setWar] = useState<QuizWar>(initialWar);

  useEffect(() => {
    setWar(initialWar);
  }, [initialWar]);

  useEffect(() => {
    if (!war || war.status !== 'LIVE') return;

    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;
    let isClosedIntentional = false;

    const connect = async () => {
      try {
        const token = await tokenService.getAccessToken();
        if (!token) return;

        const wsBaseUrl = Config.feedUrl.replace(/^http/, 'ws');
        const wsUrl = `${wsBaseUrl}/quiz-wars/${war.id}/ws?token=${encodeURIComponent(token)}`;

        console.log(`🔌 [QuizWarSocket] Connecting to ${wsUrl}`);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('🔌 [QuizWarSocket] Connected successfully');
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message && message.type === 'QUIZ_WAR_UPDATED' && message.data) {
              console.log('🔌 [QuizWarSocket] Score delta push received:', message.data);
              setWar((prev) => {
                if (!prev) return prev;
                // Merge data to preserve user-specific fields (userTeamId, isUserParticipating)
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
          console.log('🔌 [QuizWarSocket] Closed:', e.code, e.reason);
          if (!isClosedIntentional) {
            // Reconnect in 5 seconds
            reconnectTimer = setTimeout(connect, 5000);
          }
        };

        ws.onerror = (err) => {
          console.error('🔌 [QuizWarSocket] Error:', err);
        };
      } catch (err) {
        console.error('🔌 [QuizWarSocket] Connection error:', err);
      }
    };

    connect();

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
