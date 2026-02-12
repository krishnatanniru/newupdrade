
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { PlanType, SubscriptionStatus, Feedback, Sale, BodyMetric, Offer } from '../types';
import InvoiceModal from '../components/InvoiceModal';

const TERMS_CONTENT = (
  <div className="prose prose-slate max-w-none space-y-6 text-sm text-slate-600 leading-relaxed font-medium">
    <section>
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">1. Health and Safety Disclaimer</h4>
      <p>By using IronFlow facilities, you acknowledge that physical exercise carries inherent risks. You represent that you are in good physical condition and have no medical reason that would prevent you from using the equipment. Always consult a physician before starting a new program.</p>
    </section>
    <section>
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">2. AI Coaching and Personal Data</h4>
      <p>The "Smart AI Coach" utilizes Google Gemini. AI-generated workouts are for informational purposes only. You are responsible for executing exercises with proper form. IronFlow logs metrics (weight, goals) to provide a personalized experience.</p>
    </section>
    <section>
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">3. Membership Rules</h4>
      <p>Your unique QR Gate Key (IF-ID) is non-transferable. Sharing credentials results in immediate suspension. Members must follow gym etiquette and re-rack weights after use.</p>
    </section>
    <section>
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">4. Liability Waiver</h4>
      <p>IronFlow Gym shall not be liable for any injury, loss, or damage to person or property arising out of the use of gym facilities or participation in training sessions.</p>
    </section>
  </div>
);

