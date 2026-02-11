
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { PlanType, Plan } from '../types';

const Plans: React.FC = () => {
  const { plans, branches, addPlan, updatePlan, currentUser } = useAppContext();
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    type: PlanType.GYM, 
    price: 0, 
    durationDays: 30, 
    branchId: branches[0]?.id || '',
    isMultiBranch: false,
    maxSessions: 0,
    sessionDurationMinutes: 60,
    groupCapacity: 15
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const filteredPlans = currentUser?.role === 'SUPER_ADMIN' 
    ? plans 
    : plans.filter(p => p.branchId === currentUser?.branchId);

  const handleOpenAdd = () => {
    setSelectedPlan(null);
    setFormData({ 
      name: '', 
      type: PlanType.GYM, 
      price: 0, 
      durationDays: 30, 
      branchId: currentUser?.branchId || branches[0]?.id || '',
      isMultiBranch: false,
      maxSessions: 0,
      sessionDurationMinutes: 60,
      groupCapacity: 15
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      type: plan.type,
      price: plan.price,
      durationDays: plan.durationDays,
      branchId: plan.branchId,
      isMultiBranch: plan.isMultiBranch || false,
      maxSessions: plan.maxSessions || 0,
      sessionDurationMinutes: plan.sessionDurationMinutes || 60,
      groupCapacity: plan.groupCapacity || 15
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const planPayload = {
        ...formData,
        maxSessions: formData.maxSessions > 0 ? formData.maxSessions : undefined,
        sessionDurationMinutes: formData.type !== PlanType.GYM ? formData.sessionDurationMinutes : undefined,
        groupCapacity: formData.type === PlanType.GROUP ? formData.groupCapacity : undefined
    };

    if (selectedPlan) {
      updatePlan(selectedPlan.id, planPayload);
    } else {
      addPlan({
        id: `p-${Date.now()}`,
        isActive: true,
        ...planPayload
      } as Plan);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Membership Plans</h2>
          <p className="text-gray-500">Structure your offerings, validity, and session quotas</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
        >
          <i className="fas fa-plus"></i> CREATE NEW PLAN
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map(plan => {
          const branch = branches.find(b => b.id === plan.branchId);
          return (
            <div key={plan.id} className="bg-white rounded-3xl border shadow-sm p-6 relative overflow-hidden group hover:border-blue-300 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 -mr-12 -mt-12 rounded-full group-hover:bg-blue-500/10 transition-colors"></div>
              <div className="mb-4 flex justify-between items-start gap-2 flex-wrap">
                <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                  {plan.type}
                </span>
                <div className="flex flex-col items-end gap-1">
                    {plan.isMultiBranch && (
                        <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-sm">
                            ALL BRANCH ACCESS
                        </span>
                    )}
                    {plan.maxSessions && (
                        <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-2 py-1 rounded border border-emerald-100 uppercase tracking-widest">
                            {plan.maxSessions} SESSIONS
                        </span>
                    )}
                    {plan.type === PlanType.GROUP && (
                        <span className="bg-orange-50 text-orange-600 text-[8px] font-black px-2 py-1 rounded border border-orange-100 uppercase tracking-widest">
                            {plan.groupCapacity || 15} CAPACITY
                        </span>
                    )}
                </div>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-1 uppercase tracking-tight">{plan.name}</h3>
              <p className="text-[10px] text-gray-400 uppercase font-black mb-6 tracking-widest">{branch?.name}</p>
              
              <div className="flex flex-col gap-1 mb-8">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-gray-900">{formatCurrency(plan.price)}</span>
                    <span className="text-gray-400 text-sm font-bold uppercase tracking-tighter">/ {plan.durationDays} Days</span>
                </div>
                {plan.type !== PlanType.GYM && (
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {plan.sessionDurationMinutes || 60} Min per session
                  </p>
                )}
                {plan.type === PlanType.GROUP && (
                    <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <i className="fas fa-users-rectangle"></i> Max {plan.groupCapacity || 15} Participants
                    </p>
                )}
              </div>

              <button 
                onClick={() => handleOpenEdit(plan)}
                className="w-full py-3 bg-gray-50 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-100 transition-colors"
              >
                EDIT DETAILS
              </button>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto scrollbar-hide">
            <h3 className="text-2xl font-black mb-6 tracking-tight uppercase text-slate-900">{selectedPlan ? 'Edit Plan' : 'New Membership Plan'}</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Plan Name</label>
                <input 
                  required placeholder="e.g., Summer Special" 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Plan Type</label>
                <select 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-xs uppercase tracking-widest"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value as PlanType})}
                >
                  <option value={PlanType.GYM}>Gym Membership</option>
                  <option value={PlanType.PT}>Personal Training</option>
                  <option value={PlanType.GROUP}>Group Classes</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price (INR)</label>
                  <input 
                    type="number" required placeholder="Price" 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    value={formData.price || ''}
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Validity (Days)</label>
                  <input 
                    type="number" required placeholder="Days" 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    value={formData.durationDays || ''}
                    onChange={e => setFormData({...formData, durationDays: Number(e.target.value)})}
                  />
                </div>
              </div>

              {(formData.type === PlanType.PT || formData.type === PlanType.GROUP) && (
                <div className="grid grid-cols-2 gap-4 animate-[fadeIn_0.3s_ease-out]">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Session Quota</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 12" 
                      className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      value={formData.maxSessions || ''}
                      onChange={e => setFormData({...formData, maxSessions: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Mins / Session</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 60" 
                      className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      value={formData.sessionDurationMinutes || ''}
                      onChange={e => setFormData({...formData, sessionDurationMinutes: Number(e.target.value)})}
                    />
                  </div>
                </div>
              )}

              {formData.type === PlanType.GROUP && (
                <div className="space-y-1 p-4 bg-orange-50 border border-orange-100 rounded-2xl animate-[fadeIn_0.3s_ease-out]">
                  <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <i className="fas fa-users-viewfinder"></i> Maximum Participants per Session
                  </label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-white border border-orange-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-black text-sm"
                    value={formData.groupCapacity}
                    onChange={e => setFormData({...formData, groupCapacity: Number(e.target.value)})}
                  />
                </div>
              )}
              
              <div className="py-4 border-t border-b border-gray-50 space-y-4">
                 <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Multi-Branch Access</span>
                       <span className="text-[9px] text-slate-400 font-medium">Allows athlete to enter any IronFlow location</span>
                    </div>
                    <div 
                      onClick={() => setFormData({...formData, isMultiBranch: !formData.isMultiBranch})}
                      className={`w-12 h-6 rounded-full transition-all relative ${formData.isMultiBranch ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                       <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${formData.isMultiBranch ? 'right-1' : 'left-1'}`}></div>
                    </div>
                 </label>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Home Branch</label>
                <select 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-xs uppercase tracking-widest"
                  value={formData.branchId}
                  onChange={e => setFormData({...formData, branchId: e.target.value})}
                  disabled={currentUser?.role !== 'SUPER_ADMIN'}
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="pt-4 space-y-3">
                <button className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-black shadow-xl shadow-slate-100 transition-all active:scale-95">
                    {selectedPlan ? 'SAVE CHANGES' : 'DEPLOY PLAN'}
                </button>
                <button 
                    type="button" 
                    onClick={() => setModalOpen(false)} 
                    className="w-full py-2 text-gray-400 font-black hover:text-gray-600 transition-colors uppercase text-[9px] tracking-widest"
                >
                    CANCEL
                </button>
              </div>
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

export default Plans;
