
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { Sale, UserRole } from '../types';
import InvoiceModal from '../components/InvoiceModal';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const Sales: React.FC = () => {
  const { sales, users, plans, branches, currentUser, generateTransactionCode } = useAppContext();
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [generatedPIN, setGeneratedPIN] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredSales = currentUser?.role === 'SUPER_ADMIN' 
    ? sales 
    : sales.filter(s => s.branchId === currentUser?.branchId);

  const totalRev = filteredSales.reduce((acc, s) => acc + s.amount, 0);

  const closeInvoice = () => setViewingSale(null);

  const [selectedBranchForPIN, setSelectedBranchForPIN] = useState(currentUser?.branchId || branches[0].id);

  const handleGeneratePIN = async () => {
    setIsGenerating(true);
    const pin = await generateTransactionCode(selectedBranchForPIN);
    setGeneratedPIN(pin);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revenue & Sales</h2>
          <p className="text-gray-500">Real-time financial tracking across branches</p>
        </div>
        <div className="flex items-center gap-4">
          {currentUser?.role === 'SUPER_ADMIN' && (
             <select 
               className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
               value={selectedBranchForPIN}
               onChange={e => setSelectedBranchForPIN(e.target.value)}
             >
               {branches.map(b => (
                 <option key={b.id} value={b.id}>{b.name}</option>
               ))}
             </select>
          )}
          {(currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.BRANCH_ADMIN) && (
            <button 
               onClick={handleGeneratePIN}
               disabled={isGenerating}
               className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
               {isGenerating ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-key"></i>}
               GENERATE PIN
            </button>
          )}
          <div className="bg-white px-6 py-3 rounded-2xl border shadow-sm">
             <p className="text-[10px] font-bold text-gray-400 uppercase">Total Period Revenue</p>
             <p className="text-xl font-black text-green-600">{formatCurrency(totalRev)}</p>
          </div>
        </div>
      </div>
      
      {generatedPIN && (
         <div className="bg-indigo-900 p-6 rounded-[2rem] text-center text-white relative overflow-hidden animate-[slideUp_0.4s_ease-out] shadow-2xl">
            <p className="text-indigo-300 font-bold text-xs uppercase tracking-widest mb-2">One-Time Transaction PIN</p>
            <div className="text-5xl font-black tracking-[0.2em] font-mono text-white mb-2">{generatedPIN}</div>
            <p className="text-indigo-400 text-[10px] font-medium">Share this code with staff to authorize a Cash/Card transaction. Valid for one use only.</p>
            <button onClick={() => setGeneratedPIN(null)} className="absolute top-4 right-4 text-indigo-400 hover:text-white"><i className="fas fa-times"></i></button>
         </div>
      )}

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <th className="px-6 py-4">Invoice No</th>
              <th className="px-6 py-4">Member</th>
              <th className="px-6 py-4">Plan / Service</th>
              <th className="px-6 py-4">Branch</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">No sales data recorded yet.</td>
              </tr>
            ) : (
              [...filteredSales].reverse().map(sale => {
                const member = users.find(u => u.id === sale.memberId);
                const plan = plans.find(p => p.id === sale.planId);
                const branch = branches.find(b => b.id === sale.branchId);
                return (
                  <tr key={sale.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-blue-600 font-bold">{sale.invoiceNo}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{member?.name}</div>
                      <div className="text-[10px] text-gray-400">{sale.date}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-700">{plan?.name}</div>
                      <div className="text-[10px] text-blue-500 font-bold">{sale.paymentMethod}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{branch?.name}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-gray-900">{formatCurrency(sale.amount)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <button 
                        onClick={() => setViewingSale(sale)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="View Invoice"
                       >
                         <i className="fas fa-file-invoice"></i>
                       </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {viewingSale && (
        <InvoiceModal 
          sale={viewingSale}
          branch={branches.find(b => b.id === viewingSale.branchId)!}
          member={users.find(u => u.id === viewingSale.memberId)!}
          plan={plans.find(p => p.id === viewingSale.planId)!}
          onClose={closeInvoice}
        />
      )}
    </div>
  );
};

export default Sales;
