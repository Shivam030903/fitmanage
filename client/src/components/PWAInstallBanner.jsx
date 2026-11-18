import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, CheckCircle2 } from 'lucide-react';

export default function PWAInstallBanner({ showModal, setShowModal }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
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

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || window.deferredPWAEvent;
    if (promptEvent) {
      promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User installed FitManage PWA');
      }
      setDeferredPrompt(null);
      window.deferredPWAEvent = null;
      if (setShowModal) setShowModal(false);
    } else {
      // Show instructional modal
      if (setShowModal) setShowModal(true);
    }
  };

  // If already standalone, do not show persistent banner
  if (isStandalone) return null;

  return (
    <>
      {/* Top/Floating Install Prompt Bar */}
      {!dismissed && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-2.5 text-xs flex items-center justify-between border-b border-slate-700 shadow-sm">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-xs">
              ⚡
            </div>
            <div>
              <span className="font-semibold text-emerald-400">Install FitManage App</span>
              <span className="hidden sm:inline text-slate-300 ml-1.5">— Works seamlessly on your home screen offline & online</span>
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

      {/* Instructional Dialog for Android & iOS */}
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
                  <h3 className="font-bold text-slate-900 text-base">Install FitManage PWA</h3>
                  <p className="text-xs text-slate-500">Android, iPhone & Desktop ready</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-900 text-sm">Follow these 2 simple steps on Safari:</p>
                <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center flex-shrink-0">1</span>
                  <div>
                    <p className="font-medium text-slate-800">Tap the Share button</p>
                    <p className="text-slate-500 text-[11px]">Located at the bottom of Safari browser bar</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <div>
                    <p className="font-medium text-slate-800">Select "Add to Home Screen"</p>
                    <p className="text-slate-500 text-[11px]">FitManage will launch full-screen just like a native iOS app!</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-600">
                <p className="text-slate-700">
                  FitManage is a Progressive Web App (PWA). You can install it on your device for instant launch, fast loading, and bottom navigation.
                </p>
                <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 space-y-1">
                  <p className="font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>No App Store or Play Store download required!</span>
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    Saves phone storage and receives instant background updates automatically.
                  </p>
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    onClick={handleInstallClick}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install Now</span>
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
