import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  QrCode, Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle, 
  Users, Activity, Clock, Search, Trash2, Volume2, VolumeX, 
  UserCheck, ShieldCheck, Dumbbell, RefreshCw, ArrowRight 
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Web Audio API Synthesizer for instant audible reception feedback
function playSound(type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (type === 'success') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc1.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.35);
    } else {
      // Error buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.setValueAtTime(120, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    // Audio context not allowed or supported
  }
}

export default function Attendance() {
  const { gym } = useAuth();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Live Camera Scanner State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const html5QrCodeRef = useRef(null);
  const isProcessingScanRef = useRef(false);

  // Latest Scan Verification Result Modal / Card
  const [lastCheckInResult, setLastCheckInResult] = useState(null);

  const fetchAttendanceData = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [listRes, statsRes] = await Promise.all([
        api.getAttendance({ date: todayStr }),
        api.getAttendanceStats()
      ]);
      setLogs(listRes.logs || []);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
    // Auto-refresh attendance feed every 30 seconds
    const interval = setInterval(fetchAttendanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Process check-in for a scanned or typed identifier
  const handleCheckIn = async (identifier, source = 'manual') => {
    if (!identifier || !identifier.trim() || checkingIn) return;

    setCheckingIn(true);
    setCameraError('');

    try {
      const res = await api.checkInMember({
        identifier: identifier.trim(),
        source
      });

      setLastCheckInResult(res);

      if (res.accessGranted) {
        if (soundEnabled) playSound('success');
        if (res.alertType === 'success') {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        }
      } else {
        if (soundEnabled) playSound('error');
      }

      setManualInput('');
      fetchAttendanceData();
    } catch (err) {
      if (soundEnabled) playSound('error');
      setLastCheckInResult({
        success: false,
        accessGranted: false,
        accessStatus: 'not_found',
        message: err.message || 'Check-in failed. Please verify member ID.'
      });
    } finally {
      setCheckingIn(false);
    }
  };

  // Start Camera Scanner
  const startCamera = async () => {
    setCameraError('');
    try {
      const qrRegionId = 'qr-reader';
      const html5QrCode = new Html5Qrcode(qrRegionId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          if (isProcessingScanRef.current) return;
          isProcessingScanRef.current = true;

          // Process the scanned QR code
          await handleCheckIn(decodedText, 'camera_qr');

          // Pause 2.5 seconds before accepting next scan to prevent double scans
          setTimeout(() => {
            isProcessingScanRef.current = false;
          }, 2500);
        },
        () => {
          // Frame error (no QR found yet) - silent
        }
      );

      setCameraActive(true);
    } catch (err) {
      console.error('Camera startup error:', err);
      setCameraError('Unable to access camera. Please allow camera permissions or use manual lookup.');
      setCameraActive(false);
    }
  };

  // Stop Camera Scanner
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Camera stop error:', e);
      }
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      // Cleanup camera on component unmount
      if (html5QrCodeRef.current && cameraActive) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [cameraActive]);

  const handleDeleteLog = async (id) => {
    if (confirm('Remove this check-in record?')) {
      try {
        await api.deleteAttendanceRecord(id);
        fetchAttendanceData();
      } catch (e) {
        alert(e.message || 'Failed to remove record.');
      }
    }
  };

  const filteredLogs = logs.filter(l => {
    if (filterStatus === 'granted' && !l.accessGranted) return false;
    if (filterStatus === 'denied' && l.accessGranted) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        l.customerName.toLowerCase().includes(q) ||
        l.customerId.toLowerCase().includes(q) ||
        (l.customerPhone && l.customerPhone.includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Reception Attendance &amp; Check-in Scanner
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Live Scanner
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Instant member access validation, live studio occupancy counter, and real-time punch feed.
          </p>
        </div>

        {/* Audio Mute & Refresh controls */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              soundEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
            title={soundEnabled ? 'Audible Chimes On' : 'Audible Chimes Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
          </button>

          <button
            type="button"
            onClick={fetchAttendanceData}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-slate-900">{stats?.totalCheckIns || logs.length}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Today's Punches</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-emerald-700">{stats?.grantedCount || logs.filter(l => l.accessGranted).length}</div>
            <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Access Granted</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-rose-700">{stats?.deniedCount || logs.filter(l => !l.accessGranted).length}</div>
            <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Access Denied</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-slate-900">
              {stats?.liveOccupancy?.currentMembers || 18} <span className="text-xs font-normal text-slate-400">/ {stats?.liveOccupancy?.maxCapacity || 50}</span>
            </div>
            <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Live On-Floor</div>
          </div>
        </div>
      </div>

      {/* Main Scanner & Check-in Control Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Scanner & Manual Input (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Live Reception Scanner</span>
              </h3>
              <button
                type="button"
                onClick={cameraActive ? stopCamera : startCamera}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm ${
                  cameraActive 
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
              >
                {cameraActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                <span>{cameraActive ? 'Stop Camera' : 'Start Camera Scanner'}</span>
              </button>
            </div>

            {/* Video Viewport */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center min-h-[260px] text-center p-3">
              <div 
                id="qr-reader" 
                className={`w-full max-w-[320px] ${cameraActive ? 'block' : 'hidden'}`} 
              />

              {!cameraActive && (
                <div className="text-slate-400 space-y-3 py-6 px-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">Camera Scanner Inactive</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                      Click <strong>"Start Camera Scanner"</strong> to scan member digital cards, or use manual entry below.
                    </p>
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 text-xs w-full mt-2">
                  {cameraError}
                </div>
              )}
            </div>

            {/* Manual ID / Phone Input */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleCheckIn(manualInput, 'manual_keyboard');
              }}
              className="space-y-2 pt-1"
            >
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Manual Member Lookup or USB Barcode Gun
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Customer ID (e.g. FIT-1001) or Phone..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={checkingIn || !manualInput.trim()}
                  className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 flex items-center space-x-1"
                >
                  {checkingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Check-in</span>}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Tip: Works seamlessly with reception USB barcode scanners, RFID readers, and manual keypad entries.
              </p>
            </form>
          </div>

          {/* Real-time Scan Result Card */}
          {lastCheckInResult && (
            <div className={`p-5 rounded-2xl border shadow-md space-y-3 animate-in zoom-in-95 transition-all ${
              lastCheckInResult.accessGranted
                ? lastCheckInResult.alertType === 'warning'
                  ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                  : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                : 'bg-rose-50/90 border-rose-300 text-rose-950'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm ${
                    lastCheckInResult.accessGranted
                      ? lastCheckInResult.alertType === 'warning' ? 'bg-amber-500' : 'bg-emerald-600'
                      : 'bg-rose-600'
                  }`}>
                    {lastCheckInResult.accessGranted 
                      ? (lastCheckInResult.alertType === 'warning' ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-7 h-7" />)
                      : <XCircle className="w-7 h-7" />
                    }
                  </div>
                  <div>
                    <span className={`text-[11px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full inline-block mb-0.5 ${
                      lastCheckInResult.accessGranted
                        ? lastCheckInResult.alertType === 'warning' ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
                        : 'bg-rose-200 text-rose-900'
                    }`}>
                      {lastCheckInResult.accessGranted ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                    </span>
                    <h3 className="font-black text-base sm:text-lg leading-tight">
                      {lastCheckInResult.customer?.name || 'Member Verification'}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLastCheckInResult(null)}
                  className="text-xs opacity-60 hover:opacity-100 font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs font-semibold leading-relaxed">
                {lastCheckInResult.message}
              </p>

              {lastCheckInResult.customer && (
                <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="opacity-70 block">Customer ID:</span>
                    <strong className="font-mono">{lastCheckInResult.customer.customerId}</strong>
                  </div>
                  <div>
                    <span className="opacity-70 block">Membership Plan:</span>
                    <strong>{lastCheckInResult.currentMembership?.planName || 'No Plan'}</strong>
                  </div>
                  <div>
                    <span className="opacity-70 block">Plan Expiry Date:</span>
                    <strong>{lastCheckInResult.currentMembership?.endDate || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="opacity-70 block">Outstanding Dues:</span>
                    <strong className={lastCheckInResult.customer.outstandingBalance > 0 ? 'text-rose-700 font-bold' : ''}>
                      ₹{(lastCheckInResult.customer.outstandingBalance || 0).toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>
              )}

              {lastCheckInResult.customer && (
                <div className="pt-2 flex justify-end">
                  <Link
                    to={`/customers/${lastCheckInResult.customer._id}`}
                    className="text-xs font-bold text-slate-800 hover:text-emerald-700 flex items-center space-x-1"
                  >
                    <span>Open Member Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Today's Live Attendance Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Today's Live Check-in Feed</span>
                  <span className="text-xs font-normal text-slate-400">({filteredLogs.length} entries)</span>
                </h3>
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-1.5 text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'granted', label: 'Granted' },
                  { id: 'denied', label: 'Denied' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterStatus(f.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      filterStatus === f.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Filter today's punches by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* List of Today's Check-ins */}
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-semibold">
                Loading today's attendance logs...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <UserCheck className="w-5 h-5" />
                </div>
                <p>No check-in punches recorded matching this filter today.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredLogs.map((log) => (
                  <div
                    key={log._id}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      log.accessGranted 
                        ? log.outstandingBalance > 0
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-white hover:bg-slate-50/70 border-slate-200/80'
                        : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        log.accessGranted 
                          ? log.outstandingBalance > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {log.accessGranted ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/customers/${log.customerId}`}
                            className="font-bold text-xs text-slate-900 hover:text-emerald-600 transition-colors"
                          >
                            {log.customerName}
                          </Link>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                            {log.customerId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                          <span>{log.planName}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">{log.time}</span>
                          {log.outstandingBalance > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-700 font-semibold text-[10px]">
                                Due: ₹{log.outstandingBalance}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.accessGranted 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {log.accessGranted ? 'Granted' : 'Denied'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteLog(log._id)}
                        className="p-1 text-slate-300 hover:text-rose-600 transition-colors rounded"
                        title="Remove check-in log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}