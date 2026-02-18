
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { PlanType, SubscriptionStatus, Plan, UserRole } from '../types';
import { PaymentModal } from '../components/PaymentModal';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const MembershipStore: React.FC = () => {
  const { plans, currentUser, purchaseSubscription, subscriptions, showToast, branches, users } = useAppContext();
  const [filter, setFilter] = useState<PlanType | 'ALL'>('ALL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<Plan | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [assignedTrainerId, setAssignedTrainerId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);

  if (!currentUser) return null;

  const branchPlans = plans.filter(p => p.branchId === currentUser.branchId && p.isActive);
  const filteredPlans = filter === 'ALL' ? branchPlans : branchPlans.filter(p => p.type === filter);
  const userBranch = branches.find(b => b.id === currentUser.branchId);
  
  const branchTrainers = users.filter(u => u.role === UserRole.TRAINER && u.branchId === currentUser.branchId);

  const memberSubs = subscriptions.filter(s => s.memberId === currentUser.id && s.status === SubscriptionStatus.ACTIVE);
  const hasGymSub = memberSubs.some(s => {
    const p = plans.find(plan => plan.id === s.planId);
    return p?.type === PlanType.GYM;
  });

  const initiateCheckout = (plan: Plan) => {
    if (plan.type !== PlanType.GYM && !hasGymSub) {
      showToast("Base Gym Membership required before buying Add-ons.", "error");
      return;
    }
    
    // For PT and Group plans, show checkout modal with trainer selection
    if (plan.type === PlanType.PT || plan.type === PlanType.GROUP) {
      setSelectedPlanForCheckout(plan);
      setSelectedMethod('UPI');
      setAssignedTrainerId('');
      setStartDate(new Date().toISOString().split('T')[0]);
      return;
    }
    
    // For Gym plans, open Razorpay payment modal directly
    setPendingPlan(plan);
    setIsPaymentModalOpen(true);
  };
  
  const handleProceedToPayment = () => {
    if (!selectedPlanForCheckout) return;
    
    // Validate trainer selection for PT and Group plans
    if ((selectedPlanForCheckout.type === PlanType.PT || selectedPlanForCheckout.type === PlanType.GROUP) && !assignedTrainerId) {
      showToast("Please select a trainer for your sessions.", "error");
      return;
    }
    
    setPendingPlan(selectedPlanForCheckout);
    setSelectedPlanForCheckout(null); // Close checkout modal
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (paymentId: string) => {
    if (!pendingPlan) return;
    
    purchaseSubscription(
      currentUser.id, 
      pendingPlan.id, 
      'ONLINE', 
      assignedTrainerId || undefined,
      startDate
    );
    
    setIsPaymentModalOpen(false);
    setSelectedPlanForCheckout(null);
    setPendingPlan(null);
    setAssignedTrainerId('');
    setStartDate(new Date().toISOString().split('T')[0]);
    showToast(`Payment successful! ID: ${paymentId}`, 'success');
  };
  
  const handlePaymentError = (error: any) => {
    showToast(error?.message || 'Payment failed. Please try again.', 'error');
  };

  const getProviderBranding = () => {
    const provider = userBranch?.paymentProvider || 'RAZORPAY';
    switch(provider) {
      case 'STRIPE': return { name: 'Stripe', color: '#635BFF', icon: 'fa-stripe' };
      case 'PAYTM': return { name: 'Paytm', color: '#00B9F1', icon: 'fa-wallet' };
      default: return { name: 'Razorpay', color: '#3395FF', icon: 'fa-check-circle' };
    }
  };

  const branding = getProviderBranding();

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">UPGRADE YOUR GAME</h2>
           <p className="text-slate-500 font-medium">Branch: {userBranch?.name || 'Loading...'}</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border overflow-x-auto scrollbar-hide">
           {['ALL', PlanType.GYM, PlanType.PT, PlanType.GROUP].map((t) => (
             <button
               key={t}
               onClick={() => setFilter(t as any)}
               className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filter === t ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
             >
               {t === 'ALL' ? 'Everything' : t.replace('_', ' ')}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPlans.map((plan) => {
          const isGym = plan.type === PlanType.GYM;
          const isPopular = plan.durationDays >= 90;
          
          return (
            <div key={plan.id} className={`bg-white rounded-[2.5rem] border-2 shadow-sm p-8 relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-2 group ${isPopular ? 'border-blue-500/20 ring-4 ring-blue-500/5' : 'border-transparent'}`}>
              
              {isPopular && (
                <div className="absolute top-6 -right-12 bg-blue-600 text-white text-[9px] font-black uppercase tracking-[0.2em] px-12 py-1.5 rotate-45 shadow-lg">
                  Best Value
                </div>
              )}

              <div className="mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner ${isGym ? 'bg-slate-100 text-slate-900' : 'bg-blue-50 text-blue-600'}`}>
                  <i className={`fas ${isGym ? 'fa-dumbbell' : 'fa-bolt'} text-xl`}></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-2">{plan.name}</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">
                   {plan.type.replace('_', ' ')}
                </span>
              </div>

              <div className="mb-10 flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">{formatCurrency(plan.price).replace('₹', '')}</span>
                <span className="text-slate-400 font-bold text-sm uppercase tracking-widest">/ {plan.durationDays} Days</span>
              </div>

              <ul className="space-y-4 mb-10">
                 <li className="flex items-center gap-3 text-xs font-bold text-slate-600">
                    <i className="fas fa-check-circle text-green-500"></i> Full Equipment Access
                 </li>
                 {plan.type === PlanType.PT && (
                   <li className="flex items-center gap-3 text-xs font-bold text-indigo-600">
                      <i className="fas fa-user-tie"></i> Dedicated Expert Coach
                   </li>
                 )}
                 <li className="flex items-center gap-3 text-xs font-bold text-slate-600">
                    <i className="fas fa-check-circle text-green-500"></i> Free Locker Usage
                 </li>
              </ul>

              <button 
                onClick={() => initiateCheckout(plan)}
                className={`w-full py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95 ${isGym ? 'bg-slate-900 text-white hover:bg-black shadow-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'}`}
              >
                Join Now
              </button>
            </div>
          );
        })}
      </div>

      {selectedPlanForCheckout && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[400px] rounded-3xl overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <div style={{ backgroundColor: branding.color }} className="p-6 text-white flex justify-between items-start">
               <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg">{userBranch?.name || 'Speed Fitness'}</span>
                    <i className={`fas ${branding.icon} text-[10px] text-white/70`}></i>
                  </div>
                  <p className="text-[11px] text-white/80 font-medium tracking-tight uppercase">Checkout via {branding.name}</p>
               </div>
               <button 
                onClick={() => {
                  setSelectedPlanForCheckout(null);
                  setAssignedTrainerId('');
                  setStartDate(new Date().toISOString().split('T')[0]);
                }}
                className="bg-black/10 hover:bg-black/20 p-2 rounded-lg transition-colors"
               >
                 <i className="fas fa-times"></i>
               </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase">Amount to pay</span>
                <span className="text-xl font-black text-slate-900">{formatCurrency(selectedPlanForCheckout.price)}</span>
              </div>

              {/* Trainer Assignment for PT/Group */}
              {(selectedPlanForCheckout.type === PlanType.PT || selectedPlanForCheckout.type === PlanType.GROUP) && (
                <div className="space-y-3 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Assign Expert Coach</label>
                  <select 
                    required 
                    className="w-full p-4 bg-white border border-indigo-100 rounded-xl outline-none font-bold text-xs uppercase"
                    value={assignedTrainerId}
                    onChange={e => setAssignedTrainerId(e.target.value)}
                  >
                    <option value="">Select a Trainer...</option>
                    {branchTrainers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <p className="text-[9px] text-indigo-400 font-bold uppercase text-center mt-1">Required for package activation</p>
                </div>
              )}

              {/* Start Date Selection */}
              <div className="space-y-3 p-5 bg-green-50/50 rounded-2xl border border-green-100/50">
                <label className="text-[10px] font-black text-green-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <i className="fas fa-calendar-alt"></i> Membership Start Date
                </label>
                <input 
                  type="date" 
                  required
                  className="w-full p-4 bg-white border border-green-100 rounded-xl outline-none font-bold text-sm"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                <p className="text-[9px] text-green-500 font-bold uppercase text-center mt-1">Plan will start from this date</p>
              </div>

              <div className="space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Options</p>
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                       onClick={() => setSelectedMethod('UPI')}
                       className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 relative transition-all ${selectedMethod === 'UPI' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                    >
                       <i className={`fas fa-university ${selectedMethod === 'UPI' ? 'text-blue-600' : 'text-slate-400'}`}></i>
                       <span className="text-[10px] font-bold text-slate-700">UPI Apps</span>
                    </button>
                    <button 
                       onClick={() => setSelectedMethod('CARD')}
                       className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 relative transition-all ${selectedMethod === 'CARD' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                    >
                       <i className={`fas fa-credit-card ${selectedMethod === 'CARD' ? 'text-blue-600' : 'text-slate-400'}`}></i>
                       <span className="text-[10px] font-bold text-slate-700">Credit/Debit</span>
                    </button>
                 </div>
              </div>

              <button 
                onClick={handleProceedToPayment}
                disabled={isProcessing}
                style={{ backgroundColor: branding.color }}
                className="w-full py-5 text-white rounded-2xl font-black text-sm uppercase tracking-[0.1em] shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                {isProcessing ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin"></i>
                    PROCESSING...
                  </>
                ) : (
                  `Pay ${formatCurrency(selectedPlanForCheckout.price)}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Razorpay Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPendingPlan(null);
        }}
        amount={pendingPlan?.price || 0}
        description={pendingPlan ? `Purchase ${pendingPlan.name} - ${pendingPlan.type.replace('_', ' ')}` : 'Plan Purchase'}
        customerName={currentUser.name}
        customerEmail={currentUser.email}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default MembershipStore;
