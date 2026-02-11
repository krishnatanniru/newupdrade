
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { Sale } from '../types';
import InvoiceModal from '../components/InvoiceModal';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const Sales: React.FC = () => {
  const { sales, users, plans, branches, currentUser } = useAppContext();
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);

  const filteredSales = currentUser?.role === 'SUPER_ADMIN' 
    ? sales 
    : sales.filter(s => s.branchId === currentUser?.branchId);

  const totalRev = filteredSales.reduce((acc, s) => acc + s.amount, 0);

  const closeInvoice = () => setViewingSale(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revenue & Sales</h2>
          <p className="text-gray-500">Real-time financial tracking across branches</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border shadow-sm">
           <p className="text-[10px] font-bold text-gray-400 uppercase">Total Period Revenue</p>
           <p className="text-xl font-black text-green-600">{formatCurrency(totalRev)}</p>
        </div>
      </div>

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
