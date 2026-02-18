import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  generateBranchQR,
  getSecondsUntilNextWindow,
  listenKioskEvents,
  playSuccessSound,
  playFailureSound,
  unlockAudio,
  KioskEvent,
} from '../src/lib/qrAttendance';
import { useAppContext } from '../AppContext';

interface KioskDisplayProps {
  branchId?: string;
}

const KioskDisplay: React.FC<KioskDisplayProps> = ({ branchId: propBranchId }) => {
  const { branches } = useAppContext();

  // ── State ─────────────────────────────────────────────────────────────────
  const [selectedBranchId, setSelectedBranchId] = useState<string>(propBranchId || '');
  const [qrValue, setQrValue] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [kioskMode, setKioskMode] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<KioskEvent | null>(null);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const branch = branches.find(b => b.id === selectedBranchId);

  // ── Generate / refresh QR ─────────────────────────────────────────────────
  const refreshQR = useCallback(() => {
    if (!selectedBranchId) return;
    const { qrValue: val, secondsLeft: secs } = generateBranchQR(selectedBranchId);
    setQrValue(val);
    setSecondsLeft(secs);
  }, [selectedBranchId]);

  // Initial QR generation
  useEffect(() => {
    if (selectedBranchId) refreshQR();
  }, [selectedBranchId, refreshQR]);

  // Refresh QR when the time window changes + countdown ticker
  useEffect(() => {
    if (!selectedBranchId) return;

    const tick = setInterval(() => {
      const secs = getSecondsUntilNextWindow();
      setSecondsLeft(secs);
      if (secs === 30) {
        // New window just started — regenerate QR
        refreshQR();
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [selectedBranchId, refreshQR]);

  // ── Clock ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Listen for scan events from CheckIn tab ───────────────────────────────
  useEffect(() => {
    if (!kioskMode || !selectedBranchId) return;

    const unsub = listenKioskEvents((event) => {
      if (event.branchId !== selectedBranchId) return;

      setLastEvent(event);
      setShowFeedback(true);

      if (event.type === 'SCAN_SUCCESS') {
        playSuccessSound();
      } else {
        playFailureSound();
      }

      // Clear feedback after 4 seconds
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setShowFeedback(false);
        setLastEvent(null);
      }, 4000);
    });

    return () => unsub();
  }, [kioskMode, selectedBranchId]);

  // ── Start Kiosk Mode ──────────────────────────────────────────────────────
  const startKioskMode = (branchId: string) => {
    unlockAudio(); // Unlock Web Audio from user gesture
    setSelectedBranchId(branchId);
    setKioskMode(true);
    setAudioEnabled(true);
    // Try to go fullscreen
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  // Countdown ring SVG
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = (secondsLeft / 30) * circumference;

  // ── Branch selection screen ───────────────────────────────────────────────
  if (!kioskMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-600/30">
              <i className="fas fa-qrcode text-4xl text-white"></i>
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Kiosk Mode</h1>
            <p className="text-slate-400 font-medium">Select a branch to display the attendance QR</p>
          </div>

          <div className="space-y-4">
            {branches.map(b => (
              <button
                key={b.id}
                onClick={() => startKioskMode(b.id)}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-blue-500 text-white p-6 rounded-2xl transition-all group text-left flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-blue-600/20 group-hover:bg-blue-600 rounded-xl flex items-center justify-center transition-all">
                  <i className="fas fa-building text-blue-400 group-hover:text-white"></i>
                </div>
                <div>
                  <p className="font-black text-lg">{b.name}</p>
                  <p className="text-slate-400 text-sm">{b.address}</p>
                </div>
                <i className="fas fa-arrow-right ml-auto text-slate-600 group-hover:text-blue-400 transition-all"></i>
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <div className="flex items-start gap-3">
              <i className="fas fa-volume-up text-amber-400 mt-0.5"></i>
              <p className="text-amber-300 text-sm font-medium">
                Clicking "Start" will enable <strong>sound notifications</strong>. Make sure your device volume is on.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Full Kiosk Display ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col select-none overflow-hidden relative">

      {/* ── Success / Failure Overlay ───────────────────────────────────────── */}
      {showFeedback && lastEvent && (
        <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center transition-all duration-300 ${
          lastEvent.type === 'SCAN_SUCCESS' ? 'bg-emerald-950/95' : 'bg-red-950/95'
        }`}>
          {/* Animated icon */}
          <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-2xl ${
            lastEvent.type === 'SCAN_SUCCESS'
              ? 'bg-emerald-500 shadow-emerald-500/50 animate-bounce'
              : 'bg-red-500 shadow-red-500/50 animate-pulse'
          }`}>
            <i className={`text-6xl text-white fas ${lastEvent.type === 'SCAN_SUCCESS' ? 'fa-check' : 'fa-times'}`}></i>
          </div>

          {/* User card (on success) */}
          {lastEvent.type === 'SCAN_SUCCESS' && lastEvent.userName && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 mb-4 flex items-center gap-4 min-w-[320px]">
              {lastEvent.userAvatar ? (
                <img src={lastEvent.userAvatar} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-400" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/30 flex items-center justify-center">
                  <i className="fas fa-user text-2xl text-emerald-400"></i>
                </div>
              )}
              <div>
                <p className="text-white font-black text-xl">{lastEvent.userName}</p>
                {lastEvent.memberId && (
                  <p className="text-emerald-400 font-mono text-sm">{lastEvent.memberId}</p>
                )}
                <p className="text-slate-400 text-xs uppercase tracking-widest mt-1">{lastEvent.userRole?.replace('_', ' ')}</p>
              </div>
            </div>
          )}

          <p className={`text-2xl font-black uppercase tracking-widest mb-2 ${
            lastEvent.type === 'SCAN_SUCCESS' ? 'text-emerald-300' : 'text-red-300'
          }`}>
            {lastEvent.type === 'SCAN_SUCCESS' ? '✅ Access Granted' : '❌ Access Denied'}
          </p>
          <p className="text-slate-400 font-medium text-center max-w-sm px-4">{lastEvent.message}</p>

          {/* Progress bar for auto-dismiss */}
          <div className="mt-8 w-64 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full animate-[shrink_4s_linear_forwards] ${
                lastEvent.type === 'SCAN_SUCCESS' ? 'bg-emerald-400' : 'bg-red-400'
              }`}
            ></div>
          </div>
        </div>
      )}

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-10 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl">
            <i className="fas fa-dumbbell text-white text-lg"></i>
          </div>
          <div>
            <p className="text-white font-black text-sm uppercase tracking-widest">Speed Fitness</p>
            <p className="text-slate-500 text-xs">{branch?.name}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-white font-black text-2xl font-mono">{currentTime}</p>
          <p className="text-slate-400 text-xs">{currentDate}</p>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-4">
        <h1 className="text-5xl font-black text-white uppercase tracking-tighter text-center mb-2">
          Scan to Check In
        </h1>
        <p className="text-slate-400 font-medium mb-10 text-center">
          Open the <span className="text-blue-400 font-bold">Speed Fitness app</span> → Check-In → Point your camera here
        </p>

        {/* QR Code with countdown ring */}
        <div className="relative flex items-center justify-center">
          {/* Countdown ring */}
          <svg className="absolute -inset-6 w-[calc(100%+48px)] h-[calc(100%+48px)]" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={radius + 35} fill="none" stroke="#1e293b" strokeWidth="4" />
            <circle
              cx="70"
              cy="70"
              r={radius + 35}
              fill="none"
              stroke={secondsLeft <= 5 ? '#ef4444' : secondsLeft <= 10 ? '#f59e0b' : '#3b82f6'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${((secondsLeft / 30) * 2 * Math.PI * (radius + 35)).toFixed(2)} ${(2 * Math.PI * (radius + 35)).toFixed(2)}`}
              strokeDashoffset="0"
              transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dasharray 1s linear, stroke 0.3s' }}
            />
          </svg>

          {/* QR box */}
          <div className="bg-white p-5 rounded-3xl shadow-2xl relative z-10">
            {qrValue ? (
              <QRCodeSVG
                value={qrValue}
                size={280}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: '',
                  height: 0,
                  width: 0,
                  excavate: false
                }}
              />
            ) : (
              <div className="w-[280px] h-[280px] flex items-center justify-center">
                <i className="fas fa-circle-notch fa-spin text-4xl text-slate-400"></i>
              </div>
            )}
          </div>
        </div>

        {/* Countdown text */}
        <div className="mt-8 flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
            secondsLeft <= 5 ? 'bg-red-500' : secondsLeft <= 10 ? 'bg-amber-500' : 'bg-emerald-500'
          }`}></div>
          <p className="text-slate-400 text-sm font-medium">
            QR refreshes in <span className={`font-black tabular-nums ${
              secondsLeft <= 5 ? 'text-red-400' : secondsLeft <= 10 ? 'text-amber-400' : 'text-white'
            }`}>{secondsLeft}s</span>
          </p>
        </div>
      </div>

      {/* ── Bottom status bar ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-10 pb-8 pt-4 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-slate-500 text-xs font-medium uppercase tracking-widest">Kiosk Active</span>
        </div>

        <div className="flex items-center gap-2">
          <i className={`fas fa-volume-up text-xs ${audioEnabled ? 'text-emerald-400' : 'text-slate-600'}`}></i>
          <span className="text-slate-500 text-xs">Sound {audioEnabled ? 'ON' : 'OFF'}</span>
        </div>

        <button
          onClick={() => setKioskMode(false)}
          className="text-slate-700 hover:text-slate-400 text-xs uppercase tracking-widest transition-colors"
        >
          ✕ Exit
        </button>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default KioskDisplay;
