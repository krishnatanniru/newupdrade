import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, User, Attendance, PlanType, SubscriptionStatus, Expense } from '../types';

const TaxCenter: React.FC = () => {
  const { sales, branches, currentUser, attendance, users, settlementRate, plans, bookings, subscriptions, expenses, addExpense, deleteExpense } = useAppContext();
  
  const [activeView, setActiveView] = useState<'GST' | 'SETTLEMENT' | 'PAYROLL' | 'COMMISSIONS' | 'EXPENSES' | 'PROFIT_LOSS'>('GST');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(currentUser?.branchId || branches[0].id);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
     category: 'RENT',
     amount: '',
     date: new Date().toISOString().split('T')[0],
     description: ''
  });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

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

  // Only consider non-cash transactions for GST
  const gstApplicableSales = useMemo(() => {
     return filteredSales.filter(s => s.paymentMethod !== 'CASH');
  }, [filteredSales]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
        const d = new Date(e.date);
        return (
            e.branchId === selectedBranchId &&
            d.getMonth() === selectedMonth &&
            d.getFullYear() === selectedYear
        );
    });
  }, [expenses, selectedBranchId, selectedMonth, selectedYear]);

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
  }, [gstApplicableSales, currentBranch]);

  const downloadJSON = () => {
    const data = gstApplicableSales.map(sale => ({
       Invoice: sale.invoiceNo,
       Date: sale.date,
       Amount: sale.amount,
       Taxable: (sale.amount / (1 + ((currentBranch?.gstPercentage || 18) / 100))).toFixed(2),
       Tax: (sale.amount - (sale.amount / (1 + ((currentBranch?.gstPercentage || 18) / 100)))).toFixed(2),
       Payment: sale.paymentMethod
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IronFlow_${currentBranch?.name}_${months[selectedMonth]}_${selectedYear}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const pnlStats = useMemo(() => {
      const totalIncome = filteredSales.reduce((acc, s) => acc + s.amount, 0);
      const operationalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
      const payrollCost = totalPayouts.grandTotal;
      const totalExpenses = operationalExpenses + payrollCost;
      const netProfit = totalIncome - totalExpenses;
      return { totalIncome, operationalExpenses, payrollCost, totalExpenses, netProfit };
  }, [filteredSales, filteredExpenses, totalPayouts]);

  const handleAddExpense = (e: React.FormEvent) => {
      e.preventDefault();
      if (!expenseForm.amount) return;
      const newExpense: Expense = {
          id: `exp-${Date.now()}`,
          branchId: selectedBranchId,
          category: expenseForm.category as any,
          amount: Number(expenseForm.amount),
          date: expenseForm.date,
          description: expenseForm.description,
          recordedBy: currentUser?.id || 'admin'
      };
      addExpense(newExpense);
      setExpenseModalOpen(false);
      setExpenseForm({ category: 'RENT', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
  };

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
           {['GST', 'SETTLEMENT', 'PAYROLL', 'COMMISSIONS', 'EXPENSES', 'PROFIT_LOSS'].map((v) => (
             <button
               key={v}
               onClick={() => setActiveView(v as any)}
               className={`flex-1 xl:flex-none px-6 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === v ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
             >
               {v === 'PROFIT_LOSS' ? 'PROFIT & LOSS' : v}
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
              
              <button 
                onClick={downloadJSON}
                className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-file-export"></i> Export GST Invoices (JSON)
              </button>

              <div className="pt-4 border-t space-y-4">
                  <div className="bg-slate-900 p-6 rounded-3xl text-center text-white shadow-xl">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">
                      {activeView === 'GST' ? 'GST Liability' : 
                       activeView === 'SETTLEMENT' ? 'Settlement Due' : 
                       activeView === 'EXPENSES' ? 'Total Expenses' :
                       activeView === 'PROFIT_LOSS' ? 'Net Profit' :
                       'Total Payout'}
                    </p>
                    <p className={`text-xl md:text-2xl font-black ${activeView === 'PROFIT_LOSS' && pnlStats.netProfit < 0 ? 'text-red-400' : 'text-white'}`}>
                      {activeView === 'GST' ? formatCurrency(taxStats.tax) : 
                       activeView === 'SETTLEMENT' ? formatCurrency(settlementData.totalAmount) :
                       activeView === 'EXPENSES' ? formatCurrency(pnlStats.totalExpenses) :
                       activeView === 'PROFIT_LOSS' ? formatCurrency(pnlStats.netProfit) :
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
                                 <p className="text-[10px] text-slate-500 font-medium">{b.date} at {b.timeSlot}</p>
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

           {activeView === 'EXPENSES' && (
             <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Expense Records</h3>
                   <button onClick={() => setExpenseModalOpen(true)} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2">
                      <i className="fas fa-plus"></i> Add Expense
                   </button>
                </div>
                <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b">
                         <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="px-8 py-5">Date</th>
                            <th className="px-8 py-5">Category</th>
                            <th className="px-8 py-5">Description</th>
                            <th className="px-8 py-5 text-right">Amount</th>
                            <th className="px-8 py-5 text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {filteredExpenses.length === 0 ? (
                            <tr>
                               <td colSpan={5} className="px-8 py-10 text-center text-slate-400 italic text-xs font-bold uppercase tracking-widest">No expenses recorded for this period.</td>
                            </tr>
                         ) : (
                            filteredExpenses.map(exp => (
                               <tr key={exp.id} className="hover:bg-slate-50/50">
                                  <td className="px-8 py-5 font-bold text-slate-500 text-xs">{exp.date}</td>
                                  <td className="px-8 py-5">
                                     <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">{exp.category}</span>
                                  </td>
                                  <td className="px-8 py-5 text-xs font-bold text-slate-700">{exp.description}</td>
                                  <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">{formatCurrency(exp.amount)}</td>
                                  <td className="px-8 py-5 text-right">
                                     <button onClick={() => deleteExpense(exp.id)} className="text-red-400 hover:text-red-600 transition-colors">
                                        <i className="fas fa-trash-can"></i>
                                     </button>
                                  </td>
                               </tr>
                            ))
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
           )}

           {activeView === 'PROFIT_LOSS' && (
             <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <SummaryCard label="Total Income (Sales)" value={formatCurrency(pnlStats.totalIncome)} color="emerald" />
                   <SummaryCard label="Total Expenses" value={formatCurrency(pnlStats.totalExpenses)} color="slate" />
                   <SummaryCard label="Net Profit / Loss" value={formatCurrency(pnlStats.netProfit)} color={pnlStats.netProfit >= 0 ? "blue" : "red"} />
                </div>
                
                <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Financial Health Summary</h3>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                         <span className="text-xs font-bold text-slate-500 uppercase">Revenue Stream</span>
                         <span className="text-sm font-black text-emerald-600">+{formatCurrency(pnlStats.totalIncome)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                         <span className="text-xs font-bold text-slate-500 uppercase">Operational Expenses</span>
                         <span className="text-sm font-black text-slate-700">-{formatCurrency(pnlStats.operationalExpenses)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                         <span className="text-xs font-bold text-slate-500 uppercase">Payroll & Commissions</span>
                         <span className="text-sm font-black text-slate-700">-{formatCurrency(pnlStats.payrollCost)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-red-50 rounded-2xl border border-red-100">
                         <span className="text-xs font-bold text-red-700 uppercase">Total Outflow</span>
                         <span className="text-sm font-black text-red-700">-{formatCurrency(pnlStats.totalExpenses)}</span>
                      </div>
                      <div className={`flex justify-between items-center p-6 rounded-2xl border-2 ${pnlStats.netProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                         <span className={`text-xs font-black uppercase tracking-widest ${pnlStats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Net Bottom Line</span>
                         <span className={`text-xl font-black ${pnlStats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(pnlStats.netProfit)}</span>
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>
      </div>

      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
              <div className="bg-red-600 p-8 text-white flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-black uppercase tracking-tight leading-none mb-1">Record Expense</h3>
                    <p className="text-[10px] text-red-200 font-bold uppercase tracking-widest">Financial Outflow</p>
                 </div>
                 <button onClick={() => setExpenseModalOpen(false)} className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-colors">
                    <i className="fas fa-times"></i>
                 </button>
              </div>
              <form onSubmit={handleAddExpense} className="p-8 space-y-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-black text-xs uppercase" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
                       <option value="RENT">Rent / Lease</option>
                       <option value="UTILITIES">Utilities (Electric/Water)</option>
                       <option value="SALARY">Staff Salaries</option>
                       <option value="EQUIPMENT">Equipment Maintenance</option>
                       <option value="MARKETING">Marketing & Ads</option>
                       <option value="OTHER">Other Operational</option>
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                       <input type="date" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-black text-xs" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                       <input type="number" required min="0" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-black text-sm" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                    <input type="text" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-bold text-sm" placeholder="e.g. AC Repair" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} />
                 </div>
                 <button type="submit" className="w-full py-5 bg-red-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-red-200 transition-all active:scale-95 hover:bg-red-700">
                    LOG EXPENSE
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, color }: any) => {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    red: 'bg-red-50 text-red-600 border-red-100'
  };
  return (
    <div className={`p-6 rounded-[2rem] border shadow-sm ${colors[color]} transition-all min-w-0`}>
       <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1 truncate">{label}</p>
       <p className="text-lg md:text-xl font-black truncate tracking-tight">{value}</p>
    </div>
  );
};

export default TaxCenter;
