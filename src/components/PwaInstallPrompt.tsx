import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, MoreVertical } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show prompt after 2 seconds
    const timer = setTimeout(() => {
      if (!isInstalled) {
        setShowPrompt(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, [isInstalled]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Native install prompt available
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      // Show step-by-step guide
      setShowGuide(true);
    }
  };

  if (isInstalled || !showPrompt) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 animate-slide-up">
      <div className="bg-[#1A1F2E] border border-[#2A3040] rounded-xl p-4 shadow-2xl">
        {!showGuide ? (
          <>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center flex-shrink-0">
                <Download size={20} className="text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-text-primary">安装 AlphaPath</h3>
                <p className="text-xs text-text-muted mt-1">
                  添加到主屏幕，像原生APP一样使用
                </p>
              </div>
              <button
                onClick={() => setShowPrompt(false)}
                className="p-1 text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
            <button
              onClick={handleInstall}
              className="mt-3 w-full py-2.5 bg-gold hover:bg-gold/90 text-ink text-sm font-semibold rounded-lg transition-colors"
            >
              立即安装
            </button>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center flex-shrink-0">
                <Smartphone size={20} className="text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-text-primary">安装引导</h3>
              </div>
              <button
                onClick={() => setShowPrompt(false)}
                className="p-1 text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-text-secondary">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
                  <p>点击 Safari 底部的 <Share size={12} className="inline text-gold" /> <strong className="text-text-primary">分享按钮</strong>（方框+向上箭头）</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
                  <p>在弹出的菜单中向下滑动，找到 <strong className="text-text-primary">"添加到主屏幕"</strong></p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center flex-shrink-0 text-[10px] font-bold">3</span>
                  <p>点击 <strong className="text-text-primary">"添加"</strong>，主屏幕上就会出现 AlphaPath 图标</p>
                </div>
              </div>
            ) : isAndroid ? (
              <div className="space-y-3 text-xs text-text-secondary">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
                  <p>点击 Chrome 右上角的 <MoreVertical size={12} className="inline text-gold" /> <strong className="text-text-primary">三个点菜单</strong></p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
                  <p>找到并点击 <strong className="text-text-primary">"安装应用"</strong> 或 <strong className="text-text-primary">"添加到主屏幕"</strong></p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center flex-shrink-0 text-[10px] font-bold">3</span>
                  <p>确认安装后，主屏幕上就会出现 AlphaPath 图标</p>
                </div>
                <div className="mt-2 p-2 bg-gold/10 rounded-lg">
                  <p className="text-gold text-[11px]">提示：如果菜单中没有"安装应用"选项，请先关闭无痕模式，并确保没有使用 VPN 代理。</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-text-secondary">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
                  <p>查看浏览器地址栏右侧是否有 <Download size={12} className="inline text-gold" /> <strong className="text-text-primary">安装图标</strong></p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
                  <p>或者点击浏览器菜单（右上角三个点/三条线），找到 <strong className="text-text-primary">"安装 AlphaPath"</strong></p>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="mt-3 w-full py-2 border border-[#2A3040] text-text-secondary text-xs rounded-lg hover:border-gold/30 hover:text-text-primary transition-colors"
            >
              返回
            </button>
          </>
        )}
      </div>
    </div>
  );
}