const MemberPortal: React.FC = () => {
  const { currentUser, subscriptions, plans, bookings, addFeedback, feedback, showToast, updateUser, sales, branches, askGemini, metrics, addMetric, offers, users } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'COACH' | 'METRICS' | 'FEEDBACK'>('OVERVIEW');
  const [feedbackType, setFeedbackType] = useState<'SUGGESTION' | 'COMPLAINT'>('SUGGESTION');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [workoutGoal, setWorkoutGoal] = useState<'FAT_LOSS' | 'MUSCLE_GAIN' | 'GENERAL_FITNESS'>('FAT_LOSS');
  const [workoutLevel, setWorkoutLevel] = useState<'NEWBIE' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('NEWBIE');
  const [trainingWeek, setTrainingWeek] = useState<number>(1);
  const [generatedWorkout, setGeneratedWorkout] = useState<any>(null);
  const [isGeneratingWorkout, setIsGeneratingWorkout] = useState(false);

  const [weight, setWeight] = useState('');
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  if (!currentUser || currentUser.role !== 'MEMBER') {
    return <div className="p-8 text-center text-red-500 font-bold">Access restricted to members only.</div>;
  }

  const currentBranch = branches.find(b => b.id === currentUser.branchId);
  const equipmentList = currentBranch?.equipment || "Bodyweight exercises only.";

  const getTermsContent = () => {
    if (currentBranch?.termsAndConditions) {
      return (
        <div className="prose prose-slate max-w-none space-y-6 text-sm text-slate-600 leading-relaxed font-medium">
          <div dangerouslySetInnerHTML={{ __html: currentBranch.termsAndConditions.replace(/\n/g, '<br />') }} />
        </div>
      );
    }
    return TERMS_CONTENT; // fallback to default terms
  };

  const handleAcceptTerms = () => {
    if (!agreedToTerms) {
      showToast('Please confirm your agreement by checking the box.', 'error');
      return;
    }
    updateUser(currentUser.id, { hasAcceptedTerms: true });
    showToast('Agreement Signed. Welcome to IronFlow Portal!', 'success');
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 20) setHasScrolledToBottom(true);
  };

  const activeOffers = offers.filter(o => o.isActive && (o.branchId === 'GLOBAL' || o.branchId === currentUser.branchId));

  if (!currentUser.hasAcceptedTerms) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-2 animate-[fadeIn_0.5s_ease-out]">
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
           <div className="bg-slate-900 p-8 text-white">
              <div className="flex items-center gap-4 mb-4">
                 <div className="bg-blue-600 p-3 rounded-2xl shrink-0">
                    <i className="fas fa-file-contract text-xl md:text-2xl"></i>
                 </div>
                 <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight">Portal Activation</h2>
              </div>
              <p className="text-slate-400 text-xs md:text-sm font-medium">Review and sign the membership agreement to proceed.</p>
           </div>
           
           <div className="p-6 md:p-10 max-h-[350px] overflow-y-auto bg-slate-50/50 border-b border-slate-100" onScroll={handleScroll}>
              {getTermsContent()}
           </div>

           <div className="p-8 md:p-10 bg-white">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                 <label className="flex items-center gap-4 cursor-pointer group">
                    <input type="checkbox" className="w-6 h-6 rounded-lg border-2 border-slate-200 text-blue-600 transition-all cursor-pointer shrink-0" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} />
                    <span className="text-xs md:text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors leading-tight">I accept the terms and liability waiver</span>
                 </label>
                 <button onClick={handleAcceptTerms} className={`w-full md:w-auto px-12 py-4 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition-all shadow-xl ${agreedToTerms ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                    ACTIVATE
                 </button>
              </div>
           </div>
        </div>
      </div>
    );
  }

  const memberSubs = subscriptions.filter(s => s.memberId === currentUser.id);
  const memberSales = sales.filter(s => s.memberId === currentUser.id);
  const myMetrics = metrics.filter(m => m.memberId === currentUser.id);

  const handleAskAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    const context = `User: ${currentUser.name}. Branch: ${currentBranch?.name}. Available Equipment: ${equipmentList}.`;
    const response = await askGemini(`${context}\nUser question: ${aiPrompt}`);
    setAiResponse(response);
    setIsAiLoading(false);
  };

  const handleGenerateSmartWorkout = async () => {
    setIsGeneratingWorkout(true);
    const prompt = `Elite Coach: Create a plan for Goal: ${workoutGoal}, Level: ${workoutLevel}, Week: ${trainingWeek}. Available Equipment: ${equipmentList}. Format as Markdown.`;
    const response = await askGemini(prompt, 'pro');
    setGeneratedWorkout(response);
    setIsGeneratingWorkout(false);
  };

  const handleAddMetric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) return;
    addMetric({ id: `m-${Date.now()}`, memberId: currentUser.id, date: new Date().toISOString().split('T')[0], weight: Number(weight) });
    setWeight('');
    showToast('Weight Logged!', 'success');
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent.trim()) return;
    setIsSubmitting(true);
    const newFeedback: Feedback = { id: `fb-${Date.now()}`, memberId: currentUser.id, branchId: currentUser.branchId || 'b1', type: feedbackType, content: feedbackContent, status: 'NEW', date: new Date().toISOString().split('T')[0] };
    setTimeout(() => { addFeedback(newFeedback); setFeedbackContent(''); setIsSubmitting(false); showToast('Message Sent!', 'success'); }, 800);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out]">
      
      {/* Offers Billboard - Ultra Responsive */}
      {activeOffers.length > 0 && (
        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 shadow-2xl">
           <div className="relative w-full min-h-[220px] md:min-h-0 aspect-[16/9] md:aspect-[21/7]">
              <img src={activeOffers[0].imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-[4s]" alt="" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent"></div>
              <div className="absolute inset-0 p-6 md:p-12 flex flex-col justify-center max-w-2xl">
                 <div className="mb-4">
                    <span className="bg-blue-600 text-white text-[8px] md:text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                      {activeOffers[0].branchId === 'GLOBAL' ? 'GLOBAL ACCESS' : 'EXCLUSIVE'}
                    </span>
                 </div>
                 <h2 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tighter leading-tight mb-4">{activeOffers[0].title}</h2>
                 <p className="text-slate-300 text-xs md:text-base font-medium leading-relaxed mb-6 line-clamp-2 opacity-90">{activeOffers[0].description}</p>
                 <button 
                   onClick={() => showToast(`Offer Claimed: ${activeOffers[0].title}`)}
                   className="bg-white text-slate-950 w-fit px-8 py-4 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95 shadow-xl"
                 >
                   {activeOffers[0].ctaText || 'CLAIM NOW'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
           <img src={currentUser.avatar} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-4 border-blue-500/30 shadow-2xl shrink-0" alt="" />
           <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                 <h1 className="text-xl md:text-3xl font-black tracking-tight uppercase truncate">{currentUser.name}</h1>
                 <span className="w-fit mx-auto md:mx-0 bg-green-500/10 text-green-400 text-[8px] font-black px-2 py-0.5 rounded border border-green-500/20 uppercase tracking-widest">ATHLETE</span>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-4 mt-4 overflow-x-auto scrollbar-hide pb-2">
                 {['OVERVIEW', 'COACH', 'METRICS', 'FEEDBACK'].map(tab => (
                   <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)} 
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                   >
                     {tab}
                   </button>
                 ))}
              </div>
           </div>
           <div className="shrink-0 hidden sm:block">
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-white/5 text-center min-w-[100px]">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">ID KEY</p>
                <i className="fas fa-qrcode text-2xl text-white mb-1"></i>
                <p className="text-[10px] font-mono font-bold text-slate-300">{currentUser.memberId}</p>
              </div>
           </div>
        </div>
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 animate-[slideUp_0.4s_ease-out]">
            <div className="lg:col-span-1 space-y-6 md:space-y-8">
              <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border shadow-sm">
                <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight mb-6">
                  <i className="fas fa-ticket-alt text-blue-500"></i> Active Subscriptions
                </h3>
                <div className="space-y-4">
                  {memberSubs.map(sub => {
                    const plan = plans.find(p => p.id === sub.planId);
                    return (
                      <div key={sub.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-black text-slate-900 text-[10px] md:text-xs uppercase truncate max-w-[150px]">{plan?.name}</h4>
                          <span className="bg-green-100 text-green-700 text-[8px] font-black px-2 py-0.5 rounded-md">ACTIVE</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Until: {sub.endDate}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border shadow-sm">
                <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight mb-6">
                  <i className="fas fa-receipt text-green-500"></i> Recent Billing
                </h3>
                <div className="space-y-3">
                  {memberSales.slice(0, 3).map(sale => (
                    <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-700 truncate">{plans.find(p => p.id === sale.planId)?.name || 'Retail'}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase">{sale.date}</p>
                      </div>
                      <span className="text-xs font-black text-slate-900 shrink-0 ml-2">{formatCurrency(sale.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
               <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 md:p-10 rounded-[2.5rem] shadow-xl h-full">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md shrink-0">
                        <i className="fas fa-sparkles text-lg"></i>
                     </div>
                     <h3 className="text-lg md:text-xl font-black uppercase tracking-tight">AI Coaching Desk</h3>
                  </div>
                  <div className="space-y-4 h-full">
                     <div className="relative">
                        <textarea 
                          className="w-full p-5 bg-white/10 border border-white/20 rounded-2xl outline-none focus:ring-4 focus:ring-white/10 text-sm font-medium placeholder:text-blue-200" 
                          rows={3} 
                          placeholder="What should I train today with the equipment here?" 
                          value={aiPrompt} 
                          onChange={e => setAiPrompt(e.target.value)}
                        />
                        <button onClick={handleAskAI} disabled={isAiLoading || !aiPrompt.trim()} className="absolute right-3 bottom-3 bg-white text-blue-600 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                          {isAiLoading ? <i className="fas fa-circle-notch fa-spin"></i> : 'ASK COACH'}
                        </button>
                     </div>
                     {aiResponse && (
                       <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl animate-[fadeIn_0.5s_ease-out] overflow-y-auto max-h-[300px]">
                          <div className="text-xs md:text-sm font-medium leading-relaxed whitespace-pre-wrap">{aiResponse}</div>
                       </div>
                     )}
                  </div>
               </div>
            </div>
        </div>
      )}

      {activeTab === 'COACH' && (
        <div className="animate-[slideUp_0.4s_ease-out]">
           {(() => {
              const activeTrainerSub = memberSubs.find(s => s.status === 'ACTIVE' && s.trainerId);
              const trainer = activeTrainerSub ? users.find(u => u.id === activeTrainerSub.trainerId) : null;
              
              if (!trainer) {
                 return (
                    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 text-center">
                       <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <i className="fas fa-user-slash text-slate-300 text-3xl"></i>
                       </div>
                       <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">No Personal Coach</h3>
                       <p className="text-slate-500 font-medium text-sm mb-6">You currently do not have a dedicated personal trainer assigned.</p>
                    </div>
                 );
              }
              return (
                 <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    <img src={trainer.avatar} className="w-32 h-32 rounded-3xl object-cover shadow-2xl" alt="" />
                    <div>
                       <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-3 inline-block">Your Coach</span>
                       <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">{trainer.name}</h2>
                       <p className="text-slate-500 font-medium text-sm mb-6">{trainer.email}</p>
                       <div className="flex gap-4 justify-center md:justify-start">
                          <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100">Message</button>
                       </div>
                    </div>
                 </div>
              );
           })()}
        </div>
      )}

      {activeTab === 'METRICS' && (
        <div className="space-y-6 animate-[slideUp_0.4s_ease-out]">
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3">
                 <i className="fas fa-weight-scale text-emerald-500"></i> Log Progress
              </h3>
              <form onSubmit={handleAddMetric} className="flex gap-4">
                 <input type="number" placeholder="Current Weight (kg)" className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500" value={weight} onChange={e => setWeight(e.target.value)} />
                 <button type="submit" className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all">Log Entry</button>
              </form>
           </div>
           
           <div className="space-y-4">
              {myMetrics.length === 0 ? (
                 <p className="text-center text-slate-400 font-medium py-10">No metrics logged yet. Start tracking today!</p>
              ) : (
                 [...myMetrics].reverse().map(metric => (
                    <div key={metric.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center">
                       <span className="font-bold text-slate-500 text-xs uppercase">{metric.date}</span>
                       <span className="font-black text-xl text-slate-900">{metric.weight} <span className="text-sm text-slate-400">kg</span></span>
                    </div>
                 ))
              )}
           </div>
        </div>
      )}

      {activeTab === 'FEEDBACK' && (
        <div className="space-y-6 animate-[slideUp_0.4s_ease-out]">
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3">
                 <i className="fas fa-comment-dots text-blue-500"></i> Share Your Voice
              </h3>
              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                 <div className="flex gap-2">
                    <button type="button" onClick={() => setFeedbackType('SUGGESTION')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${feedbackType === 'SUGGESTION' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>Suggestion</button>
                    <button type="button" onClick={() => setFeedbackType('COMPLAINT')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${feedbackType === 'COMPLAINT' ? 'bg-red-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>Issue Report</button>
                 </div>
                 <textarea 
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 min-h-[120px]" 
                    placeholder="Tell us how we can improve..."
                    value={feedbackContent}
                    onChange={e => setFeedbackContent(e.target.value)}
                 />
                 <button disabled={isSubmitting || !feedbackContent.trim()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50">
                    {isSubmitting ? 'Sending...' : 'Submit Feedback'}
                 </button>
              </form>
           </div>

           <div className="space-y-4">
              {feedback.filter(f => f.memberId === currentUser.id).length === 0 ? (
                 <p className="text-center text-slate-400 font-medium py-10">You haven't submitted any feedback yet.</p>
              ) : (
                 feedback.filter(f => f.memberId === currentUser.id).reverse().map(f => (
                    <div key={f.id} className="bg-white p-6 rounded-2xl border border-slate-100 space-y-3">
                       <div className="flex justify-between items-center">
                          <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest ${f.type === 'SUGGESTION' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>{f.type}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{f.date}</span>
                       </div>
                       <p className="text-sm font-medium text-slate-700 leading-relaxed">{f.content}</p>
                       <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                          <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest ${f.status === 'NEW' ? 'bg-yellow-50 text-yellow-600' : f.status === 'RESOLVED' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>{f.status}</span>
                       </div>
                    </div>
                 ))
              )}
           </div>
        </div>
      )}

      {viewingSale && (
        <InvoiceModal sale={viewingSale} branch={branches.find(b => b.id === viewingSale.branchId)!} member={currentUser} plan={plans.find(p => p.id === (viewingSale.planId || '')) || { name: 'Retail Store Item', price: viewingSale.amount, durationDays: 0, branchId: viewingSale.branchId, isActive: true, id: '', type: PlanType.GYM }} onClose={() => setViewingSale(null)} />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default MemberPortal;
