
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../AppContext';

const Register: React.FC = () => {
  const { branches, plans, enrollMember, showToast } = useAppContext();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    branchId: '',
    planId: '',
    emergencyContact: '',
    address: '',
    password: '',
    confirmPassword: ''
  });

  const selectedBranchPlans = plans.filter(p => p.branchId === formData.branchId && p.isActive);

  const handleNextStep = () => {
    if (step === 1 && !formData.branchId) {
      showToast("Please select a branch to continue.", "error");
      return;
    }
    if (step === 2 && !formData.planId) {
      showToast("Please select a plan to continue.", "error");
      return;
    }
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      showToast("Security Tokens do not match.", "error");
      return;
    }

    if (formData.password.length < 6) {
      showToast("Token must be at least 6 characters.", "error");
      return;
    }

    setIsSubmitting(true);
    
    try {
      await enrollMember({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        branchId: formData.branchId,
        emergencyContact: formData.emergencyContact,
        address: formData.address
      }, formData.planId, undefined, formData.password);
      
      showToast("Athlete Account Created! Redirecting to Login...", "success");
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      showToast("Registration failed. Please try again.", "error");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[150px]"></div>
      </div>

      <div className="w-full max-w-2xl bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-white/5 relative z-10 animate-[fadeIn_0.5s_ease-out]">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-800 flex">
          <div className={`h-full bg-blue-500 transition-all duration-500 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`}></div>
        </div>

        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="bg-blue-600 p-2 rounded-xl">
                <i className="fas fa-dumbbell text-white text-xl"></i>
              </div>
              <span className="font-black text-xl text-white tracking-tighter uppercase">IronFlow</span>
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Start Your Journey</h2>
            <p className="text-slate-400 font-medium text-sm mt-2">Step {step} of 3: {step === 1 ? 'Choose Location' : step === 2 ? 'Select Plan' : 'Account & Access'}</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Branch Selection */}
            {step === 1 && (
              <div className="space-y-4 animate-[slideUp_0.3s_ease-out]">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-6">Where will you be training?</p>
                <div className="grid grid-cols-1 gap-4">
                  {branches.map(branch => (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => setFormData({...formData, branchId: branch.id, planId: ''})}
                      className={`p-6 rounded-3xl border-2 text-left transition-all ${formData.branchId === branch.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-800/50 hover:border-slate-700'}`}
                    >
                      <h4 className={`font-black text-lg ${formData.branchId === branch.id ? 'text-white' : 'text-slate-300'}`}>{branch.name}</h4>
                      <p className="text-xs text-slate-500 mt-1"><i className="fas fa-map-marker-alt mr-2"></i>{branch.address}</p>
                    </button>
                  ))}
                </div>
                <div className="pt-8">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-xl active:scale-[0.98]"
                  >
                    Continue to Plans
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Plan Selection */}
            {step === 2 && (
              <div className="space-y-4 animate-[slideUp_0.3s_ease-out]">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-6">Select your initial membership</p>
                <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                  {selectedBranchPlans.map(plan => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setFormData({...formData, planId: plan.id})}
                      className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden ${formData.planId === plan.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-800/50 hover:border-slate-700'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className={`font-black text-lg ${formData.planId === plan.id ? 'text-white' : 'text-slate-300'}`}>{plan.name}</h4>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">{plan.type} • {plan.durationDays} Days</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-white">₹{plan.price}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {selectedBranchPlans.length === 0 && (
                    <div className="text-center py-10">
                      <p className="text-slate-500 font-bold">No active plans available for this branch.</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-8">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="py-5 bg-slate-800 text-slate-400 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="py-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl active:scale-[0.98]"
                  >
                    Final Step
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Detailed Info & Security */}
            {step === 3 && (
              <div className="space-y-6 animate-[slideUp_0.3s_ease-out]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                    <input required className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-2xl outline-none focus:border-blue-500 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Arjun Sharma" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contact Phone</label>
                    <input required type="tel" className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-2xl outline-none focus:border-blue-500 transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+91 XXXXX XXXXX" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                  <input required type="email" className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-2xl outline-none focus:border-blue-500 transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="athlete@ironflow.in" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Choose Security Token</label>
                      <div className="relative">
                        <input 
                          required 
                          type={showPassword ? "text" : "password"} 
                          className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-2xl outline-none focus:border-blue-500 transition-all" 
                          value={formData.password} 
                          onChange={e => setFormData({...formData, password: e.target.value})} 
                          placeholder="Min. 6 chars" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                          <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Confirm Token</label>
                      <input 
                        required 
                        type={showPassword ? "text" : "password"} 
                        className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-2xl outline-none focus:border-blue-500 transition-all" 
                        value={formData.confirmPassword} 
                        onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
                        placeholder="Re-enter token" 
                      />
                   </div>
                </div>

                <div className="space-y-1 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                  <label className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <i className="fas fa-life-ring"></i> Emergency Contact
                  </label>
                  <input required className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-red-500 transition-all" value={formData.emergencyContact} onChange={e => setFormData({...formData, emergencyContact: e.target.value})} placeholder="Name & Phone" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={isSubmitting}
                    className="py-5 bg-slate-800 text-slate-400 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check-circle"></i>}
                    {isSubmitting ? 'SECURING...' : 'JOIN IRONFLOW'}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-500 text-xs font-bold">
              Already a member? <Link to="/login" className="text-blue-400 hover:underline">Log in to Portal</Link>
            </p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Register;
