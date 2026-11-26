import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, CheckCircle2, ArrowRight, Zap, ShieldCheck } from 'lucide-react';

export default function UpgradeModal({ isOpen, onClose, title, message, currentCount, limit, plan }) {
  const navigate = useNavigate();
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />
        
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
            {title || 'Upgrade Your Plan'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {message || 'You have reached the maximum active member capacity on your current plan. Upgrade to unlock more members and advanced features.'}
          </p>
        </div>

        {limit && (
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span>Member Quota Utilization</span>
              <span className="font-mono text-emerald-600 font-bold">{currentCount} / {limit} Members</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all" 
                style={{ width: `${Math.min(100, Math.round((currentCount / limit) * 100))}%` }} 
              />
            </div>
          </div>
        )}

        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Scale to 500 or Unlimited Members</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Official Meta WhatsApp Cloud API Integration</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Reception QR Camera Attendance Scanner & Occupancy</span>
          </div>
        </div>

        <div className="pt-2 flex items-center space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            Maybe Later
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/subscription');
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/30 transition-all"
          >
            <span>View SaaS Plans</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
