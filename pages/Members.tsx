
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, SubscriptionStatus, User } from '../types';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const Members: React.FC = () => {
  const { users, subscriptions, plans, currentUser, enrollMember, attendance, updateUser } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'logs' | 'manage' | null>(null);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  
  // Form States
  const [enrollData, setEnrollData] = useState({ name: '', email: '', planId: plans[0]?.id || '', emergencyContact: '', address: '' });
  const [manageData, setManageData] = useState({ name: '', email: '', emergencyContact: '', address: '' });

  const members = users.filter(u => u.role === UserRole.MEMBER && 
    (currentUser?.role === UserRole.SUPER_ADMIN || u.branchId === currentUser?.branchId));

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.memberId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    enrollMember({ 
      name: enrollData.name, 
      email: enrollData.email, 
      emergencyContact: enrollData.emergencyContact,
      address: enrollData.address
    }, enrollData.planId);
    setAddModalOpen(false);
    setEnrollData({ name: '', email: '', planId: plans[0]?.id || '', emergencyContact: '', address: '' });
  };

  const handleUpdateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMember) {
      updateUser(selectedMember.id, manageData);
      setActiveModal(null);
      setSelectedMember(null);
    }
  };

  const openLogs = (member: User) => {
    setSelectedMember(member);
    setActiveModal('logs');
  };

  const openManage = (member: User) => {
    setSelectedMember(member);
    setManageData({ 
      name: member.name, 
      email: member.email, 
      emergencyContact: member.emergencyContact || '',
      address: member.address || ''
    });
    setActiveModal('manage');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Member Directory</h2>
          <p className="text-gray-500">Manage athletes from across India</p>
        </div>
        <button 
          onClick={() => setAddModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-200"
        >
          <i className="fas fa-plus"></i> ADD NEW MEMBER
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 relative w-full">
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map(member => {
          const sub = subscriptions.find(s => s.memberId === member.id);
          const plan = plans.find(p => p.id === sub?.planId);
          const isActive = sub?.status === SubscriptionStatus.ACTIVE;

          return (
            <div key={member.id} className="bg-white rounded-2xl border p-6 hover:shadow-xl transition-all group relative overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={member.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md" />
                    {isActive && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{member.name}</h3>
                    <p className="text-xs font-mono text-gray-400 tracking-tighter uppercase">{member.memberId}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {isActive ? 'Active' : 'Expired'}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 uppercase font-bold">Subscription</span>
                  <span className="font-bold text-gray-700">{plan?.name || 'No Plan'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-red-500 uppercase font-black text-[9px] tracking-widest">Emergency</span>
                  <span className="font-black text-slate-700">{member.emergencyContact || 'MISSING'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 uppercase font-bold">Address</span>
                  <span className="font-medium text-gray-700 truncate max-w-[150px]" title={member.address}>{member.address || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 uppercase font-bold">Valid Until</span>
                  <span className="font-medium text-gray-700">{sub?.endDate || 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button 
                  onClick={() => openLogs(member)}
                  className="py-2 bg-gray-50 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors"
                >
                  VIEW LOGS
                </button>
                <button 
                  onClick={() => openManage(member)}
                  className="py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                >
                  MANAGE
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="bg-blue-600 p-6 text-white flex justify-between items-center sticky top-0 z-10">
               <h3 className="text-xl font-bold uppercase tracking-tight leading-none">Athlete Enrollment</h3>
               <button onClick={() => setAddModalOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleAddMember} className="p-8 space-y-6">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                  <input required type="text" className="w-full p-4 bg-gray-50 border rounded-xl font-bold" placeholder="Arjun Reddy" value={enrollData.name} onChange={e => setEnrollData({...enrollData, name: e.target.value})} />
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Address</label>
                  <textarea className="w-full p-4 bg-gray-50 border rounded-xl font-bold text-sm" placeholder="Street, City, State, PIN" value={enrollData.address} onChange={e => setEnrollData({...enrollData, address: e.target.value})} rows={2}></textarea>
               </div>

               <div className="space-y-2 p-4 bg-red-50 rounded-2xl border border-red-100">
                  <label className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2 mb-1">
                     <i className="fas fa-truck-medical"></i> Emergency Contact Number
                  </label>
                  <input required type="tel" className="w-full p-3 bg-white border border-red-100 rounded-xl font-black text-red-700" placeholder="+91 XXXXX XXXXX" value={enrollData.emergencyContact} onChange={e => setEnrollData({...enrollData, emergencyContact: e.target.value})} />
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                  <input required type="email" className="w-full p-4 bg-gray-50 border rounded-xl font-bold" placeholder="athlete@ironflow.in" value={enrollData.email} onChange={e => setEnrollData({...enrollData, email: e.target.value})} />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Initial Plan</label>
                  <select className="w-full p-4 bg-gray-50 border rounded-xl font-bold uppercase text-xs" value={enrollData.planId} onChange={e => setEnrollData({...enrollData, planId: e.target.value})}>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>)}
                  </select>
               </div>
               <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-2xl shadow-blue-100 active:scale-95 transition-all">ACTIVATE MEMBERSHIP</button>
            </form>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {activeModal === 'logs' && selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <img src={selectedMember.avatar} className="w-10 h-10 rounded-full border border-slate-700" alt="" />
                  <div>
                    <h3 className="font-bold">{selectedMember.name}</h3>
                    <p className="text-[10px] uppercase text-slate-400">Attendance History</p>
                  </div>
               </div>
               <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white"><i className="fas fa-times"></i></button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              {attendance.filter(a => a.userId === selectedMember.id).length === 0 ? (
                <div className="text-center py-10 text-gray-400 italic">No attendance records found for this member.</div>
              ) : (
                <div className="space-y-4">
                  {attendance.filter(a => a.userId === selectedMember.id).reverse().map(a => (
                    <div key={a.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center">
                          <i className="fas fa-check text-xs"></i>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{a.date}</p>
                          <p className="text-[10px] text-gray-500 uppercase">Checked In at {a.timeIn}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-white px-2 py-1 rounded border text-gray-400">LOGGED</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manage Modal */}
      {activeModal === 'manage' && selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center sticky top-0 z-10">
               <h3 className="text-xl font-bold uppercase tracking-tight leading-none">Manage Profile</h3>
               <button onClick={() => setActiveModal(null)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleUpdateMember} className="p-8 space-y-6">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Athlete Name</label>
                  <input required type="text" className="w-full p-4 bg-gray-50 border rounded-xl font-bold" value={manageData.name} onChange={e => setManageData({...manageData, name: e.target.value})} />
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Address</label>
                  <textarea className="w-full p-4 bg-gray-50 border rounded-xl font-bold text-sm" value={manageData.address} onChange={e => setManageData({...manageData, address: e.target.value})} rows={2}></textarea>
               </div>

               <div className="space-y-2 p-4 bg-red-50 rounded-2xl border border-red-100">
                  <label className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2 mb-1">
                     <i className="fas fa-truck-medical"></i> Emergency Contact Number
                  </label>
                  <input required type="tel" className="w-full p-3 bg-white border border-red-100 rounded-xl font-black text-red-700" value={manageData.emergencyContact} onChange={e => setManageData({...manageData, emergencyContact: e.target.value})} />
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Email</label>
                  <input required type="email" className="w-full p-4 bg-gray-50 border rounded-xl font-bold" value={manageData.email} onChange={e => setManageData({...manageData, email: e.target.value})} />
               </div>
               <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-[10px] font-black uppercase text-blue-600 tracking-widest leading-relaxed">
                  <i className="fas fa-info-circle mr-2"></i>
                  Safety contact information is visible to receptionist and managers in case of emergency.
               </div>
               <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 active:scale-95 transition-all">COMMIT CHANGES</button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Members;
