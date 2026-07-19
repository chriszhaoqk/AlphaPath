import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, Maximize2 } from 'lucide-react';
import VoiceInput from '@/components/VoiceInput';
import FullscreenEditor from '@/components/FullscreenEditor';

interface VoiceTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  parentId?: string; // for attachments support in fullscreen
  supportRichText?: boolean; // enable fullscreen rich text editor
}

// Web Speech API - SpeechRecognition
type SpeechRecognitionType = any;

function getSpeechRecognition(): SpeechRecognitionType {
  if (typeof window === 'undefined') return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return SR || null;
}

function isVoiceSupported(): boolean {
  return getSpeechRecognition() !== null;
}

export default function VoiceTextInput({
  value,
  onChange,
  placeholder = '请输入...',
  label,
  multiline = false,
  rows = 3,
  className = '',
  parentId,
  supportRichText = false,
}: VoiceTextInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionType>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Fullscreen editor state
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const supported = isVoiceSupported();

  const toggleListening = useCallback(() => {
    if (!supported) {
      setError('当前浏览器不支持语音识别');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      setInterimText('');
    } else {
      try {
        const SR = getSpeechRecognition();
        if (!SR) return;
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'zh-CN';

        recognition.onresult = (event: any) => {
          let interim = '';
          let finalText = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += transcript;
            } else {
              interim += transcript;
            }
          }
          if (finalText) {
            const separator = value && !value.endsWith('\n') && !value.endsWith('，') && !value.endsWith('。') && !value.endsWith(' ') ? '，' : '';
            onChange(value + separator + finalText);
          }
          setInterimText(interim);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            setError('麦克风权限被拒绝');
          } else if (event.error === 'no-speech') {
            setError('未检测到语音');
          } else if (event.error === 'audio-capture') {
            setError('未检测到麦克风');
          } else if (event.error === 'network') {
            setError('需要网络连接');
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimText('');
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
        setError('');
      } catch (e) {
        console.warn('Failed to start recognition:', e);
      }
    }
  }, [supported, isListening, value, onChange]);

  const handleFullscreenSave = useCallback((html: string) => {
    onChange(html);
    setFullscreenOpen(false);
  }, [onChange]);

  // 自动保存：仅同步内容到外层 state，不关闭窗口
  const handleFullscreenAutoSave = useCallback((html: string) => {
    onChange(html);
  }, [onChange]);

  const baseInputClass =
    'w-full bg-[#0D1117] border border-[#2A3040] rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50 transition-colors pr-[72px]';

  return (
    <div className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-2 px-1">{label}</label>
      )}

      <div className="relative">
        {multiline ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={`${baseInputClass} resize-none leading-relaxed min-h-[80px]`}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${baseInputClass} min-h-[48px]`}
          />
        )}

        {/* Action buttons overlay */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {supportRichText && (
            <button
              onClick={() => setFullscreenOpen(true)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:text-gold hover:bg-gold/10 active:bg-gold/20 transition-all"
              title="全屏编辑（支持富文本、附件、AI总结）"
            >
              <Maximize2 size={16} />
            </button>
          )}

          <button
            onClick={toggleListening}
            disabled={!supported}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-95 border ${
              !supported
                ? 'bg-[#1A1F2E] text-text-muted/70 cursor-not-allowed border-border-custom'
                : isListening
                  ? 'bg-urgent/20 text-urgent animate-pulse shadow-lg shadow-urgent/20 border-urgent/30'
                  : 'bg-gold/15 text-gold hover:bg-gold/25 active:bg-gold/30 border-gold/20'
            }`}
            title={supported ? (isListening ? '点击停止录音（中文）' : '点击开始语音输入（中文）') : '当前环境不支持语音识别（需Chrome浏览器）'}
          >
            {isListening ? (
              <Mic size={16} />
            ) : supported ? (
              <Mic size={16} />
            ) : (
              <MicOff size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Interim / error display */}
      {isListening && interimText && (
        <div className="mt-2 text-sm text-gold bg-gold/5 rounded-lg px-3 py-2 border border-gold/20 animate-pulse">
          正在识别：{interimText}...
        </div>
      )}
      {!supported && (
        <div className="mt-1.5 text-[11px] text-text-muted/60 px-1">
          当前环境不支持语音识别，请使用 Chrome 浏览器
        </div>
      )}
      {error && !isListening && (
        <div className="mt-2 text-xs text-urgent bg-urgent/5 rounded-lg px-3 py-2 border border-urgent/20">
          {error}
        </div>
      )}

      {/* Fullscreen rich text editor */}
      {fullscreenOpen && (
        <FullscreenEditor
          label={label || '编辑内容'}
          value={value}
          onSave={handleFullscreenSave}
          onAutoSave={handleFullscreenAutoSave}
          onClose={() => setFullscreenOpen(false)}
          parentId={parentId}
        />
      )}
    </div>
  );
}
