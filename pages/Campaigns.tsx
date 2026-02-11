
import React, { useState, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { Offer } from '../types';

const Campaigns: React.FC = () => {
  const { offers, addOffer, deleteOffer, branches, currentUser, showToast } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    expiryDate: '',
    branchId: currentUser?.branchId || 'GLOBAL',
    ctaText: 'CLAIM OFFER'
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      showToast("Please upload an offer graphic!", "error");
      return;
    }
    const newOffer: Offer = {
      id: `offer-${Date.now()}`,
      isActive: true,
      ...formData
    };
    addOffer(newOffer);
    setIsModalOpen(false);
    setFormData({ title: '', description: '', imageUrl: '', expiryDate: '', branchId: currentUser?.branchId || 'GLOBAL', ctaText: 'CLAIM OFFER' });
    showToast("Campaign broadcasted successfully!");
  };

  const filteredOffers = currentUser?.role === 'SUPER_ADMIN' 
    ? offers 
    : offers.filter(o => o.branchId === 'GLOBAL' || o.branchId === currentUser?.branchId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Campaign Manager</h2>
          <p className="text-slate-500 font-medium">Broadcast offers and graphics to your members</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs tracking-widest uppercase shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-3"
        >
          <i className="fas fa-plus-circle"></i> Create Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredOffers.length === 0 ? (
          <div className="col-span-full py-20 bg-white rounded-[3rem] border border-dashed flex flex-col items-center justify-center text-slate-300">
             <i className="fas fa-bullhorn text-5xl mb-4 opacity-10"></i>
             <p className="font-bold uppercase tracking-widest text-xs">No active campaigns running</p>
          </div>
        ) : (
          filteredOffers.map(offer => (
            <div key={offer.id} className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all">
               <div className="aspect-[16/9] relative overflow-hidden bg-slate-100">
                  <img src={offer.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                  <div className="absolute top-4 right-4 flex gap-2">
                     <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${offer.branchId === 'GLOBAL' ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'}`}>
                        {offer.branchId === 'GLOBAL' ? 'GLOBAL' : 'BRANCH ONLY'}
                     </span>
                  </div>
               </div>
               <div className="p-8 flex-1 flex flex-col">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">{offer.title}</h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6 line-clamp-2">{offer.description}</p>
                  
                  <div className="mt-auto space-y-4">
                     <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-t pt-4">
                        <span>Expires: {offer.expiryDate}</span>
                        <button 
                          onClick={() => deleteOffer(offer.id)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <i className="fas fa-trash-alt mr-1"></i> End Campaign
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl animate-[slideUp_0.3s_ease-out] overflow-hidden">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
               <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-1">New Broadcast</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Designing member experience</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-colors">
                  <i className="fas fa-times"></i>
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campaign Title</label>
                     <input required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Monsoon Fit Sale" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry Date</label>
                     <input type="date" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Offer Graphic (Banner)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[21/9] border-4 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-blue-200 hover:bg-slate-50 transition-all relative overflow-hidden"
                  >
                     {formData.imageUrl ? (
                        <img src={formData.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                     ) : (
                        <>
                           <i className="fas fa-image text-4xl text-slate-200 mb-2"></i>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select PNG/JPG (1200x500px recommended)</p>
                        </>
                     )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
               </div>

               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detailed Description</label>
                  <textarea required rows={3} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Explain the offer terms and benefits..." />
               </div>

               <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Audience</label>
                     <select className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold text-xs" value={formData.branchId} onChange={e => setFormData({...formData, branchId: e.target.value})}>
                        <option value="GLOBAL">All Branches (Global)</option>
                        {branches.map(b => (
                           <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                     </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Button Text</label>
                     <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={formData.ctaText} onChange={e => setFormData({...formData, ctaText: e.target.value})} placeholder="e.g. VIEW DETAILS" />
                  </div>
               </div>

               <button className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                  Launch Campaign Broadcast
               </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default Campaigns;
