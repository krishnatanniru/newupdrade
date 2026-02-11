
import React from 'react';
import { User, Branch } from '../types';

interface PayslipModalProps {
  user: User;
  branch: Branch;
  month: string;
  year: number;
  earnings: {
    hours: number;
    rate: number;
    baseSalary: number;
    commissions: number;
    incentiveType: string;
    total: number;
  };
  onClose: () => void;
}

const PayslipModal: React.FC<PayslipModalProps> = ({ user, branch, month, year, earnings, onClose }) => {
  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amt || 0);
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 print-container">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out] flex flex-col max-h-[95vh] modal-content relative">
        {/* Actions Header - Hidden on Print */}
        <div className="bg-slate-900 px-8 py-4 text-white flex justify-between items-center shrink-0 no-print">
           <div className="flex items-center gap-2">
             <i className="fas fa-wallet text-emerald-400"></i>
             <span className="font-black uppercase tracking-widest text-[10px]">PAYSLIP: {month.toUpperCase()} {year}</span>
           </div>
           <div className="flex items-center gap-4">
             <button 
               onClick={handlePrint} 
               className="bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-lg transition-all text-[10px] font-black uppercase flex items-center gap-2 shadow-lg active:scale-95"
             >
               <i className="fas fa-print"></i> DOWNLOAD / PRINT
             </button>
             <button onClick={onClose} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-colors">
               <i className="fas fa-times"></i>
             </button>
           </div>
        </div>

        {/* Payslip Content */}
        <div className="flex-1 overflow-y-auto p-12 bg-white text-slate-900 printable-area" id="payslip-document">
           <div className="flex justify-between items-start mb-12">
              <div>
                <h2 className="text-3xl font-black tracking-tighter text-slate-900 mb-1">IRONFLOW</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Employee Earnings Statement</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black uppercase text-slate-900">{branch.name}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Tax Entity: {branch.gstin || 'IF-CORP'}</p>
                <p className="text-[10px] text-slate-400 font-bold">{branch.address}</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-12 mb-12 bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <div>
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Employee Details</h4>
                 <div className="space-y-1">
                    <p className="font-black text-sm uppercase">{user.name}</p>
                    <p className="text-xs text-slate-500">ID: {user.id.toUpperCase()}</p>
                    <p className="text-xs font-bold text-blue-600 uppercase mt-1 tracking-tight">{user.role.replace('_', ' ')}</p>
                 </div>
              </div>
              <div className="text-right">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pay Period</h4>
                 <p className="font-black text-sm uppercase">{month} {year}</p>
                 <p className="text-xs text-slate-500 mt-1">Status: DISBURSED</p>
                 <p className="text-xs font-bold text-slate-400 mt-1">Email: {user.email}</p>
              </div>
           </div>

           <table className="w-full mb-12">
              <thead className="border-b-2 border-slate-900">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="py-4 text-left">Earning Components</th>
                  <th className="py-4 text-center">Volume / Rate</th>
                  <th className="py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                   <td className="py-6">
                      <p className="font-black text-sm text-slate-900 uppercase">Base Professional Salary</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">Calculated from punch-in logs</p>
                   </td>
                   <td className="py-6 text-center text-xs font-bold text-slate-600">
                      {(earnings.hours || 0).toFixed(1)} hrs @ {formatCurrency(earnings.rate)}/hr
                   </td>
                   <td className="py-6 text-right font-bold text-slate-900">{formatCurrency(earnings.baseSalary)}</td>
                </tr>
                {earnings.commissions > 0 && (
                  <tr>
                    <td className="py-6">
                        <p className="font-black text-sm text-emerald-600 uppercase">Performance Incentive</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">{earnings.incentiveType}</p>
                    </td>
                    <td className="py-6 text-center text-xs font-bold text-emerald-600">
                        Achievement Payout
                    </td>
                    <td className="py-6 text-right font-bold text-emerald-600">+{formatCurrency(earnings.commissions)}</td>
                  </tr>
                )}
              </tbody>
           </table>

           <div className="flex justify-end mb-12">
              <div className="w-72 space-y-4">
                 <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>Gross Earnings</span>
                    <span>{formatCurrency(earnings.total)}</span>
                 </div>
                 <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>Professional Tax / TDS</span>
                    <span>{formatCurrency(0)}</span>
                 </div>
                 <div className="flex justify-between pt-4 border-t-2 border-slate-900 bg-slate-50 p-4 rounded-xl">
                    <span className="text-sm font-black uppercase">Net Take Home Pay</span>
                    <span className="text-xl font-black text-slate-900">{formatCurrency(earnings.total)}</span>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-8 pt-12 border-t border-slate-100">
              <div className="text-[9px] text-slate-400 font-medium leading-relaxed italic">
                 This is an official earnings document generated by the IronFlow Management System. It is valid for personal financial records and loan applications. 
                 Payment has been processed via Branch Settlement protocols.
              </div>
              <div className="text-right">
                 <div className="w-32 h-10 border-b-2 border-slate-100 ml-auto mb-2 opacity-50 flex items-end justify-center">
                    <span className="font-mono text-[8px] text-slate-300 italic">IF-SYSTEMS-SIGNED</span>
                 </div>
                 <p className="text-[10px] font-black text-slate-900 uppercase">Finance Controller</p>
                 <p className="text-[9px] text-slate-400 font-bold">IronFlow Corporate Hub</p>
              </div>
           </div>
        </div>
      </div>
      <style>{`
        @media print {
          @page { margin: 1cm; size: portrait; }
          body * { visibility: hidden !important; }
          .print-container, .print-container *, #payslip-document, #payslip-document * { visibility: visible !important; }
          .no-print { display: none !important; }
          .print-container {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: white !important;
            z-index: 9999 !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          .modal-content {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: none !important;
            box-shadow: none !important;
            border: none !important;
            height: auto !important;
            max-height: none !important;
          }
          .printable-area {
            overflow: visible !important;
            height: auto !important;
            padding: 0 !important;
          }
        }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default PayslipModal;
