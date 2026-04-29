'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, CheckCircle2, AlertCircle, Terminal } from 'lucide-react';

interface CodePlaygroundProps {
  language: string;
  initialCode: string;
  onCodeChange?: (code: string) => void;
  onRun?: (code: string) => Promise<{ stdout: string; stderr: string; error?: string }>;
}

export default function CodePlayground({ 
  language, 
  initialCode, 
  onCodeChange,
  onRun 
}: CodePlaygroundProps) {
    const autoT = useTranslations();
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    if (onCodeChange) onCodeChange(newCode);
  };

  const handleRun = async () => {
    if (!onRun) {
      setOutput('Runner not implemented yet. Backend execution service is being prepared!');
      return;
    }

    try {
      setRunning(true);
      setOutput('Running code...\n');
      const result = await onRun(code);
      
      if (result.error) {
        setOutput(`Error: ${result.error}\n${result.stderr}`);
      } else {
        setOutput(result.stdout || result.stderr || 'Code executed successfully with no output.');
      }
    } catch (err: any) {
      setOutput(`Execution failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const resetCode = () => {
    if (confirm('Are you sure you want to reset your code to the initial template?')) {
      setCode(initialCode);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
      {/* Toolbar */}
      <div className="bg-[#2d2d2d] px-4 py-2 border-b border-[#1e1e1e] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest px-2 py-1 bg-[#1e1e1e] rounded">
            <AutoI18nText i18nKey="auto.web.components_learn_CodePlayground.k_e94c3ec3" />{language === 'cpp' ? 'cpp' : language === 'python' ? 'py' : language === 'javascript' ? 'js' : language}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={resetCode}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title={autoT("auto.web.components_learn_CodePlayground.k_6fa11c49")}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleRun}
            disabled={running}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm ${
              running 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white transform active:scale-95'
            }`}
          >
            {running ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <AutoI18nText i18nKey="auto.web.components_learn_CodePlayground.k_e5ba2971" />
          </button>
        </div>
      </div>

      {/* Editor & Console Split */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Monaco Editor */}
        <div className="flex-[3] relative border-b md:border-b-0 md:border-r border-[#2d2d2d]">
          <Editor
            height="100%"
            defaultLanguage={language}
            theme={theme}
            value={code}
            onChange={handleEditorChange}
            options={{
              fontSize: 14,
              fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16 },
              cursorSmoothCaretAnimation: 'on',
              smoothScrolling: true,
              lineNumbersMinChars: 3,
            }}
          />
        </div>

        {/* Console Output */}
        <div className="flex-[2] bg-[#0f0f0f] flex flex-col">
          <div className="px-4 py-2 bg-[#1a1a1a] border-b border-[#2d2d2d] flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-400">
              <Terminal className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider"><AutoI18nText i18nKey="auto.web.components_learn_CodePlayground.k_4c5355d4" /></span>
            </div>
            {output && !running && (
              <button onClick={() => setOutput('')} className="text-[10px] text-gray-500 hover:text-gray-300"><AutoI18nText i18nKey="auto.web.components_learn_CodePlayground.k_18a2ead6" /></button>
            )}
          </div>
          
          <div className="flex-1 p-4 overflow-auto font-mono text-sm leading-relaxed">
            {output ? (
              <pre className={`whitespace-pre-wrap ${output.includes('Error') || output.includes('failed') ? 'text-red-400' : 'text-gray-300'}`}>
                {output}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50 space-y-2">
                <Terminal className="w-8 h-8" />
                <p className="text-xs"><AutoI18nText i18nKey="auto.web.components_learn_CodePlayground.k_b5f6a0b0" /></p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-[#1a1a1a] px-4 py-1.5 border-t border-[#2d2d2d] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span><AutoI18nText i18nKey="auto.web.components_learn_CodePlayground.k_e7b40f20" /></span>
          </div>
        </div>
        <div className="text-[10px] text-gray-500 font-medium italic">
          <AutoI18nText i18nKey="auto.web.components_learn_CodePlayground.k_68a30436" />
        </div>
      </div>
    </div>
  );
}
