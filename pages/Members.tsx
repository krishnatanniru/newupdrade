
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, SubscriptionStatus, User } from '../types';
import { ImageUploadModal } from '../components/ImageUploadModal';
import { PaymentModal } from '../components/PaymentModal';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const Members: React.FC = () => {
  const { users, subscriptions, plans, currentUser, enrollMember, attendance, updateUser, deleteUser, verifyTransactionCode, showToast } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'logs' | 'manage' | null>(null);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Form States
   const [enrollData, setEnrollData] = useState({ name: '', email: '', planId: plans[0]?.id || '', emergencyContact: '', address: '', avatar: '', startDate: new Date().toISOString().split('T')[0], discount: 0, paymentMethod: 'ONLINE' as 'CASH' | 'CARD' | 'ONLINE' | 'POS', transactionCode: '', phone: '' });
   const [manageData, setManageData] = useState({ name: '', email: '', emergencyContact: '', address: '', avatar: '', phone: '' });
   const [isImageModalOpen, setImageModalOpen] = useState(false);
   const [isEnrollImageModalOpen, setEnrollImageModalOpen] = useState(false);
   const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
   const [pendingEnrollment, setPendingEnrollment] = useState<any>(null);

  const members = users.filter(u => u.role === UserRole.MEMBER && 
    (currentUser?.role === UserRole.SUPER_ADMIN || u.branchId === currentUser?.branchId));

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.memberId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

   const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For ONLINE payments, show Razorpay modal first
    if (enrollData.paymentMethod === 'ONLINE') {
      const plan = plans.find(p => p.id === enrollData.planId);
      if (!plan) {
        showToast('Please select a valid plan', 'error');
        return;
      }
      const finalAmount = Math.max(0, plan.price - Number(enrollData.discount));
      setPendingEnrollment({
        userData: {
          name: enrollData.name,
          email: enrollData.email,
          emergencyContact: enrollData.emergencyContact,
          address: enrollData.address,
          phone: enrollData.phone,
          avatar: enrollData.avatar
        },
        planId: enrollData.planId,
        discount: Number(enrollData.discount),
        amount: finalAmount,
        planName: plan.name,
        branchId: currentUser?.branchId // Pass the current branch for payment config
      });
      setPaymentModalOpen(true);
      return;
    }
    
    // For CASH/CARD payments, verify transaction code
    if (enrollData.paymentMethod === 'CASH' || enrollData.paymentMethod === 'CARD') {
        if (!enrollData.transactionCode) {
           showToast('PIN Verification Required for Cash/Card', 'error');
           return;
        }
        setIsVerifying(true);
        const isValid = await verifyTransactionCode(enrollData.transactionCode);
        setIsVerifying(false);

        if (!isValid) {
           showToast('Invalid or Expired Transaction PIN', 'error');
           return;
        }
    }

    // Process enrollment for non-online payments
    completeEnrollment();
  };

  const completeEnrollment = (paymentId?: string) => {
    enrollMember({ 
      name: enrollData.name, 
      email: enrollData.email, 
      emergencyContact: enrollData.emergencyContact,
      address: enrollData.address,
      avatar: enrollData.avatar,
      phone: enrollData.phone
    }, enrollData.planId, undefined, undefined, Number(enrollData.discount), enrollData.paymentMethod, enrollData.startDate);
    
    if (paymentId) {
      showToast(`Payment successful! ID: ${paymentId}`, 'success');
    }
    
    setAddModalOpen(false);
    setPaymentModalOpen(false);
    setPendingEnrollment(null);
    setEnrollData({ name: '', email: '', planId: plans[0]?.id || '', emergencyContact: '', address: '', avatar: '', startDate: new Date().toISOString().split('T')[0], discount: 0, paymentMethod: 'ONLINE', transactionCode: '', phone: '' });
  };

  const handlePaymentSuccess = (paymentId: string) => {
    completeEnrollment(paymentId);
  };

  const handleUpdateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMember) {
      updateUser(selectedMember.id, manageData);
      setActiveModal(null);
      setSelectedMember(null);
    }
  };

  const handleDeleteMember = (member: User) => {
    if (currentUser?.role !== UserRole.SUPER_ADMIN) {
      showToast('Only Super Admin can delete members', 'error');
      return;
    }
    if (member.id === currentUser?.id) {
      showToast('You cannot delete your own profile', 'error');
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete ${member.name}? This action cannot be undone.`)) {
      deleteUser(member.id);
      showToast('Member deleted successfully', 'success');
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
      address: member.address || '',
      avatar: member.avatar || '',
      phone: member.phone || ''
    });
    setActiveModal('manage');
  };

  const handleImageUpload = (url: string) => {
    setManageData({ ...manageData, avatar: url });
    showToast('Profile picture updated', 'success');
  };

  const handleEnrollImageUpload = (url: string) => {
    setEnrollData({ ...enrollData, avatar: url });
    setImageModalOpen(false);
    showToast('Profile picture added', 'success');
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
                {(currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.BRANCH_ADMIN) && (
                  <button 
                    onClick={() => openManage(member)}
                    className="py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                  >
                    MANAGE
                  </button>
                )}
              </div>
              {currentUser?.role === UserRole.SUPER_ADMIN && member.id !== currentUser?.id && (
                <button 
                  onClick={() => handleDeleteMember(member)}
                  className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Member"
                >
                  <i className="fas fa-trash"></i>
                </button>
              )}
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
               {/* Profile Picture Upload */}
               <div className="flex flex-col items-center space-y-3">
                  <div 
                    onClick={() => setEnrollImageModalOpen(true)}
                    className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-all overflow-hidden"
                  >
                    {enrollData.avatar ? (
                      <img src={enrollData.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <i className="fas fa-camera text-2xl text-gray-400"></i>
                        <p className="text-[10px] text-gray-400 mt-1">Add Photo</p>
                      </div>
                    )}
                  </div>
                  {enrollData.avatar && (
                    <button 
                      type="button"
                      onClick={() => setEnrollData({...enrollData, avatar: ''})}
                      className="text-xs text-red-500 font-bold hover:text-red-700"
                    >
                      Remove Photo
                    </button>
                  )}
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                  <input required type="text" className="w-full p-4 bg-gray-50 border rounded-xl font-bold" placeholder="Arjun Reddy" value={enrollData.name} onChange={e => setEnrollData({...enrollData, name: e.target.value})} />
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-mobile-screen"></i> Phone Number
                  </label>
                  <input type="tel" className="w-full p-4 bg-blue-50 border border-blue-100 rounded-xl font-bold text-blue-700" placeholder="+91 XXXXX XXXXX" value={enrollData.phone} onChange={e => setEnrollData({...enrollData, phone: e.target.value})} />
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

               <div className="space-y-2">
                  <label className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-calendar-alt"></i> Membership Start Date
                  </label>
                  <input 
                    type="date" 
                    required
                    className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-xl font-bold" 
                    value={enrollData.startDate} 
                    onChange={e => setEnrollData({...enrollData, startDate: e.target.value})} 
                  />
                  <p className="text-[10px] text-slate-400 font-medium">Plan will start from this date</p>
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Payment Method</label>
                  <select className="w-full p-4 bg-gray-50 border rounded-xl font-bold uppercase text-xs" value={enrollData.paymentMethod} onChange={e => setEnrollData({...enrollData, paymentMethod: e.target.value as any})}>
                     <option value="ONLINE">Online (UPI / Gateway)</option>
                     <option value="CASH">Cash</option>
                     <option value="CARD">Credit / Debit Card</option>
                  </select>
               </div>

               {(enrollData.paymentMethod === 'CASH' || enrollData.paymentMethod === 'CARD') && (
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-lock"></i> Transaction Authorization Code
                    </label>
                    <input 
                      type="text" 
                      required 
                      disabled={isVerifying}
                      className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-xl font-mono text-center text-lg tracking-[0.3em] font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                      placeholder="XXXXXX" 
                      value={enrollData.transactionCode} 
                      onChange={e => setEnrollData({...enrollData, transactionCode: e.target.value})} 
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Ask Branch Admin to generate a one-time code.</p>
                 </div>
               )}

               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Discount Amount (₹)</label>
                  <input type="number" min="0" className="w-full p-4 bg-gray-50 border rounded-xl font-bold" placeholder="0" value={enrollData.discount} onChange={e => setEnrollData({...enrollData, discount: Number(e.target.value)})} />
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
               <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <img 
                      src={manageData.avatar || 'https://i.pravatar.cc/150?u=default'} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setImageModalOpen(true)}
                      className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
                    >
                      <i className="fas fa-camera text-xs"></i>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 font-medium">Click camera to change photo</p>
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Athlete Name</label>
                  <input required type="text" className="w-full p-4 bg-gray-50 border rounded-xl font-bold" value={manageData.name} onChange={e => setManageData({...manageData, name: e.target.value})} />
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-mobile-screen"></i> Phone Number
                  </label>
                  <input type="tel" className="w-full p-4 bg-blue-50 border border-blue-100 rounded-xl font-bold text-blue-700" value={manageData.phone} onChange={e => setManageData({...manageData, phone: e.target.value})} />
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

      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onUpload={handleImageUpload}
        title="Update Member Photo"
      />

      <ImageUploadModal
        isOpen={isEnrollImageModalOpen}
        onClose={() => setEnrollImageModalOpen(false)}
        onUpload={handleEnrollImageUpload}
        title="Add Athlete Photo"
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPendingEnrollment(null);
        }}
        amount={pendingEnrollment?.amount || 0}
        description={`${pendingEnrollment?.planName || 'Gym Membership'} - ${enrollData.name}`}
        customerName={enrollData.name}
        customerEmail={enrollData.email}
        customerPhone={enrollData.emergencyContact}
        branchId={pendingEnrollment?.branchId}
        onSuccess={handlePaymentSuccess}
        onError={(error) => {
          console.error('Payment error:', error);
          showToast('Payment failed. Please try again.', 'error');
        }}
      />

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
