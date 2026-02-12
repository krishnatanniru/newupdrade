
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, PlanType, SubscriptionStatus } from '../types';
import PayslipModal from '../components/PayslipModal';
import { generateMonthlyPayroll, getShiftSummary, MAX_HOURS_PER_DAY } from '../src/lib/payroll';

const MyEarnings: React.FC = () => {
  const { currentUser, attendance, sales, bookings, plans, subscriptions, branches, holidays, refreshData } = useAppContext();
  
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  // Dynamic years: 2 years back to 2 years forward from current year
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const currentBranch = useMemo(() => 
    branches.find(b => b.id === currentUser?.branchId) || branches[0], 
  [currentUser, branches]);

  // Filter attendance and bookings for current user only
  const userAttendance = useMemo(() => {
    if (!currentUser) return [];
    return attendance.filter(a => a.userId === currentUser.id && a.type === 'STAFF');
  }, [currentUser, attendance]);

  const userBookings = useMemo(() => {
    if (!currentUser) return [];
    return bookings.filter(b => b.trainerId === currentUser.id);
  }, [currentUser, bookings]);

  // Filter holidays for current user's branch
  const userHolidays = useMemo(() => {
    if (!currentUser) return [];
    return holidays.filter(h => h.branchId === 'ALL' || h.branchId === currentUser.branchId);
  }, [currentUser, holidays]);

  // Generate payroll using new shift-based system
  const payroll = useMemo(() => {
    if (!currentUser) return null;
    return generateMonthlyPayroll(currentUser, userAttendance, selectedYear, selectedMonth + 1, userBookings, userHolidays);
  }, [currentUser, userAttendance, userBookings, userHolidays, selectedMonth, selectedYear]);

  // Get month's attendance logs for display
  const monthLogs = useMemo(() => {
    if (!currentUser) return [];
    const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    return userAttendance.filter(a => a.date.startsWith(monthStr));
  }, [currentUser, userAttendance, selectedMonth, selectedYear]);

  // Legacy stats for backward compatibility with PayslipModal
  const stats = useMemo(() => {
    if (!payroll) return null;
    return {
      hours: payroll.totalHoursWorked,
      rate: currentUser?.hourlyRate || 500,
      baseSalary: payroll.baseSalary,
      commissions: payroll.commissionEarned,
      incentiveType: currentUser?.role === UserRole.TRAINER 
        ? `${Math.round(payroll.commissionEarned / ((currentUser?.commissionPercentage || 1) / 100) / 500)} Sessions Conducted (${currentUser?.commissionPercentage || 0}%)`
        : `Sales Commission (${currentUser?.commissionPercentage || 0}%)`,
      total: payroll.netPay
    };
  }, [payroll, currentUser]);

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
               <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(payroll?.netPay || 0)}</h3>
               <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between text-left">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Hourly Rate</p>
                    <p className="font-bold text-sm text-slate-700">{formatCurrency(currentUser?.hourlyRate || 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Hours Logged</p>
                    <p className="font-bold text-sm text-slate-700">{(payroll?.totalHoursWorked || 0).toFixed(1)} hrs</p>
                  </div>
               </div>
               {/* Shift Information */}
               <div className="mt-4 pt-4 border-t border-slate-50 text-left">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Assigned Shifts</p>
                  <p className="text-xs font-medium text-slate-600">{getShiftSummary(currentUser?.shifts || [])}</p>
               </div>
            </div>

            {currentUser?.role === UserRole.TRAINER && (
            <div className="bg-emerald-950 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
               <div className="relative z-10">
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Commission Earned</p>
                  <h3 className="text-3xl font-black">{formatCurrency(stats?.commissions || 0)}</h3>
                  <p className="text-xs text-emerald-300 font-medium mt-4 leading-relaxed opacity-80">{stats?.incentiveType}</p>
               </div>
               <i className="fas fa-coins absolute -bottom-10 -right-10 text-[150px] text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000"></i>
            </div>
            )}
         </div>

         <div className="lg:col-span-3 space-y-8">
            <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden">
               <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Earnings Breakdown</h3>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period: {months[selectedMonth]} {selectedYear}</span>
               </div>
               <div className="p-8">
                  <div className="space-y-6">
                     {/* Base Salary */}
                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center">
                              <i className="fas fa-clock"></i>
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-900 uppercase">Base Salary</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{payroll?.totalHoursWorked.toFixed(1)}h × ₹{currentUser?.hourlyRate || 0}/hr (Max {MAX_HOURS_PER_DAY}h/day)</p>
                           </div>
                        </div>
                        <p className="text-lg font-black text-slate-900">{formatCurrency(payroll?.baseSalary || 0)}</p>
                     </div>

                     {/* Week Off Pay */}
                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="bg-purple-50 text-purple-600 w-12 h-12 rounded-2xl flex items-center justify-center">
                              <i className="fas fa-umbrella-beach"></i>
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-900 uppercase">Week Off Pay</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{payroll?.weekOffsTaken || 0} week offs (After {payroll?.totalDaysWorked || 0} days worked)</p>
                           </div>
                        </div>
                        <p className="text-lg font-black text-purple-600">+{formatCurrency(payroll?.weekOffPay || 0)}</p>
                     </div>

                     {/* Holiday Pay */}
                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="bg-orange-50 text-orange-600 w-12 h-12 rounded-2xl flex items-center justify-center">
                              <i className="fas fa-calendar-check"></i>
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-900 uppercase">Holiday Pay</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{MAX_HOURS_PER_DAY}h pay per holiday</p>
                           </div>
                        </div>
                        <p className="text-lg font-black text-orange-600">+{formatCurrency(payroll?.holidayPay || 0)}</p>
                     </div>

                     {/* Commissions */}
                     <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="bg-emerald-50 text-emerald-600 w-12 h-12 rounded-2xl flex items-center justify-center">
                              <i className="fas fa-chart-line"></i>
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-900 uppercase">Commissions</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentUser.role === UserRole.TRAINER ? 'Per Session' : 'Per Sale'} ({currentUser?.commissionPercentage || 0}%)</p>
                           </div>
                        </div>
                        <p className="text-lg font-black text-emerald-600">+{formatCurrency(payroll?.commissionEarned || 0)}</p>
                     </div>

                     <div className="pt-8 mt-8 border-t border-slate-100 flex items-center justify-between">
                        <div>
                           <p className="text-xl font-black text-slate-900 uppercase">Total Earnings</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                              {payroll?.lateDays ? `${payroll.lateDays} late arrivals` : ''} 
                              {payroll?.earlyOutDays ? ` • ${payroll.earlyOutDays} early outs` : ''}
                           </p>
                        </div>
                        <p className="text-3xl font-black text-slate-900">{formatCurrency(payroll?.totalEarnings || 0)}</p>
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
