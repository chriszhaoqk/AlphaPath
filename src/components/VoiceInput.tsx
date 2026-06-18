import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, XCircle } from 'lucide-react';

interface VoiceInputProps {
  onTextReceived: (text: string) => void;
  lang?: string;
  buttonSize?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Web Speech API - SpeechRecognition (supports Chinese on modern browsers)
type SpeechRecognitionType = any;
let recognitionInstance: SpeechRecognitionType = null;

export function getSpeechRecognition(): SpeechRecognitionType {
  if (typeof window === 'undefined') return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return SR || null;
}

export function isVoiceSupported(): boolean {
  return getSpeechRecognition() !== null;
}

export default function VoiceInput({
  onTextReceived,
  lang = 'zh-CN',
  buttonSize = 'md',
  className = '',
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionType>(null);

  useEffect(() => {
    const SR = getSpeechRecognition();
    setIsSupported(SR !== null);

    if (SR) {
      try {
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;
        recognitionRef.current = recognition;

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
            onTextReceived(finalText);
          }
          setInterimText(interim);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            setError('麦克风权限被拒绝，请在设置中开启');
          } else if (event.error === 'no-speech') {
            setError('未检测到语音，请重试');
          } else if (event.error === 'audio-capture') {
            setError('未检测到麦克风设备');
          } else if (event.error === 'network') {
            setError('网络连接问题，语音识别需要网络');
          } else {
            setError(`识别错误: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimText('');
        };

        recognition.onaudiostart = () => {
          setError('');
        };
      } catch (e) {
        console.warn('Speech recognition init failed:', e);
      }
    }

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
  }, [lang, onTextReceived]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('当前浏览器不支持语音识别');
      return;
    }
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
      setInterimText('');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setError('');
      } catch (e) {
        console.warn('Failed to start recognition:', e);
      }
    }
  };

  const sizeClass =
    buttonSize === 'sm'
      ? 'w-8 h-8'
      : buttonSize === 'lg'
        ? 'w-12 h-12'
        : 'w-10 h-10';
  const iconSize = buttonSize === 'sm' ? 14 : buttonSize === 'lg' ? 22 : 18;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        onClick={toggleListening}
        disabled={!isSupported}
        className={`${sizeClass} flex-shrink-0 rounded-full flex items-center justify-center transition-all active:scale-95 border ${
          !isSupported
            ? 'bg-[#1A1F2E] text-text-muted/70 cursor-not-allowed border-border-custom'
            : isListening
              ? 'bg-urgent/90 text-white animate-pulse shadow-lg shadow-urgent/30 border-urgent/50'
              : 'bg-gold/90 text-ink hover:bg-gold active:bg-gold border-gold/50'
        }`}
        title={isSupported ? (isListening ? '点击停止录音' : '点击开始语音输入（中文）') : '当前环境不支持语音识别（需Chrome浏览器）'}
      >
        {isListening ? (
          isSupported ? (
            <Mic size={iconSize} />
          ) : (
            <MicOff size={iconSize} />
          )
        ) : (
          <Mic size={iconSize} />
        )}
      </button>

      {!isSupported && (
        <span className="text-[10px] text-text-muted/60 hidden md:inline">不支持语音</span>
      )}

      {isListening && interimText && (
        <div className="text-xs text-gold font-medium truncate max-w-[150px] animate-pulse">
          "...{interimText}"
        </div>
      )}

      {error && !isListening && (
        <button
          onClick={() => setError('')}
          className="text-xs text-urgent flex items-center gap-1 hover:underline"
          title={error}
        >
          <XCircle size={12} />
          <span className="truncate max-w-[120px]">{error}</span>
        </button>
      )}
    </div>
  );
}
