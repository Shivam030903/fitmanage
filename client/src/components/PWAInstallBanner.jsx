import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, CheckCircle2, Monitor, MoreVertical } from 'lucide-react';

export default function PWAInstallBanner({ showModal, setShowModal }) {
  const [deferredPrompt, setDeferredPrompt] = useState(() => window.deferredPWAEvent || null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already running as installed standalone PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(standalone);

    // Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIphoneOrIpad = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIphoneOrIpad);

    // Listen for beforeinstallprompt event (Chromium / Android / Desktop Chrome)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPWAEvent = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // If early catch already happened
    if (window.deferredPWAEvent) {
      setDeferredPrompt(window.deferredPWAEvent);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || window.deferredPWAEvent;
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          console.log('User accepted FitManage install prompt');
        }
        setDeferredPrompt(null);
        window.deferredPWAEvent = null;
        if (setShowModal) setShowModal(false);
        return;
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    }
    // Fall back to showing instructional modal
    if (setShowModal) setShowModal(true);
  };

  // If already running inside standalone installed window, do not show persistent top bar
  if (isStandalone) return null;

  return (
    <>
      {/* Top Floating Install Prompt Notification Bar */}
      {!dismissed && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-4 py-2 text-xs flex items-center justify-between border-b border-slate-700 shadow-sm">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-xs">
              ⚡
            </div>
            <div>
              <span className="font-semibold text-emerald-400">Install FitManage App</span>
              <span className="hidden sm:inline text-slate-300 ml-1.5">— Instant access on your phone or desktop home screen</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-colors"
            >
              Install App
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Instructional Dialog for Android, iPhone & Desktop */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
                  <Smartphone className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Install FitManage App</h3>
                  <p className="text-xs text-slate-500">Android, iPhone & Desktop PWA</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If native prompt available, offer 1-click button */}
            {(deferredPrompt || window.deferredPWAEvent) && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <button
                  onClick={handleInstallClick}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Click Here to Install Directly</span>
                </button>
              </div>
            )}

            {/* Device-Specific Guides */}
            <div className="space-y-2.5 text-xs text-slate-600">
              <p className="font-semibold text-slate-900">How to install manually:</p>

              {/* Android Guide */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>On Android Phone (Chrome):</span>
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Tap the <strong>3 dots (⋮)</strong> at the top right of Chrome &gt; Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </p>
              </div>

              {/* iPhone Guide */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <Share className="w-3.5 h-3.5 text-blue-600" />
                  <span>On iPhone / iPad (Safari):</span>
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Tap the <strong>Share</strong> button (square with arrow pointing up) &gt; Scroll down and tap <strong>"Add to Home Screen"</strong>.
                </p>
              </div>

              {/* Desktop Guide */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <Monitor className="w-3.5 h-3.5 text-purple-600" />
                  <span>On PC / Mac (Chrome / Edge):</span>
                </p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Click the <strong>Install icon</strong> (computer monitor with download arrow) in the address bar at top right, or click browser menu ⋮ &gt; <strong>Save and share</strong> &gt; <strong>Install FitManage</strong>.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
