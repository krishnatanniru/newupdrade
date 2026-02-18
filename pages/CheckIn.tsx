import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAppContext } from '../AppContext';
import { SubscriptionStatus, PlanType, UserRole, Shift } from '../types';
import {
  parseQRCode,
  validateBranchQR,
  validateUserQR,
  markTokenUsed,
  isTokenUsed,
  broadcastKioskEvent,
  BranchQRPayload,
  UserQRPayload,
} from '../src/lib/qrAttendance';

// ─── Shift helpers ────────────────────────────────────────────────────────────
const parseTime = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const getNowHHMM = (): string => {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
};
const findMatchingShift = (now: string, shifts: Shift[]) => {
  const cur = parseTime(now);
  for (let i = 0; i < shifts.length; i++) {
    const { start, end } = shifts[i];
    if (cur >= parseTime(start) - 30 && cur <= parseTime(end))
      return { shift: shifts[i], index: i };
  }
  return null;
};

type ScanResult = {
  success: boolean;
  message: string;
  subMessage?: string;
  userName?: string;
  userAvatar?: string;
  userRole?: string;
  memberId?: string;
  isCheckOut?: boolean;
};

const CheckIn: React.FC = () => {
  const {
    users, subscriptions, plans, recordAttendance, updateAttendance,
    attendance, currentUser, branches, showToast, bookings, updateBooking,
  } = useAppContext();

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const qrRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false); // prevent double-fire

  // ── Start camera scanner ──────────────────────────────────────────────────
  useEffect(() => {
    const container = document.getElementById('qr-reader');
    if (!container) return;

    const html5QrCode = new Html5Qrcode('qr-reader');
    qrRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: 260, height: 260 }, aspectRatio: 1 },
        (decodedText) => {
          if (processingRef.current) return; // debounce
          processingRef.current = true;
          handleQRScan(decodedText);
          setTimeout(() => { processingRef.current = false; }, 2500);
        },
        () => {} // ignore scan errors
      )
      .then(() => setScanning(true))
      .catch((err) => {
        setScannerError('Camera access denied. Please allow camera permission and refresh.');
        console.error('QR scanner error:', err);
      });

    return () => {
      html5QrCode.stop().catch(() => {});
    };
  }, []); // eslint-disable-line

  // ── Clear result after 5 seconds ─────────────────────────────────────────
  useEffect(() => {
    if (!scanResult) return;
    const t = setTimeout(() => setScanResult(null), 5000);
    return () => clearTimeout(t);
  }, [scanResult]);

  // ── Main QR handler ───────────────────────────────────────────────────────
  const handleQRScan = async (raw: string) => {
    setIsProcessing(true);
    setScanCount(c => c + 1);

    const payload = parseQRCode(raw);

    if (!payload) {
      finish({ success: false, message: 'Invalid QR code.' });
      return;
    }

    try {
      if (payload.type === 'BRANCH_CHECKIN') {
        await handleBranchQR(payload as BranchQRPayload);
      } else if (payload.type === 'USER_ID') {
        await handleUserQR(payload as UserQRPayload);
      } else if (payload.type === 'CLASS_COMPLETION') {
        await handleClassCompletion(payload);
      } else {
        finish({ success: false, message: 'Unknown QR type.' });
      }
    } catch (e) {
      console.error(e);
      finish({ success: false, message: 'Error processing QR. Try again.' });
    }
  };

  // ── Handler: Branch kiosk QR → log in current user ───────────────────────
  const handleBranchQR = async (payload: BranchQRPayload) => {
    if (!currentUser) {
      finish({ success: false, message: 'Please log in to check in.' });
      return;
    }

    // Validate token
    if (!validateBranchQR(payload)) {
      broadcastFail(payload.branchId, 'QR token expired or invalid.');
      finish({ success: false, message: 'QR expired. Please scan the latest code on the kiosk.' });
      return;
    }

    // Anti-replay check
    const tokenKey = `${payload.branchId}:${payload.token}:${payload.window}`;
    if (isTokenUsed(tokenKey)) {
      broadcastFail(payload.branchId, 'QR already used. Wait for refresh.');
      finish({ success: false, message: 'This QR was already scanned. Wait for the kiosk to refresh (30s).' });
      return;
    }
    markTokenUsed(tokenKey);

    const branch = branches.find(b => b.id === payload.branchId);
    if (!branch) {
      finish({ success: false, message: 'Branch not found.' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // ── STAFF / TRAINER / MANAGER / RECEPTIONIST ──────────────────────────
    if (currentUser.role !== UserRole.MEMBER) {
      const now = getNowHHMM();
      const shifts = currentUser.shifts || [];

      const openRecord = attendance.find(a =>
        a.userId === currentUser.id && a.date === today && !a.timeOut
      );

      if (openRecord) {
        // CHECK OUT
        const hoursWorked = Math.round(((parseTime(now) - parseTime(openRecord.timeIn)) / 60) * 100) / 100;
        const isEarlyOut = openRecord.shiftEnd ? parseTime(now) < parseTime(openRecord.shiftEnd) : false;
        await updateAttendance(openRecord.id, { timeOut: now, hoursWorked, isEarlyOut });

        broadcastSuccess(branch.id, `${currentUser.name} clocked out — ${hoursWorked}h`, currentUser.name, currentUser.avatar, currentUser.role, currentUser.memberId);
        finish({
          success: true,
          message: `Shift ended. ${hoursWorked} hours worked.`,
          subMessage: isEarlyOut ? '⚠️ Early check-out noted' : '✅ Full shift complete',
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          userRole: currentUser.role,
          isCheckOut: true,
        });
      } else {
        // CHECK IN
        if (shifts.length === 0) {
          broadcastFail(branch.id, `${currentUser.name} — No shifts assigned`);
          finish({ success: false, message: 'No shifts assigned. Contact admin.' });
          return;
        }
        const matchingShift = findMatchingShift(now, shifts);
        if (!matchingShift) {
          const shiftTimes = shifts.map(s => `${s.start}–${s.end}`).join(', ');
          broadcastFail(branch.id, `${currentUser.name} — Outside shift hours`);
          finish({ success: false, message: `Outside shift hours. Your shifts: ${shiftTimes}` });
          return;
        }
        const isLate = parseTime(now) > parseTime(matchingShift.shift.start);
        await recordAttendance({
          id: `att-${Date.now()}`,
          userId: currentUser.id,
          date: today,
          timeIn: now,
          branchId: branch.id,
          type: 'STAFF',
          shiftIndex: matchingShift.index,
          shiftStart: matchingShift.shift.start,
          shiftEnd: matchingShift.shift.end,
          isLate,
        });

        broadcastSuccess(branch.id, `${currentUser.name} clocked in${isLate ? ' (Late)' : ''}`, currentUser.name, currentUser.avatar, currentUser.role, currentUser.memberId);
        finish({
          success: true,
          message: `Checked in to ${branch.name}`,
          subMessage: `Shift ${matchingShift.shift.start}–${matchingShift.shift.end}${isLate ? ' · Late arrival' : ''}`,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          userRole: currentUser.role,
          isCheckOut: false,
        });
      }
      return;
    }

    // ── MEMBER ────────────────────────────────────────────────────────────
    const activeSubs = subscriptions.filter(s => s.memberId === currentUser.id && s.status === SubscriptionStatus.ACTIVE);
    const gymSub = activeSubs.find(s => plans.find(p => p.id === s.planId)?.type === PlanType.GYM);

    if (!gymSub) {
      broadcastFail(branch.id, `${currentUser.name} — No active membership`);
      finish({ success: false, message: 'No active gym membership. Please renew your plan.' });
      return;
    }

    const plan = plans.find(p => p.id === gymSub.planId);
    const isHome = currentUser.branchId === branch.id;
    const isMulti = plan?.isMultiBranch === true;

    if (!isHome && !isMulti) {
      const homeBranch = branches.find(b => b.id === currentUser.branchId);
      broadcastFail(branch.id, `${currentUser.name} — Wrong branch`);
      finish({ success: false, message: `Access restricted to ${homeBranch?.name || 'home branch'}. Upgrade to multi-branch plan.` });
      return;
    }

    await recordAttendance({
      id: `att-${Date.now()}`,
      userId: currentUser.id,
      date: today,
      timeIn: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      branchId: branch.id,
      type: 'MEMBER',
    });

    broadcastSuccess(
      branch.id,
      isHome ? `Welcome back, ${currentUser.name}!` : `Guest access granted — ${currentUser.name}`,
      currentUser.name,
      currentUser.avatar,
      currentUser.role,
      currentUser.memberId
    );
    finish({
      success: true,
      message: isHome ? `Welcome back to ${branch.name}!` : `Guest access at ${branch.name} approved.`,
      subMessage: `Plan: ${plan?.name}`,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      userRole: currentUser.role,
      memberId: currentUser.memberId,
    });
  };

  // ── Handler: User personal QR → receptionist scans member in ─────────────
  const handleUserQR = async (payload: UserQRPayload) => {
    // Validate signature
    if (!validateUserQR(payload)) {
      finish({ success: false, message: 'Invalid user QR signature. Possible tampering detected.' });
      return;
    }

    const scannedUser = users.find(u => u.id === payload.userId);
    if (!scannedUser) {
      finish({ success: false, message: 'User not found in system.' });
      return;
    }

    // Only admin/receptionist/manager can scan other users' QR
    const canScanOthers = currentUser && [
      UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN,
      UserRole.MANAGER, UserRole.RECEPTIONIST,
    ].includes(currentUser.role);

    // Member can also scan their own QR (self check-in via personal QR)
    const isSelf = currentUser?.id === scannedUser.id;

    if (!canScanOthers && !isSelf) {
      finish({ success: false, message: 'You do not have permission to scan other users.' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const branchId = scannedUser.branchId || currentUser?.branchId || branches[0]?.id;
    const branch = branches.find(b => b.id === branchId);

    // Check membership for members
    if (scannedUser.role === UserRole.MEMBER) {
      const activeSubs = subscriptions.filter(s => s.memberId === scannedUser.id && s.status === SubscriptionStatus.ACTIVE);
      if (!activeSubs.length) {
        broadcastFail(branchId, `${scannedUser.name} — No active membership`);
        finish({ success: false, message: `${scannedUser.name} has no active membership.`, userName: scannedUser.name, userAvatar: scannedUser.avatar });
        return;
      }
    }

    await recordAttendance({
      id: `att-${Date.now()}`,
      userId: scannedUser.id,
      date: today,
      timeIn: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      branchId: branchId || '',
      type: scannedUser.role === UserRole.MEMBER ? 'MEMBER' : 'STAFF',
    });

    broadcastSuccess(branchId, `${scannedUser.name} checked in`, scannedUser.name, scannedUser.avatar, scannedUser.role, scannedUser.memberId);
    finish({
      success: true,
      message: `${scannedUser.name} checked in to ${branch?.name || 'branch'}.`,
      subMessage: `ID: ${scannedUser.memberId || scannedUser.id}`,
      userName: scannedUser.name,
      userAvatar: scannedUser.avatar,
      userRole: scannedUser.role,
      memberId: scannedUser.memberId,
    });
  };

  // ── Handler: Class completion QR ─────────────────────────────────────────
  const handleClassCompletion = async (data: any) => {
    const booking = bookings.find(b => b.id === data.bookingId);
    if (!booking) { finish({ success: false, message: 'Session not found.' }); return; }
    if (booking.status === 'COMPLETED') { finish({ success: false, message: 'Session already completed.' }); return; }

    await updateBooking(data.bookingId, { status: 'COMPLETED' });
    const trainer = users.find(u => u.id === data.trainerId);
    finish({
      success: true,
      message: `${data.classType === 'PT' ? 'PT Session' : 'Group Class'} completed!`,
      subMessage: trainer ? `Trainer: ${trainer.name} · ${trainer.commissionPercentage || 0}% commission credited` : '',
      userRole: 'CLASS',
    });
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const finish = (result: ScanResult) => {
    setScanResult(result);
    setIsProcessing(false);
    showToast(result.message, result.success ? 'success' : 'error');
  };

  const broadcastSuccess = (branchId: string, message: string, name?: string, avatar?: string, role?: string, memberId?: string) => {
    broadcastKioskEvent({ type: 'SCAN_SUCCESS', branchId, userName: name, userAvatar: avatar, userRole: role, memberId, message, timestamp: Date.now() });
  };

  const broadcastFail = (branchId: string, message: string) => {
    broadcastKioskEvent({ type: 'SCAN_FAILED', branchId, message, timestamp: Date.now() });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto space-y-6 pb-8">

      {/* Header */}
      <div className="text-center pt-2">
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
          {currentUser?.role === UserRole.MEMBER ? 'Scan Branch QR' : 'Attendance Scanner'}
        </h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
          {currentUser?.role === UserRole.MEMBER
            ? 'Point camera at the kiosk screen to check in'
            : currentUser?.role === UserRole.RECEPTIONIST || currentUser?.role === UserRole.BRANCH_ADMIN || currentUser?.role === UserRole.MANAGER
            ? 'Scan branch kiosk QR or member\'s personal QR'
            : 'Scan the branch kiosk QR to punch in/out'}
        </p>
      </div>

      {/* Camera Scanner */}
      <div className="bg-white rounded-[3rem] shadow-2xl border-t-8 border-slate-900 overflow-hidden relative">

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center rounded-[3rem]">
            <i className="fas fa-circle-notch fa-spin text-4xl text-white mb-3"></i>
            <p className="text-white font-black text-sm uppercase tracking-widest">Processing…</p>
          </div>
        )}

        {/* Success overlay */}
        {scanResult?.success && (
          <div className="absolute inset-0 bg-emerald-500/95 z-20 flex flex-col items-center justify-center rounded-[3rem] animate-[fadeIn_0.2s_ease-out]">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-2xl">
              <i className="fas fa-check text-4xl text-emerald-500"></i>
            </div>
            {scanResult.userAvatar && (
              <img src={scanResult.userAvatar} alt="" className="w-16 h-16 rounded-2xl border-4 border-white shadow-lg mb-3" />
            )}
            {scanResult.userName && (
              <p className="text-white font-black text-xl mb-1">{scanResult.userName}</p>
            )}
            {scanResult.memberId && (
              <p className="text-emerald-100 font-mono text-sm mb-2">{scanResult.memberId}</p>
            )}
            <p className="text-white font-bold text-center px-8">{scanResult.message}</p>
            {scanResult.subMessage && (
              <p className="text-emerald-100 text-sm text-center mt-1 px-8">{scanResult.subMessage}</p>
            )}
          </div>
        )}

        {/* Failure overlay */}
        {scanResult && !scanResult.success && (
          <div className="absolute inset-0 bg-red-600/95 z-20 flex flex-col items-center justify-center rounded-[3rem] animate-[fadeIn_0.2s_ease-out]">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-2xl">
              <i className="fas fa-times text-4xl text-red-500"></i>
            </div>
            <p className="text-white font-black text-xl mb-2">Access Denied</p>
            <p className="text-red-100 font-bold text-center px-8">{scanResult.message}</p>
          </div>
        )}

        {/* Scanner error */}
        {scannerError && (
          <div className="absolute inset-0 bg-slate-900 z-20 flex flex-col items-center justify-center rounded-[3rem] p-8">
            <i className="fas fa-camera-slash text-5xl text-slate-500 mb-4"></i>
            <p className="text-white font-bold text-center">{scannerError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* QR Reader container */}
        <div id="qr-reader" className="w-full aspect-square rounded-[3rem] overflow-hidden"></div>

        {/* Scan count badge */}
        {scanCount > 0 && !isProcessing && !scanResult && (
          <div className="absolute top-4 right-4 bg-slate-900/80 text-white text-xs font-bold px-3 py-1 rounded-full">
            {scanCount} scanned today
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${scanning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            {scanning ? 'Scanner Active' : 'Starting…'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <i className="fas fa-shield-halved text-blue-500"></i>
          <span>Secure · Encrypted</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">How it works</p>

        {currentUser?.role === UserRole.MEMBER ? (
          <>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <i className="fas fa-tv text-blue-600 text-xs"></i>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">Scan Branch Kiosk</p>
                <p className="text-xs text-slate-500">Point camera at the QR screen at the gym entrance to check in.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <i className="fas fa-person-running text-purple-600 text-xs"></i>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">Class Completion</p>
                <p className="text-xs text-slate-500">Scan your trainer's QR after class to mark session complete.</p>
              </div>
            </div>
          </>
        ) : currentUser?.role === UserRole.RECEPTIONIST || currentUser?.role === UserRole.BRANCH_ADMIN || currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.SUPER_ADMIN ? (
          <>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <i className="fas fa-qrcode text-blue-600 text-xs"></i>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">Scan Kiosk QR</p>
                <p className="text-xs text-slate-500">Point at the branch kiosk display to punch in/out.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <i className="fas fa-id-card text-emerald-600 text-xs"></i>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">Scan Member's Personal QR</p>
                <p className="text-xs text-slate-500">Members can show their QR from the portal — scan it to check them in.</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <i className="fas fa-qrcode text-blue-600 text-xs"></i>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">Scan Branch Kiosk QR</p>
                <p className="text-xs text-slate-500">Point camera at the kiosk to punch in/out of your shift.</p>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        #qr-reader video { object-fit: cover; width: 100% !important; height: 100% !important; }
        #qr-reader__dashboard { display: none !important; }
        #qr-reader__scan_region { border: none !important; }
        #qr-reader img { display: none !important; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default CheckIn;
