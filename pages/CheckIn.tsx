import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { SubscriptionStatus, PlanType, UserRole } from '../types';
import { Html5QrcodeScanner } from 'html5-qrcode';

const CheckIn: React.FC = () => {
  const { users, subscriptions, plans, recordAttendance, updateAttendance, attendance, currentUser, branches, showToast } = useAppContext();
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
      handleCheckIn(decodedText);
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
      const openAttendance = attendance.find(a => 
        a.userId === currentUser.id && 
        a.date === today && 
        !a.timeOut
      );

      if (openAttendance) {
        updateAttendance(openAttendance.id, { timeOut: new Date().toLocaleTimeString() });
        setScanResult({ 
          success: true, 
          message: `Shift Finalized at ${branch.name}. Great work!`,
          subType: currentUser.role.replace('_', ' '),
          isCheckOut: true
        });
      } else {
        recordAttendance({
          id: `att-${Date.now()}`,
          userId: currentUser.id,
          date: today,
          timeIn: new Date().toLocaleTimeString(),
          branchId: branch.id,
          type: 'STAFF'
        });
        setScanResult({ 
          success: true, 
          message: `Punch-In Recorded at ${branch.name}. Shift started.`,
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
           <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">Scan Branch QR</h2>
           <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Record your attendance instantly</p>
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