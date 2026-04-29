'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React, { useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Trophy,
  RotateCcw,
  HelpCircle,
  Clock,
  AlertTriangle,
  Target,
} from 'lucide-react';

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  explanation: string | null;
  order: number;
  options: QuizOption[];
}

interface Quiz {
  passingScore: number;
  questions: QuizQuestion[];
}

interface QuizRunnerProps {
  lessonTitle: string;
  quiz: Quiz;
  onComplete?: (score: number, passed: boolean) => void;
}

type QuizPhase = 'intro' | 'running' | 'reviewing' | 'results';

export default function QuizRunner({ lessonTitle, quiz, onComplete }: QuizRunnerProps) {
  const [phase, setPhase] = useState<QuizPhase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> optionId
  const [revealed, setRevealed] = useState<Record<string, boolean>>({}); // questionId -> revealed
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const totalQuestions = quiz.questions.length;
  const passingScore = quiz.passingScore;
  const currentQuestion = quiz.questions[currentIndex];

  // Timer — 45s per question
  useEffect(() => {
    if (phase !== 'running') return;
    setTimeLeft(45);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-advance if no answer
          if (!answers[currentQuestion?.id]) {
            handleNext(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex, phase]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (revealed[questionId]) return; // Can't change after reveal
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    // Auto-reveal after selection (instant feedback mode)
    setTimeout(() => {
      setRevealed(prev => ({ ...prev, [questionId]: true }));
    }, 300);
  };

  const handleNext = useCallback((fromTimer = false) => {
    if (!fromTimer && !revealed[currentQuestion?.id]) {
      // Force reveal if they hit next without answering
      setRevealed(prev => ({ ...prev, [currentQuestion.id]: true }));
      return;
    }
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Calculate final score
      let correct = 0;
      quiz.questions.forEach(q => {
        const selectedId = answers[q.id];
        const correctOption = q.options.find(o => o.isCorrect);
        if (selectedId && correctOption && selectedId === correctOption.id) {
          correct++;
        }
      });
      const finalScore = Math.round((correct / totalQuestions) * 100);
      setScore(finalScore);
      setPhase('results');
      if (onComplete) onComplete(finalScore, finalScore >= passingScore);
    }
  }, [currentIndex, totalQuestions, answers, revealed, quiz.questions, onComplete, passingScore]);

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const restart = () => {
    setPhase('intro');
    setCurrentIndex(0);
    setAnswers({});
    setRevealed({});
    setScore(0);
  };

  const getOptionState = (question: QuizQuestion, option: QuizOption) => {
    if (!revealed[question.id]) return 'default';
    const selectedId = answers[question.id];
    if (option.isCorrect) return 'correct';
    if (selectedId === option.id && !option.isCorrect) return 'incorrect';
    return 'neutral';
  };

  const answeredCount = Object.keys(answers).length;
  const passed = score >= passingScore;

  // ─── INTRO ────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-8">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-10 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <HelpCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold mb-2">{lessonTitle}</h1>
            <p className="text-blue-200 text-sm font-medium"><AutoI18nText i18nKey="auto.web.components_learn_QuizRunner.k_0cd81d83" /></p>
          </div>

          {/* Body */}
          <div className="p-8">
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { icon: HelpCircle, label: 'Questions', value: `${totalQuestions}`, color: 'text-blue-600 bg-blue-50' },
                { icon: Target, label: 'Passing Score', value: `${passingScore}%`, color: 'text-green-600 bg-green-50' },
                { icon: Clock, label: 'Per Question', value: '45s', color: 'text-amber-600 bg-amber-50' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="flex flex-col items-center p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center mb-2`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800"><AutoI18nText i18nKey="auto.web.components_learn_QuizRunner.k_f15c73c7" /></p>
                  <p className="text-sm text-amber-700 mt-1">
                    <AutoI18nText i18nKey="auto.web.components_learn_QuizRunner.k_da886867" />
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setPhase('running')}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-lg rounded-2xl transition-all shadow-lg hover:shadow-blue-200 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <AutoI18nText i18nKey="auto.web.components_learn_QuizRunner.k_e9eef790" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── RESULTS ──────────────────────────────────────────────────────────────
  if (phase === 'results') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-8 overflow-y-auto">
        <div className="max-w-2xl w-full">
          {/* Score Card */}
          <div className={`rounded-3xl shadow-2xl overflow-hidden bg-white`}>
            <div className={`p-10 text-center ${passed ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}>
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                {passed ? (
                  <Trophy className="w-12 h-12 text-white" />
                ) : (
                  <XCircle className="w-12 h-12 text-white" />
                )}
              </div>
              <p className="text-6xl font-black text-white mb-2">{score}%</p>
              <p className="text-xl font-bold text-white/90">{passed ? '🎉 Congratulations!' : 'Keep Practicing'}</p>
              <p className="text-white/70 text-sm mt-1">{passed ? 'You passed this assessment.' : `You need ${passingScore}% to pass.`}</p>
            </div>

            <div className="p-8">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Correct', value: Math.round((score / 100) * totalQuestions), color: 'text-green-600 bg-green-50' },
                  { label: 'Incorrect', value: totalQuestions - Math.round((score / 100) * totalQuestions), color: 'text-red-600 bg-red-50' },
                  { label: 'Skipped', value: totalQuestions - answeredCount < 0 ? 0 : totalQuestions - answeredCount, color: 'text-gray-500 bg-gray-50' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`flex flex-col items-center p-4 rounded-2xl ${color.split(' ')[1]} border border-gray-100`}>
                    <p className={`text-3xl font-extrabold ${color.split(' ')[0]}`}>{value}</p>
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                  </div>
                ))}
              </div>

              {/* Review answers */}
              <div className="space-y-3 mb-8 max-h-64 overflow-y-auto pr-1">
                {quiz.questions.map((q, i) => {
                  const selected = answers[q.id];
                  const correct = q.options.find(o => o.isCorrect);
                  const isRight = selected && correct && selected === correct.id;
                  return (
                    <div key={q.id} className={`p-3 rounded-xl border ${isRight ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center gap-2">
                        {isRight ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                        <p className="text-xs font-semibold text-gray-700 line-clamp-2">Q{i + 1}: {q.question}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={restart}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 border-2 border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> <AutoI18nText i18nKey="auto.web.components_learn_QuizRunner.k_c30e4d0d" />
                </button>
                {passed && (
                  <button className="flex-1 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-extrabold rounded-2xl shadow-md hover:shadow-green-200 transition-all transform hover:-translate-y-0.5">
                    <AutoI18nText i18nKey="auto.web.components_learn_QuizRunner.k_d642eeb9" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── RUNNING ──────────────────────────────────────────────────────────────
  const timerPercent = (timeLeft / 45) * 100;
  const timerColor = timeLeft > 20 ? 'bg-green-500' : timeLeft > 10 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-[#1E293B] to-[#0F172A] overflow-y-auto">
      {/* Progress Bar */}
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center justify-between text-white/70 text-xs font-semibold mb-2">
          <span><AutoI18nText i18nKey="auto.web.components_learn_QuizRunner.k_21bd1e2c" /> {currentIndex + 1} <AutoI18nText i18nKey="auto.web.components_learn_QuizRunner.k_6d427c71" /> {totalQuestions}</span>
          <span className={`flex items-center gap-1.5 ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : ''}`}>
            <Clock className="w-3.5 h-3.5" />
            {timeLeft}<AutoI18nText i18nKey="auto.web.components_learn_QuizRunner.k_20fefb3a" />
          </span>
        </div>
        {/* Overall progress */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-white/60 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
        {/* Timer */}
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${timerColor} rounded-full transition-all duration-1000`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Question */}
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-extrabold rounded-full uppercase">
                <AutoI18nText i18nKey="auto.web.components_learn_QuizRunner.k_21bd1e2c" /> {currentIndex + 1}
              </span>
            </div>
            <p className="text-xl font-bold text-gray-900 leading-relaxed">{currentQuestion.question}</p>
          </div>

          {/* Options */}
          <div className="p-6 space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const state = getOptionState(currentQuestion, option);
              const selected = answers[currentQuestion.id] === option.id;

              const baseStyle = 'w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 font-medium text-sm flex items-center gap-3';
              const stateStyle = {
                default: selected
                  ? 'border-blue-400 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer',
                correct: 'border-green-400 bg-green-50 text-green-800',
                incorrect: 'border-red-400 bg-red-50 text-red-800',
                neutral: 'border-gray-100 bg-gray-50 text-gray-400 opacity-60',
              }[state];

              const optionLetter = ['A', 'B', 'C', 'D', 'E'][idx];

              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                  className={`${baseStyle} ${stateStyle}`}
                  disabled={!!revealed[currentQuestion.id]}
                >
                  {/* Letter indicator */}
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${
                    state === 'correct' ? 'bg-green-200 text-green-800' :
                    state === 'incorrect' ? 'bg-red-200 text-red-800' :
                    selected ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {state === 'correct' ? '✓' : state === 'incorrect' ? '✗' : optionLetter}
                  </span>
                  <span className="flex-1">{option.text}</span>
                  {state === 'correct' && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
                  {state === 'incorrect' && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Explanation (shown after reveal) */}
          {revealed[currentQuestion.id] && currentQuestion.explanation && (
            <div className="mx-6 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs font-extrabold text-blue-800 uppercase mb-1"><AutoI18nText i18nKey="auto.web.components_learn_QuizRunner.k_dd19455d" /></p>
              <p className="text-sm text-blue-700 leading-relaxed">{currentQuestion.explanation}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="p-6 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> <AutoI18nText i18nKey="auto.web.components_learn_QuizRunner.k_6fb82548" />
            </button>

            {!revealed[currentQuestion.id] && !answers[currentQuestion.id] && (
              <p className="text-xs text-gray-400 font-medium"><AutoI18nText i18nKey="auto.web.components_learn_QuizRunner.k_17019c98" /></p>
            )}
            {revealed[currentQuestion.id] && (
              <p className={`text-xs font-bold ${
                answers[currentQuestion.id] === currentQuestion.options.find(o => o.isCorrect)?.id
                  ? 'text-green-600' : 'text-red-500'
              }`}>
                {answers[currentQuestion.id] === currentQuestion.options.find(o => o.isCorrect)?.id
                  ? '✓ Correct!' : '✗ Incorrect'}
              </p>
            )}

            <button
              onClick={() => handleNext()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
            >
              {currentIndex === totalQuestions - 1 ? 'Finish' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
