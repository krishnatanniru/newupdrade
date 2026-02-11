
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, User, Attendance, PlanType, SubscriptionStatus } from '../types';

const TaxCenter: React.FC = () => {
  const { sales, branches, currentUser, attendance, users, settlementRate, plans, bookings, subscriptions } = useAppContext();
  
  const [activeView, setActiveView] = useState<'GST' | 'SETTLEMENT' | 'PAYROLL' | 'COMMISSIONS'>('GST');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(currentUser?.branchId || branches[0].id);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const years = [2024, 2025];

  const currentBranch = useMemo(() => branches.find(b => b.id === selectedBranchId), [selectedBranchId, branches]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = new Date(s.date);
      return (
        s.branchId === selectedBranchId &&
        saleDate.getMonth() === selectedMonth &&
        saleDate.getFullYear() === selectedYear
      );
    });
  }, [sales, selectedBranchId, selectedMonth, selectedYear]);

  const taxStats = useMemo(() => {
    const gstRate = currentBranch?.gstPercentage || 18;
    return filteredSales.reduce((acc, s) => {
      const total = s.amount;
      const taxableValue = total / (1 + (gstRate / 100));
      return {
        total: acc.total + total,
        taxable: acc.taxable + taxableValue,
        tax: acc.tax + (total - taxableValue),
        count: acc.count + 1
      };
    }, { total: 0, taxable: 0, tax: 0, count: 0 });
  }, [filteredSales, currentBranch]);

  const totalPayouts = useMemo(() => {
    const branchSales = sales.filter(s => s.branchId === selectedBranchId);
    const branchUsers = users.filter(u => u.branchId === selectedBranchId);
    
    // Payroll calculation: Sum of base salaries for branch staff
    const payroll = branchUsers
      .filter(u => u.role === UserRole.STAFF || u.role === UserRole.TRAINER)
      .reduce((acc, u) => acc + (u.salary || 25000), 0);
    
    // Commission calculation: 10% of sales handled by staff/trainers in this branch
    const commissions = branchSales.reduce((acc, s) => acc + (s.amount * 0.1), 0);
    
    return { 
      payroll, 
      commissions, 
      grandTotal: payroll + commissions 
    };
  }, [sales, users, selectedBranchId]);

  const settlementData = useMemo(() => {
    const branchBookings = bookings.filter(b => b.branchId === selectedBranchId);
    return {
      totalBookings: branchBookings.length,
      rate: settlementRate,
      totalAmount: branchBookings.length * settlementRate
    };
  }, [bookings, selectedBranchId, settlementRate]);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Tax & Financials</h2>
          <p className="text-slate-500 font-medium text-sm">Branch: {currentBranch?.name} • Monthly Report</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border shadow-sm w-full xl:w-auto overflow-x-auto scrollbar-hide">
           {['GST', 'SETTLEMENT', 'PAYROLL', 'COMMISSIONS'].map((v) => (
             <button
               key={v}
               onClick={() => setActiveView(v as any)}
               className={`flex-1 xl:flex-none px-6 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === v ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
             >
               {v}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
           <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border shadow-sm space-y-6">
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Branch</label>
                 <select className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold text-xs" value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)}>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                 </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Month</label>
                   <select className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold text-xs" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                      {months.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Year</label>
                   <select className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold text-xs" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                  <div className="bg-slate-900 p-6 rounded-3xl text-center text-white shadow-xl">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">
                      {activeView === 'GST' ? 'GST Liability' : activeView === 'SETTLEMENT' ? 'Settlement Due' : 'Total Payout'}
                    </p>
                    <p className="text-xl md:text-2xl font-black">
                      {activeView === 'GST' ? formatCurrency(taxStats.tax) : 
                       activeView === 'SETTLEMENT' ? formatCurrency(settlementData.totalAmount) :
                       formatCurrency(totalPayouts.grandTotal)}
                    </p>
                  </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
           {activeView === 'GST' && (
             <div className="space-y-6">
                <div className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                  <SummaryCard label="Gross Turnover" value={formatCurrency(taxStats.total)} color="blue" />
                  <SummaryCard label="Taxable Value" value={formatCurrency(taxStats.taxable)} color="indigo" />
                  <SummaryCard label="Total Tax" value={formatCurrency(taxStats.tax)} color="emerald" />
                  <SummaryCard label="Invoices" value={taxStats.count} color="slate" />
                </div>
                <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50 border-b">
                      <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-8 py-5">Invoice #</th>
                        <th className="px-8 py-5">Tax Details</th>
                        <th className="px-8 py-5 text-right">Taxable</th>
                        <th className="px-8 py-5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSales.map(sale => {
                        const gstRate = currentBranch?.gstPercentage || 18;
                        const taxable = sale.amount / (1 + (gstRate / 100));
                        return (
                          <tr key={sale.id} className="hover:bg-slate-50/50">
                            <td className="px-8 py-5 font-mono text-xs font-bold text-blue-600 uppercase">{sale.invoiceNo}</td>
                            <td className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">GST @ {gstRate}%</td>
                            <td className="px-8 py-5 text-right font-bold text-slate-600 text-sm">{formatCurrency(taxable)}</td>
                            <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">{formatCurrency(sale.amount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
             </div>
           )}

           {activeView === 'SETTLEMENT' && (
             <div className="space-y-6">
                <div className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-3 gap-6">
                  <SummaryCard label="Total Bookings" value={settlementData.totalBookings} color="blue" />
                  <SummaryCard label="Rate per Session" value={formatCurrency(settlementData.rate)} color="indigo" />
                  <SummaryCard label="Due Amount" value={formatCurrency(settlementData.totalAmount)} color="emerald" />
                </div>
                <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Settlement Audit</h3>
                   <div className="space-y-4">
                      {bookings.filter(b => b.branchId === selectedBranchId).slice(0, 5).map(b => (
                        <div key={b.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border shadow-sm">
                                 <i className="fas fa-calendar-check text-blue-600"></i>
                              </div>
                              <div>
                                 <p className="text-xs font-bold text-slate-900 uppercase">Session #{b.id.slice(-6)}</p>
                                 <p className="text-[10px] text-slate-500 font-medium">{b.date} at {b.time}</p>
                              </div>
                           </div>
                           <p className="text-xs font-black text-slate-900">{formatCurrency(settlementRate)}</p>
                        </div>
                      ))}
                      <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4">Showing last 5 bookings for settlement</p>
                   </div>
                </div>
             </div>
           )}

           {activeView === 'PAYROLL' && (
             <div className="space-y-6">
                <div className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-2 gap-6">
                  <SummaryCard label="Staff Count" value={users.filter(u => u.branchId === selectedBranchId && (u.role === UserRole.STAFF || u.role === UserRole.TRAINER)).length} color="blue" />
                  <SummaryCard label="Total Monthly Payroll" value={formatCurrency(totalPayouts.payroll)} color="emerald" />
                </div>
                <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b">
                         <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="px-8 py-5">Employee</th>
                            <th className="px-8 py-5">Role</th>
                            <th className="px-8 py-5 text-right">Base Salary</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {users.filter(u => u.branchId === selectedBranchId && (u.role === UserRole.STAFF || u.role === UserRole.TRAINER)).map(u => (
                           <tr key={u.id} className="hover:bg-slate-50/50">
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-3">
                                    <img src={u.avatar} className="w-8 h-8 rounded-full border shadow-sm" alt="" />
                                    <p className="text-xs font-bold text-slate-900">{u.name}</p>
                                 </div>
                              </td>
                              <td className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">{u.role}</td>
                              <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">{formatCurrency(u.salary || 25000)}</td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
           )}

           {activeView === 'COMMISSIONS' && (
             <div className="space-y-6">
                <SummaryCard label="Branch Commissions (10% of Sales)" value={formatCurrency(totalPayouts.commissions)} color="indigo" />
                <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
                   <p className="text-sm text-slate-500 font-medium text-center">Commission structure for {currentBranch?.name} is based on a flat 10% performance incentive across all sales activities.</p>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, color }: any) => {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100'
  };
  return (
    <div className={`p-6 rounded-[2rem] border shadow-sm ${colors[color]} transition-all min-w-0`}>
       <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1 truncate">{label}</p>
       <p className="text-lg md:text-xl font-black truncate tracking-tight">{value}</p>
    </div>
  );
};

export default TaxCenter;
