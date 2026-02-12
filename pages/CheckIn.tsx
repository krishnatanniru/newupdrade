import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { SubscriptionStatus, PlanType, UserRole, Shift } from '../types';
import { Html5QrcodeScanner } from 'html5-qrcode';

// Shift validation utilities
const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const getCurrentTimeString = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const findMatchingShift = (currentTime: string, shifts: Shift[]): { shift: Shift; index: number } | null => {
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

const CheckIn: React.FC = () => {
  const { users, subscriptions, plans, recordAttendance, updateAttendance, attendance, currentUser, branches, showToast, bookings, updateBooking } = useAppContext();
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; subType?: string; isCheckOut?: boolean; isCrossBranch?: boolean } | null>(null);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [isHardwareOnline] = useState(true);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, onScanFailure);

    function onScanSuccess(decodedText: string) {
      handleQRScan(decodedText);
      scanner.clear();
      // Re-enable after 3 seconds
      setTimeout(() => {
        scanner.render(onScanSuccess, onScanFailure);
      }, 3000);
    }

    function onScanFailure(error: any) {
      // ignore
    }

    return () => {
      scanner.clear();
    };
  }, []);

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
      // Try to parse as class completion code
      const parsedData = JSON.parse(decodedText);
      
      if (parsedData.type === 'CLASS_COMPLETION' && parsedData.bookingId) {
        // This is a class completion QR
        await handleClassCompletion(parsedData);
        return;
      }
    } catch (e) {
      // Not a class completion QR, treat as branch check-in
    }
    
    // Default: handle as branch check-in
    handleCheckIn(decodedText);
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
    await triggerHardwareGate(booking.branchId);
    setTimeout(() => { setIsGateOpen(false); setScanResult(null); }, 5000);
  };

  const handleCheckIn = (branchIdScanned: string) => {
    if (!currentUser) {
      showToast("Please login to scan branch QR", "error");
      return;
    }

    const branch = branches.find(b => b.id === branchIdScanned);
    if (!branch) {
      setScanResult({ success: false, message: "Invalid Branch QR Code Scanned." });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // STAFF LOGIC (PUNCH IN / PUNCH OUT)
    if (currentUser.role !== UserRole.MEMBER) {
      const currentTime = getCurrentTimeString();
      const userShifts = currentUser.shifts || [];
      
      // Check if staff has any shifts assigned
      if (userShifts.length === 0) {
        setScanResult({ 
          success: false, 
          message: `No shifts assigned. Contact admin.`,
          subType: currentUser.role.replace('_', ' ')
        });
        setTimeout(() => setScanResult(null), 3000);
        return;
      }
      
      // Find matching shift for current time
      const matchingShift = findMatchingShift(currentTime, userShifts);
      
      // Check for open attendance (existing check-in without checkout)
      const openAttendance = attendance.find(a => 
        a.userId === currentUser.id && 
        a.date === today && 
        !a.timeOut
      );

      if (openAttendance) {
        // CHECK OUT
        const timeOut = currentTime;
        const hoursWorked = calculateHoursWorked(openAttendance.timeIn, timeOut);
        
        const isEarlyOut = openAttendance.shiftEnd ? parseTime(timeOut) < parseTime(openAttendance.shiftEnd) : false;
        
        updateAttendance(openAttendance.id, { 
          timeOut: timeOut,
          hoursWorked: hoursWorked,
          isEarlyOut: isEarlyOut
        });
        
        setScanResult({ 
          success: true, 
          message: `Shift Ended: ${hoursWorked}h worked.`,
          subType: currentUser.role.replace('_', ' '),
          isCheckOut: true
        });
      } else {
        // CHECK IN
        if (!matchingShift) {
          // Not within any shift time
          const shiftTimes = userShifts.map(s => `${s.start}-${s.end}`).join(', ');
          setScanResult({ 
            success: false, 
            message: `Outside shift hours. Your shifts: ${shiftTimes}`,
            subType: currentUser.role.replace('_', ' ')
          });
          setTimeout(() => setScanResult(null), 5000);
          return;
        }
        
        const isLate = parseTime(currentTime) > parseTime(matchingShift.shift.start);
        
        recordAttendance({
          id: `att-${Date.now()}`,
          userId: currentUser.id,
          date: today,
          timeIn: currentTime,
          branchId: branch.id,
          type: 'STAFF',
          shiftIndex: matchingShift.index,
          shiftStart: matchingShift.shift.start,
          shiftEnd: matchingShift.shift.end,
          isLate: isLate
        });
        
        setScanResult({ 
          success: true, 
          message: `Shift ${matchingShift.index + 1} Started: ${matchingShift.shift.start}-${matchingShift.shift.end}${isLate ? ' (Late)' : ''}`,
          subType: currentUser.role.replace('_', ' '),
          isCheckOut: false
        });
      }
      
      setIsGateOpen(true);
      setTimeout(() => { setIsGateOpen(false); setScanResult(null); }, 5000);
      return;
    }

    // MEMBER LOGIC
    if (currentUser.role === UserRole.MEMBER) {
      const activeSubs = subscriptions.filter(s => s.memberId === currentUser.id && s.status === SubscriptionStatus.ACTIVE);
      const gymSub = activeSubs.find(s => {
        const plan = plans.find(p => p.id === s.planId);
        return plan?.type === PlanType.GYM;
      });

      if (!gymSub) {
        setScanResult({ success: false, message: "Access Denied: No active gym membership found." });
        setTimeout(() => setScanResult(null), 3000);
        return;
      }

      const plan = plans.find(p => p.id === gymSub.planId);
      const isHomeBranch = currentUser.branchId === branch.id;
      const allowsMultiBranch = plan?.isMultiBranch === true;

      if (!isHomeBranch && !allowsMultiBranch) {
        const homeBranch = branches.find(b => b.id === currentUser.branchId);
        setScanResult({ 
          success: false, 
          message: `Denied: Access restricted to ${homeBranch?.name || 'Home Branch'}.`,
          subType: plan?.name
        });
        setTimeout(() => setScanResult(null), 4000);
        return;
      }

      recordAttendance({
        id: `att-${Date.now()}`,
        userId: currentUser.id,
        date: today,
        timeIn: new Date().toLocaleTimeString(),
        branchId: branch.id,
        type: 'MEMBER'
      });

      setScanResult({ 
        success: true, 
        message: isHomeBranch ? `Welcome back to ${branch.name}!` : `Guest Access at ${branch.name} Approved.`,
        subType: plan?.name,
        isCheckOut: false,
        isCrossBranch: !isHomeBranch
      });
      
      setIsGateOpen(true);
      triggerHardwareGate(branch.id);
      setTimeout(() => { setIsGateOpen(false); setScanResult(null); }, 4000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border-t-[12px] border-slate-900 relative overflow-hidden">
        <div className="absolute top-6 right-8 flex items-center gap-2">
           <span className={`w-2.5 h-2.5 rounded-full ${isHardwareOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SCANNER ACTIVE</span>
        </div>

        <div className="text-center mb-10">
           <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">
             {currentUser?.role === UserRole.MEMBER ? 'Scan QR Code' : 'Scan Branch QR'}
           </h2>
           <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">
             {currentUser?.role === UserRole.MEMBER 
               ? 'Scan branch QR to enter or class QR to complete' 
               : currentUser?.role === UserRole.TRAINER
               ? 'Scan branch QR for attendance'
               : 'Record your attendance instantly'}
           </p>
        </div>

        <div className="relative mb-10">
           <div id="reader" className="overflow-hidden rounded-[2.5rem] border-4 border-slate-50 shadow-inner"></div>
           
           {isGateOpen && (
              <div className="absolute inset-0 bg-green-500/90 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10 rounded-[2.5rem]">
                 <div className="bg-white text-green-600 w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-2xl scale-110">
                    <i className="fas fa-check text-3xl"></i>
                 </div>
                 <p className="text-2xl font-black uppercase tracking-widest">SUCCESS</p>
                 <p className="text-sm font-bold opacity-80 uppercase tracking-tight mt-1">Attendance Recorded</p>
              </div>
           )}
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

      <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
         <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <i className="fas fa-shield-halved text-blue-500"></i> Scanner Instructions
         </h3>
         <div className="space-y-6">
            {currentUser?.role === UserRole.MEMBER ? (
              <>
                <div className="flex gap-4">
                   <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                      <i className="fas fa-door-open text-xs"></i>
                   </div>
                   <div>
                      <p className="text-[11px] font-black uppercase tracking-tight">Branch Entry</p>
                      <p className="text-[10px] text-slate-400 font-medium leading-tight">Scan branch QR at entrance to check in and open the gate.</p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                      <i className="fas fa-check-circle text-xs"></i>
                   </div>
                   <div>
                      <p className="text-[11px] font-black uppercase tracking-tight">Class Completion</p>
                      <p className="text-[10px] text-slate-400 font-medium leading-tight">After class, scan the QR shown by your trainer to mark attendance and complete the session.</p>
                   </div>
                </div>
              </>
            ) : currentUser?.role === UserRole.TRAINER ? (
              <>
                <div className="flex gap-4">
                   <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                      <i className="fas fa-qrcode text-xs"></i>
                   </div>
                   <div>
                      <p className="text-[11px] font-black uppercase tracking-tight">Mark Attendance</p>
                      <p className="text-[10px] text-slate-400 font-medium leading-tight">Scan branch QR to punch in/out for your shift.</p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                      <i className="fas fa-calendar-check text-xs"></i>
                   </div>
                   <div>
                      <p className="text-[11px] font-black uppercase tracking-tight">Complete Classes</p>
                      <p className="text-[10px] text-slate-400 font-medium leading-tight">Use the Bookings page to generate QR codes for class completion.</p>
                   </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-4">
                   <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                      <i className="fas fa-qrcode text-xs"></i>
                   </div>
                   <div>
                      <p className="text-[11px] font-black uppercase tracking-tight">Point at Branch QR</p>
                      <p className="text-[10px] text-slate-400 font-medium leading-tight">Find the QR code displayed at the branch entrance and point your camera at it.</p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                      <i className="fas fa-bolt-lightning text-xs"></i>
                   </div>
                   <div>
                      <p className="text-[11px] font-black uppercase tracking-tight">Automatic Recording</p>
                      <p className="text-[10px] text-slate-400 font-medium leading-tight">Once scanned, your attendance will be recorded automatically in our cloud database.</p>
                   </div>
                </div>
              </>
            )}
         </div>
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

export default CheckIn;