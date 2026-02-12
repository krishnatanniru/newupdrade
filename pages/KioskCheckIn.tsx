import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { SubscriptionStatus, PlanType, UserRole, Attendance } from '../types';

// Shift validation utilities
const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const getCurrentTimeString = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const findMatchingShift = (currentTime: string, shifts: any[]): { shift: any; index: number } | null => {
  const currentMinutes = parseTime(currentTime);
  
  for (let i = 0; i < shifts.length; i++) {
    const shift = shifts[i];
    const startMinutes = parseTime(shift.start);
    const endMinutes = parseTime(shift.end);
    
    // Allow 30 minutes early check-in
    const earlyWindow = startMinutes - 30;
    
    // Check if current time falls within shift (with early window)
    if (currentMinutes >= earlyWindow && currentMinutes <= endMinutes) {
      return { shift, index: i };
    }
  }
  return null;
};

const calculateHoursWorked = (timeIn: string, timeOut: string): number => {
  const inMinutes = parseTime(timeIn);
  const outMinutes = parseTime(timeOut);
  return Math.round((outMinutes - inMinutes) / 60 * 100) / 100; // Round to 2 decimals
};

const KioskCheckIn: React.FC = () => {
  const { currentUser, users, subscriptions, plans, recordAttendance, updateAttendance, attendance, branches, showToast, kiosks, bookings, updateBooking } = useAppContext();
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; subType?: string; isCheckOut?: boolean; isCrossBranch?: boolean } | null>(null);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [isHardwareOnline] = useState(true);
  const [activeKiosk, setActiveKiosk] = useState<any>(null);
  const [manualEntryMode, setManualEntryMode] = useState(false);
  const [manualId, setManualId] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Find the active kiosk for the current user's branch
  useEffect(() => {
    if (currentUser?.branchId) {
      const kiosk = kiosks.find(k => 
        k.branchId === currentUser.branchId && k.isActive
      );
      if (kiosk) {
        setActiveKiosk(kiosk);
      } else {
        showToast('No active kiosk found for your branch', 'error');
      }
    }
  }, [kiosks, currentUser]);

  useEffect(() => {
    if (!activeKiosk) return;

    const initializeScanner = () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }

      const scanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          videoConstraints: { facingMode: "environment" }
        },
        /* verbose= */ false
      );

      scannerRef.current = scanner;

      scanner.render(onScanSuccess, onScanFailure);

      function onScanSuccess(decodedText: string) {
        handleQRScan(decodedText);
        scanner.clear();
        // Re-enable after 3 seconds
        setTimeout(() => {
          if (activeKiosk) {
            scanner.render(onScanSuccess, onScanFailure);
          }
        }, 3000);
      }

      function onScanFailure(error: any) {
        // ignore
      }
    };

    initializeScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [activeKiosk]);

  const triggerHardwareGate = async (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch?.gateWebhookUrl) return;
    try {
      console.log(`Sending OPEN signal to turnstile at ${branch.gateWebhookUrl}`);
    } catch (e) {
      console.error("Failed to trigger hardware gate:", e);
    }
  };

  const handleQRScan = async (decodedText: string) => {
    try {
      // Try to parse as member ID or check for branch QR
      if (decodedText.startsWith('IF-') || decodedText.length === 10) { // Member ID format
        await handleMemberCheckIn(decodedText);
        return;
      }
      
      // Try to parse as class completion code
      const parsedData = JSON.parse(decodedText);
      
      if (parsedData.type === 'CLASS_COMPLETION' && parsedData.bookingId) {
        // This is a class completion QR
        await handleClassCompletion(parsedData);
        return;
      }
    } catch (e) {
      // Not a class completion QR, treat as member ID or branch check-in
      await handleMemberCheckIn(decodedText);
    }
  };

  const handleMemberCheckIn = async (memberIdOrEmail: string) => {
    // Find user by member ID or email
    const user = users.find(u => 
      u.memberId === memberIdOrEmail || u.email === memberIdOrEmail
    );

    if (!user) {
      setScanResult({ 
        success: false, 
        message: "Member not found. Please verify your member ID." 
      });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    // Check if user is a member
    if (user.role !== UserRole.MEMBER) {
      setScanResult({ 
        success: false, 
        message: "Access denied. This kiosk is for members only." 
      });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    // Check for active subscription
    const activeSubs = subscriptions.filter(s => 
      s.memberId === user.id && s.status === SubscriptionStatus.ACTIVE
    );
    const gymSub = activeSubs.find(s => {
      const plan = plans.find(p => p.id === s.planId);
      return plan?.type === PlanType.GYM;
    });

    if (!gymSub) {
      setScanResult({ 
        success: false, 
        message: "Access denied: No active gym membership found." 
      });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    const plan = plans.find(p => p.id === gymSub.planId);
    const branch = branches.find(b => b.id === user.branchId);
    const isHomeBranch = user.branchId === activeKiosk?.branchId;
    const allowsMultiBranch = plan?.isMultiBranch === true;

    if (!isHomeBranch && !allowsMultiBranch) {
      setScanResult({ 
        success: false, 
        message: `Access denied: Membership restricted to ${branch?.name || 'Home Branch'}.`,
        subType: plan?.name
      });
      setTimeout(() => setScanResult(null), 4000);
      return;
    }

    // Record attendance
    const today = new Date().toISOString().split('T')[0];
    const newAttendance: Attendance = {
      id: `att-${Date.now()}`,
      userId: user.id,
      date: today,
      timeIn: new Date().toLocaleTimeString(),
      branchId: activeKiosk?.branchId || user.branchId,
      type: 'MEMBER'
    };

    await recordAttendance(newAttendance);

    setScanResult({ 
      success: true, 
      message: isHomeBranch 
        ? `Welcome back ${user.name}!` 
        : `Guest access at ${activeKiosk?.name} approved.`,
      subType: plan?.name,
      isCheckOut: false,
      isCrossBranch: !isHomeBranch
    });
    
    setIsGateOpen(true);
    if (activeKiosk?.branchId) {
      await triggerHardwareGate(activeKiosk.branchId);
    }
    setTimeout(() => { 
      setIsGateOpen(false); 
      setScanResult(null); 
    }, 4000);
  };

  const handleClassCompletion = async (completionData: any) => {
    const { bookingId, trainerId, memberId, classType } = completionData;
    
    // Find the booking
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      setScanResult({
        success: false,
        message: "Class session not found."
      });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    if (booking.status === 'COMPLETED') {
      setScanResult({
        success: false,
        message: "Class already marked as completed."
      });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    // Update booking status to COMPLETED
    await updateBooking(bookingId, { status: 'COMPLETED' });
    
    // Calculate and show commission info
    const trainer = users.find(u => u.id === trainerId);
    const commission = trainer?.commissionPercentage || 0;
    const classTypeLabel = classType === 'PT' ? 'PT Session' : 'Group Class';
    
    setScanResult({
      success: true,
      message: `${classTypeLabel} Completed! ${commission}% commission credited to trainer.`,
      subType: classType
    });

    showToast(`Class completed! Commission earned: ${commission}%`, 'success');
    
    // Trigger gate for exit
    setIsGateOpen(true);
    if (booking.branchId) {
      await triggerHardwareGate(booking.branchId);
    }
    setTimeout(() => { setIsGateOpen(false); setScanResult(null); }, 5000);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    
    await handleMemberCheckIn(manualId.trim());
    setManualId('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border-t-[12px] border-slate-900 relative overflow-hidden">
        <div className="absolute top-6 right-8 flex items-center gap-2">
           <span className={`w-2.5 h-2.5 rounded-full ${isHardwareOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">KIOSK ACTIVE</span>
        </div>

        <div className="text-center mb-10">
           <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">
             {activeKiosk?.name || 'Kiosk Check-In'}
           </h2>
           <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">
             Self-Service Check-In Station
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="relative">
             <div id="reader" className="overflow-hidden rounded-[2.5rem] border-4 border-slate-50 shadow-inner"></div>
             
             {isGateOpen && (
               <div className="absolute inset-0 bg-green-500/90 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10 rounded-[2.5rem]">
                  <div className="bg-white text-green-600 w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-2xl scale-110">
                     <i className="fas fa-check text-3xl"></i>
                  </div>
                  <p className="text-2xl font-black uppercase tracking-widest">SUCCESS</p>
                  <p className="text-sm font-bold opacity-80 uppercase tracking-tight mt-1">Checked In</p>
               </div>
             )}
          </div>
          
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h3 className="font-black text-blue-800 uppercase tracking-widest text-sm mb-3">Manual Entry</h3>
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter Member ID (e.g. IF-XXXX)"
                  className="w-full p-4 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all"
                >
                  Submit ID
                </button>
              </form>
            </div>
            
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
              <h3 className="font-black text-amber-800 uppercase tracking-widest text-sm mb-2">Instructions</h3>
              <ul className="space-y-2 text-sm text-amber-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>Scan your membership QR code</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>Or enter your Member ID manually</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>Your attendance will be recorded automatically</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm mb-2">Kiosk Info</h3>
              <p className="text-sm text-gray-600">
                <span className="font-bold">Location:</span> {activeKiosk?.location || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-bold">Branch:</span> {branches.find(b => b.id === activeKiosk?.branchId)?.name || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {scanResult && !isGateOpen && (
          <div className={`p-6 rounded-[2rem] border-2 flex items-center gap-4 animate-[slideUp_0.3s_ease-out] ${
            !scanResult.success ? 'bg-red-50 border-red-100 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'
          }`}>
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${!scanResult.success ? 'bg-red-600' : 'bg-blue-600'} text-white shadow-lg`}>
                <i className={`fas ${!scanResult.success ? 'fa-exclamation-triangle' : 'fa-info-circle'}`}></i>
             </div>
             <div>
                <p className="font-black text-xs uppercase tracking-widest mb-1">{!scanResult.success ? 'ERROR' : 'STATUS'}</p>
                <p className="text-sm font-bold leading-tight">{scanResult.message}</p>
             </div>
          </div>
        )}
      </div>

      <style>{`
        #reader { border: none !important; }
        #reader__dashboard_section_csr button {
          background: #0f172a;
          color: white;
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.1em;
          border: none;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default KioskCheckIn;