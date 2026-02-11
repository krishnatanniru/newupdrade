
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, PlanType, SubscriptionStatus } from '../types';
import PayslipModal from '../components/PayslipModal';

const MyEarnings: React.FC = () => {
  const { currentUser, attendance, sales, bookings, plans, subscriptions, branches } = useAppContext();
  
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const years = [2024, 2025];

  const currentBranch = useMemo(() => 
    branches.find(b => b.id === currentUser?.branchId) || branches[0], 
  [currentUser, branches]);

  // Personal Calculations
  const stats = useMemo(() => {
    if (!currentUser) return null;

    // 1. Base Salary from Attendance
    const monthLogs = attendance.filter(a => {
      const d = new Date(a.date);
      return (
        a.userId === currentUser.id &&
        d.getMonth() === selectedMonth &&
        d.getFullYear() === selectedYear
      );
    });

    let totalMinutes = 0;
    monthLogs.forEach(log => {
      if (log.timeOut) {
        const start = new Date(`2000-01-01 ${log.timeIn}`);
        const end = new Date(`2000-01-01 ${log.timeOut}`);
        totalMinutes += (end.getTime() - start.getTime()) / 60000;
      }
    });

    const hours = totalMinutes / 60;
    const rate = currentUser.hourlyRate || 500;
    const baseSalary = hours * rate;

    // 2. Commissions
    let commissions = 0;
    let incentiveType = "No incentives found";

    if (currentUser.role === UserRole.TRAINER) {
      const completedBookings = bookings.filter(b => {
        const d = new Date(b.date);
        return (
          b.trainerId === currentUser.id &&
          b.status === 'COMPLETED' &&
          d.getMonth() === selectedMonth &&
          d.getFullYear() === selectedYear
        );
      });

      const sessionEarnings = completedBookings.map(booking => {
        const sub = subscriptions.find(s => 
          s.memberId === booking.memberId && 
          s.status === SubscriptionStatus.ACTIVE &&
          plans.find(p => p.id === s.planId)?.type === booking.type
        );
        const plan = plans.find(p => p.id === (sub?.planId || ''));
        if (!plan) return 0;
        const maxSessions = plan.maxSessions || 1; 
        const unitPrice = plan.price / maxSessions;
        return unitPrice * ((currentUser.commissionPercentage || 0) / 100);
      });

      commissions = sessionEarnings.reduce((acc, e) => acc + e, 0);
      incentiveType = `${completedBookings.length} Sessions Conducted (${currentUser.commissionPercentage || 0}%)`;
    } else if (currentUser.role === UserRole.MANAGER) {
      const managerSales = sales.filter(s => {
        const d = new Date(s.date);
        return (
          s.staffId === currentUser.id &&
          d.getMonth() === selectedMonth &&
          d.getFullYear() === selectedYear
        );
      });

      const gymSales = managerSales.filter(s => plans.find(p => p.id === s.planId)?.type === PlanType.GYM);
      const saleEarnings = gymSales.map(sale => sale.amount * ((currentUser.commissionPercentage || 0) / 100));
      
      commissions = saleEarnings.reduce((acc, e) => acc + e, 0);
      incentiveType = `${gymSales.length} Gym Plans Sold (${currentUser.commissionPercentage || 0}%)`;
    }

    return {
      hours,
      rate,
      baseSalary,
      commissions,
      incentiveType,
      total: baseSalary + commissions
    };
  }, [currentUser, attendance, bookings, sales, plans, subscriptions, selectedMonth, selectedYear]);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">My Earnings Hub</h2>
          <p className="text-slate-500 font-medium">Personal income breakdown & official payslips</p>
        </div>
        
        <div className="flex bg-white p-2 rounded-2xl border shadow-sm items-center gap-4">
           <div className="flex items-center gap-2">
              <select className="p-2.5 bg-slate-50 border rounded-xl outline-none font-bold text-xs uppercase" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                {months.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
              </select>
              <select className="p-2.5 bg-slate-50 border rounded-xl outline-none font-bold text-xs" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
           </div>
           <button 
             onClick={() => {
               setIsPayslipOpen(true);
             }}
             className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
           >
             <i className="fas fa-file-invoice-dollar"></i> GENERATE PAYSLIP
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
         <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Net Income</p>
               <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(stats?.total || 0)}</h3>
               <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between text-left">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Hourly Rate</p>
                    <p className="font-bold text-sm text-slate-700">{formatCurrency(stats?.rate || 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Hours Logged</p>
                    <p className="font-bold text-sm text-slate-700">{(stats?.hours || 0).toFixed(1)} hrs</p>
                  </div>
               </div>
            </div>

            <div className="bg-emerald-950 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
               <div className="relative z-10">
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Commission Earned</p>
                  <h3 className="text-3xl font-black">{formatCurrency(stats?.commissions || 0)}</h3>
                  <p className="text-xs text-emerald-300 font-medium mt-4 leading-relaxed opacity-80">{stats?.incentiveType}</p>
               </div>
               <i className="fas fa-coins absolute -bottom-10 -right-10 text-[150px] text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000"></i>
            </div>
         </div>

         <div className="lg:col-span-3 space-y-8">
            <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden">
               <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Earnings Breakdown</h3>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period: {months[selectedMonth]} {selectedYear}</span>
               </div>
               <div className="p-8">
                  <div className="space-y-6">
                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center">
                              <i className="fas fa-clock"></i>
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-900 uppercase">Base Salary</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Logged hours × Hourly rate</p>
                           </div>
                        </div>
                        <p className="text-lg font-black text-slate-900">{formatCurrency(stats?.baseSalary || 0)}</p>
                     </div>

                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="bg-emerald-50 text-emerald-600 w-12 h-12 rounded-2xl flex items-center justify-center">
                              <i className="fas fa-chart-line"></i>
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-900 uppercase">Commissions / Incentives</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentUser.role === UserRole.TRAINER ? 'Per Session' : 'Per Gym Enrollment'}</p>
                           </div>
                        </div>
                        <p className="text-lg font-black text-emerald-600">+{formatCurrency(stats?.commissions || 0)}</p>
                     </div>

                     <div className="pt-8 mt-8 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-xl font-black text-slate-900 uppercase">Total Professional Income</p>
                        <p className="text-3xl font-black text-slate-900">{formatCurrency(stats?.total || 0)}</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] relative overflow-hidden">
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6">Security & Transparency</h4>
                  <div className="space-y-4">
                     <div className="flex gap-4">
                        <i className="fas fa-shield-check text-blue-500 mt-1"></i>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">All punch-in logs are geo-verified and finalized at the end of each shift.</p>
                     </div>
                     <div className="flex gap-4">
                        <i className="fas fa-file-contract text-blue-500 mt-1"></i>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">Commissions are auto-attributed based on member enrollment staff signatures.</p>
                     </div>
                  </div>
                  <i className="fas fa-fingerprint absolute -bottom-10 -right-10 text-[150px] text-white/5"></i>
               </div>
               
               <div className="bg-blue-50 border border-blue-100 p-8 rounded-[2.5rem] flex flex-col justify-center items-center text-center gap-4">
                  <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-blue-600">
                     <i className="fas fa-download text-xl"></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase">Need a PDF?</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">Generate your official tax-compliant payslip for this month.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsPayslipOpen(true);
                    }}
                    className="mt-2 text-blue-600 font-black text-[10px] uppercase tracking-widest bg-white px-6 py-2.5 rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                  >
                    Open Payslip Generator
                  </button>
               </div>
            </div>
         </div>
      </div>

      {isPayslipOpen && stats && (
        <PayslipModal 
          user={currentUser}
          branch={currentBranch}
          month={months[selectedMonth]}
          year={selectedYear}
          earnings={stats}
          onClose={() => setIsPayslipOpen(false)}
        />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default MyEarnings;
