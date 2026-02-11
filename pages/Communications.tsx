
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { CommType } from '../types';

const Communications: React.FC = () => {
  const { communications, users, branches } = useAppContext();
  const [filter, setFilter] = useState<'ALL' | CommType>('ALL');

  const filteredComms = filter === 'ALL' 
    ? communications 
    : communications.filter(c => c.type === filter);

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Comm Hub</h2>
          <p className="text-slate-500 font-medium">Monitoring automated SMS & Gmail interactions</p>
        </div>

        <div className="flex bg-white p-1 rounded-2xl shadow-sm border">
           {['ALL', CommType.EMAIL, CommType.SMS].map((t) => (
             <button
               key={t}
               onClick={() => setFilter(t as any)}
               className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
             >
               {t}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <StatCard label="Total Sent" value={communications.length} icon="fa-paper-plane" color="blue" />
         <StatCard label="Emails Delivered" value={communications.filter(c => c.type === CommType.EMAIL).length} icon="fa-envelope" color="indigo" />
         <StatCard label="SMS Delivered" value={communications.filter(c => c.type === CommType.SMS).length} icon="fa-comment-dots" color="amber" />
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 border-b">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Type</th>
                <th className="px-8 py-5">Recipient</th>
                <th className="px-8 py-5">Branch Source</th>
                <th className="px-8 py-5">Content Preview</th>
                <th className="px-8 py-5">Timestamp</th>
                <th className="px-8 py-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredComms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic font-medium">
                    <div className="flex flex-col items-center gap-3">
                       <i className="fas fa-inbox text-4xl opacity-10"></i>
                       <p>No communications recorded in current session.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredComms.map((comm) => {
                  const user = users.find(u => u.id === comm.userId);
                  const branch = branches.find(b => b.id === comm.branchId);
                  return (
                    <tr key={comm.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${comm.type === CommType.EMAIL ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                          <i className={`fas ${comm.type === CommType.EMAIL ? 'fa-envelope' : 'fa-sms'} text-sm`}></i>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-black text-slate-900 text-sm truncate max-w-[150px]">{user?.name || 'System'}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{comm.recipient}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
                          {branch?.name || 'GLOBAL HUB'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="max-w-md">
                           {comm.subject && <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight mb-1">{comm.subject}</p>}
                           <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed">{comm.body}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-bold text-slate-400">{comm.timestamp}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="bg-green-100 text-green-700 text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-2 w-fit">
                           <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                           DELIVERED
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600'
  };
  return (
    <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex items-center gap-6">
       <div className={`${colors[color]} w-14 h-14 rounded-2xl flex items-center justify-center shrink-0`}>
          <i className={`fas ${icon} text-xl`}></i>
       </div>
       <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
          <p className="text-2xl font-black text-slate-900">{value}</p>
       </div>
    </div>
  );
};

export default Communications;
