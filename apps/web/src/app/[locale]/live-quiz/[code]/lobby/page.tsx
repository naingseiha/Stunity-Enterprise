'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { getLobbyStatus, startSession } from '@/lib/api/live-quiz';
import { Loader2, Users, Play, LogOut } from 'lucide-react';

export default function LiveQuizLobbyPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const urlParams = useParams();
  const code = urlParams?.code as string;

  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('lobby');
  const [quizTitle, setQuizTitle] = useState<string>('');
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const userData = TokenManager.getUserData();
    setUser(userData?.user);
    setSchool(userData?.school);
  }, []);

  const loadLobby = async () => {
    const token = TokenManager.getAccessToken();
    if (!token || !code) return;

    try {
      const data = await getLobbyStatus(code, token);
      setParticipants(data.participants || []);
      setStatus(data.status);
      setQuizTitle(data.quizTitle || 'Quiz');
      setQuestionCount(data.questionCount || 0);

      // Check if current user is host
      const hostId = data.hostId;
      const uid = user?.id ?? TokenManager.getUserData()?.user?.id;
      setIsHost(!!hostId && String(uid) === String(hostId));

      if (data.status === 'active') {
        router.replace(`/${params.locale}/live-quiz/${code}/play`);
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load lobby');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!code) return;
    loadLobby();
    const interval = setInterval(loadLobby, 2000);
    return () => clearInterval(interval);
  }, [code, user?.id]);

  const handleStart = async () => {
    const token = TokenManager.getAccessToken();
    if (!token || !isHost) return;

    setIsStarting(true);
    setError('');
    try {
      await startSession(code, token);
      router.replace(`/${params.locale}/live-quiz/${code}/play`);
    } catch (err: any) {
      setError(err.message || 'Failed to start quiz');
    } finally {
      setIsStarting(false);
    }
  };

  const handleLeave = () => {
    router.push(`/${params.locale}/feed`);
  };

  const handleLogout = async () => {
    await TokenManager.logout();
    router.replace(`/${params.locale}/auth/login`);
  };

  if (!TokenManager.getAccessToken()) {
    router.replace(`/${params.locale}/auth/login`);
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <main className="flex-1 flex flex-col p-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleLeave}
            className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-white">Quiz Lobby</h1>
          <div className="w-10" />
        </div>

        <div className="text-center mb-8">
          <p className="text-white/80 text-sm mb-2">Session Code</p>
          <div className="inline-block bg-white/25 px-8 py-4 rounded-xl border-2 border-white/40">
            <span className="text-3xl font-bold text-white tracking-widest">{code}</span>
          </div>
          <p className="text-white/70 text-sm mt-2">Share this code with participants</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <Users className="w-5 h-5 text-white" />
          <span className="text-lg font-semibold text-white">
            {participants.length} {participants.length === 1 ? 'Player' : 'Players'}
          </span>
        </div>

        {loading && participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-white animate-spin mb-4" />
            <p className="text-white/80">Loading...</p>
          </div>
        ) : (
          <div className="space-y-3 flex-1 overflow-y-auto">
            {participants.map((p, i) => (
              <div
                key={p.userId}
                className="flex items-center gap-4 bg-white/20 rounded-xl p-4 border border-white/30"
              >
                <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center text-white font-bold text-lg">
                  {(p.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{p.username || 'User'}</p>
                  <p className="text-sm text-white/80">Ready</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-500/30 rounded-xl text-red-100 text-center text-sm">
            {error}
          </div>
        )}

        {isHost ? (
          <button
            onClick={handleStart}
            disabled={participants.length < 2 || isStarting}
            className="mt-6 w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {isStarting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Play className="w-5 h-5" />
                {participants.length < 2 ? 'Waiting for players...' : 'Start Quiz'}
              </>
            )}
          </button>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3 text-white/90">
            <Loader2 className="w-12 h-12 animate-spin" />
            <p className="font-semibold">Waiting for host to start...</p>
          </div>
        )}
      </main>
    </div>
  );
}
