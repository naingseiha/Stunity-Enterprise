'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState, useEffect, useRef, use } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import {
  getCurrentQuestion,
  submitAnswer,
  nextQuestion,
} from '@/lib/api/live-quiz';
import type { Question } from '@/lib/api/live-quiz';
import { Loader2, Trophy, ChevronRight } from 'lucide-react';

import { useTranslations } from 'next-intl';
export default function LiveQuizPlayPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const t = useTranslations('common');
  const urlParams = useParams();
  const code = urlParams?.code as string;

  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLimit, setTimeLimit] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [questionCount, setQuestionCount] = useState(0);
  const [status, setStatus] = useState<string>('lobby');
  const progressRef = useRef<number>(1);
  const questionStartRef = useRef<number>(Date.now());
  const hasAutoSubmitted = useRef(false);

  useEffect(() => {
    const userData = TokenManager.getUserData();
    setUser(userData?.user);
    setSchool(userData?.school);
  }, []);

  const loadCurrent = async () => {
    const token = TokenManager.getAccessToken();
    if (!token || !code) return;

    try {
      const data = await getCurrentQuestion(code, token);
      setStatus(data.status);

      if (data.status === 'completed') {
        router.replace(`/${params.locale}/live-quiz/${code}/results`);
        return;
      }

      if (data.status === 'active' && data.question) {
        setCurrentQuestion(data.question);
        setTimeLimit(data.timeLimit || 30);
        setTimeLeft(data.timeLimit || 30);
        setCurrentQuestionIndex(data.currentQuestionIndex ?? 0);
        setQuestionCount(data.questionCount ?? 0);
        const uid = TokenManager.getUserData()?.user?.id;
        setIsHost(!!data.hostId && String(uid) === String(data.hostId));
        setSelectedAnswer(null);
        setIsSubmitted(false);
        setPointsEarned(null);
        hasAutoSubmitted.current = false;
        progressRef.current = 1;
        questionStartRef.current = Date.now();
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load question');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!code) return;
    loadCurrent();
    const interval = setInterval(loadCurrent, 1000);
    return () => clearInterval(interval);
  }, [code]);

  // Timer for current question
  useEffect(() => {
    if (!currentQuestion || isSubmitted) return;

    if (timeLeft <= 0 && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      const ans = selectedAnswer ?? (currentQuestion.type === 'MULTIPLE_CHOICE' ? -1 : 0);
      handleSubmit(ans);
      return;
    }

    const timer = setTimeout(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearTimeout(timer);
  }, [currentQuestion, timeLeft, isSubmitted, selectedAnswer]);

  const handleSubmit = async (answerIndex: number) => {
    const token = TokenManager.getAccessToken();
    if (!token || !currentQuestion || isSubmitted) return;

    const answer = String(answerIndex);
    setIsSubmitted(true);

    try {
      const result = await submitAnswer(code, answer, token);
      setPointsEarned(result.points);
    } catch (err: any) {
      setError(err.message || 'Failed to submit');
      setIsSubmitted(false);
    }
  };

  const handleHostNext = async () => {
    const token = TokenManager.getAccessToken();
    if (!token || !isHost) return;

    try {
      const result = await nextQuestion(code, token);
      if (result.status === 'completed') {
        router.replace(`/${params.locale}/live-quiz/${code}/results`);
        return;
      }
      setCurrentQuestion(result.question || null);
      setTimeLimit(result.timeLimit || 30);
      setTimeLeft(result.timeLimit || 30);
      setSelectedAnswer(null);
      setIsSubmitted(false);
      setPointsEarned(null);
    } catch (err: any) {
      setError(err.message || 'Failed to advance');
    }
  };

  const handleViewLeaderboard = () => {
    router.push(`/${params.locale}/live-quiz/${code}/leaderboard`);
  };

  const handleLogout = async () => {
    await TokenManager.logout();
    router.replace(`/${params.locale}/auth/login`);
  };

  if (!TokenManager.getAccessToken()) {
    router.replace(`/${params.locale}/auth/login`);
    return null;
  }

  if (loading && !currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col items-center justify-center">
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <Loader2 className="w-12 h-12 text-white animate-spin" />
        <p className="text-white/80 mt-4"><AutoI18nText i18nKey="auto.web.quiz_code_play_page.k_357bfa40" /></p>
      </div>
    );
  }

  const progress = timeLimit > 0 ? timeLeft / timeLimit : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <main className="flex-1 flex flex-col p-6 max-w-2xl mx-auto w-full">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-2 bg-white dark:bg-none dark:bg-gray-900/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white dark:bg-none dark:bg-gray-900 transition-all duration-1000"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-white/80 text-sm mt-2 text-right">
            {timeLeft}<AutoI18nText i18nKey="auto.web.quiz_code_play_page.k_27976012" />{currentQuestionIndex + 1}/{questionCount}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/30 rounded-xl text-red-100 text-sm">
            {error}
          </div>
        )}

        {currentQuestion ? (
          <>
            <div className="bg-white dark:bg-none dark:bg-gray-900/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
              <p className="text-white/80 text-sm mb-2"><AutoI18nText i18nKey="auto.web.quiz_code_play_page.k_47434862" /> {currentQuestionIndex + 1}</p>
              <h2 className="text-xl font-bold text-white">{currentQuestion.text}</h2>
            </div>

            {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (!isSubmitted) {
                        setSelectedAnswer(i);
                        handleSubmit(i);
                      }
                    }}
                    disabled={isSubmitted}
                    className={`w-full p-4 rounded-xl text-left font-medium transition-all ${
                      isSubmitted
                        ? selectedAnswer === i
                          ? pointsEarned !== null && pointsEarned > 0
                            ? 'bg-emerald-500/50 text-white border-2 border-emerald-400'
                            : 'bg-red-500/50 text-white border-2 border-red-400'
                          : 'bg-white dark:bg-gray-900/10 text-white/70 border-2 border-transparent'
                        : 'bg-white dark:bg-gray-900/20 hover:bg-white dark:bg-gray-900/30 text-white border-2 border-transparent hover:border-white/50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {isSubmitted && pointsEarned !== null && (
              <div className="mt-6 p-4 bg-white dark:bg-gray-900/20 rounded-xl text-center">
                <p className="text-white font-semibold">
                  {pointsEarned > 0 ? 'Correct!' : 'Incorrect'}
                </p>
                <p className="text-white/80 text-sm">+{pointsEarned} <AutoI18nText i18nKey="auto.web.quiz_code_play_page.k_811c655d" /></p>
              </div>
            )}

            {isHost ? (
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleViewLeaderboard}
                  className="flex-1 py-3 bg-white dark:bg-gray-900/20 hover:bg-white dark:bg-gray-900/30 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <Trophy className="w-5 h-5" />
                  <AutoI18nText i18nKey="auto.web.quiz_code_play_page.k_93a7e06f" />
                </button>
                <button
                  onClick={handleHostNext}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <AutoI18nText i18nKey="auto.web.quiz_code_play_page.k_7ff6cc00" />
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleViewLeaderboard}
                className="mt-6 w-full py-3 bg-white dark:bg-gray-900/20 hover:bg-white dark:bg-gray-900/30 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <Trophy className="w-5 h-5" />
                <AutoI18nText i18nKey="auto.web.quiz_code_play_page.k_7e7f7115" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
            <p className="text-white/80"><AutoI18nText i18nKey="auto.web.quiz_code_play_page.k_cb21fbe7" /></p>
          </div>
        )}
      </main>
    </div>
  );
}
