
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { Branch } from '../types';
import { QRCodeSVG } from 'qrcode.react';

const Branches: React.FC = () => {
  const { branches, users, sales, addBranch, updateBranch, currentUser } = useAppContext();
  const [isModalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    address: '', 
    phone: '', 
    email: '',
    gstin: '',
    gstPercentage: 18,
    gateWebhookUrl: '',
    paymentProvider: 'RAZORPAY' as 'RAZORPAY' | 'STRIPE' | 'PAYTM',
    paymentApiKey: '',
    paymentMerchantId: '',
    emailProvider: 'SENDGRID' as 'SENDGRID' | 'MAILGUN' | 'SMTP',
    emailApiKey: '',
    emailFromAddress: '',
    smsProvider: 'TWILIO' as 'TWILIO' | 'MSG91' | 'GUPSHUP',
    smsApiKey: '',
    smsSenderId: '',
    equipment: ''
  });

  const getBranchStats = (branchId: string) => {
    const memberCount = users.filter(u => u.branchId === branchId && u.role === 'MEMBER').length;
    const revenue = sales.filter(s => s.branchId === branchId).reduce((acc, s) => acc + s.amount, 0);
    return { memberCount, revenue };
  };

  const handleOpenAdd = () => {
    setSelectedBranch(null);
    setFormData({ 
      name: '', 
      address: '', 
      phone: '', 
      email: '', 
      gstin: '', 
      gstPercentage: 18, 
      gateWebhookUrl: '',
      paymentProvider: 'RAZORPAY',
      paymentApiKey: '',
      paymentMerchantId: '',
      emailProvider: 'SENDGRID',
      emailApiKey: '',
      emailFromAddress: '',
      smsProvider: 'TWILIO',
      smsApiKey: '',
      smsSenderId: '',
      equipment: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setFormData({ 
      name: branch.name, 
      address: branch.address, 
      phone: branch.phone, 
      email: branch.email,
      gstin: branch.gstin || '',
      gstPercentage: branch.gstPercentage || 18,
      gateWebhookUrl: branch.gateWebhookUrl || '',
      paymentProvider: branch.paymentProvider || 'RAZORPAY',
      paymentApiKey: branch.paymentApiKey || '',
      paymentMerchantId: branch.paymentMerchantId || '',
      emailProvider: branch.emailProvider || 'SENDGRID',
      emailApiKey: branch.emailApiKey || '',
      emailFromAddress: branch.emailFromAddress || '',
      smsProvider: branch.smsProvider || 'TWILIO',
      smsApiKey: branch.smsApiKey || '',
      smsSenderId: branch.smsSenderId || '',
      equipment: branch.equipment || ''
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBranch) {
      updateBranch(selectedBranch.id, formData);
    } else {
      addBranch({
        id: `b-${Date.now()}`,
        ...formData
      });
    }
    setModalOpen(false);
  };

  const currentActiveBranch = branches.find(b => b.id === activeBranchId);

  const paymentPlaceholders = (() => {
    switch (formData.paymentProvider) {
      case 'RAZORPAY': return { secret: 'Razorpay Key Secret', key: 'Razorpay Key ID (e.g. rzp_test_...)' };
      case 'STRIPE': return { secret: 'Stripe Secret Key (sk_...)', key: 'Stripe Publishable Key (pk_...)' };
      case 'PAYTM': return { secret: 'Merchant Key', key: 'Merchant ID (MID)' };
      default: return { secret: 'Gateway API Key / Secret', key: 'Merchant ID / Public Key' };
    }
  })();

  const emailPlaceholders = (() => {
    switch (formData.emailProvider) {
      case 'SENDGRID': return { key: 'SendGrid API Key (starts with SG...)', from: 'Verified Sender Email' };
      case 'MAILGUN': return { key: 'Private API Key', from: 'Sender Address (e.g. hello@mg.yourdomain.com)' };
      case 'SMTP': return { key: 'SMTP Password', from: 'SMTP Username / Email' };
      default: return { key: 'Email API Key / Password', from: 'From Address (e.g. gym@branch.com)' };
    }
  })();

  const smsPlaceholders = (() => {
    switch (formData.smsProvider) {
      case 'TWILIO': return { key: 'Auth Token', sender: 'Twilio Phone Number' };
      case 'MSG91': return { key: 'Auth Key', sender: 'Sender ID (6 chars, e.g. IRNFLW)' };
      case 'GUPSHUP': return { key: 'API Key / Password', sender: 'Sender ID / Mask' };
      default: return { key: 'SMS API Key / Auth Token', sender: 'Sender ID / From Number' };
    }
  })();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Branch Network</h2>
          <p className="text-gray-50">Infrastructure & Multi-Channel Gateway Management</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <i className="fas fa-plus"></i> NEW BRANCH
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map(branch => {
          const stats = getBranchStats(branch.id);
          return (
            <div key={branch.id} className="bg-white rounded-3xl border shadow-sm p-6 hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center">
                  <i className="fas fa-building text-xl"></i>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded mb-1">ONLINE</span>
                  <div className="flex gap-1">
                    <span className="text-[7px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{branch.paymentProvider || 'NO PAY'}</span>
                    <span className="text-[7px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{branch.emailProvider || 'NO EMAIL'}</span>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900">{branch.name}</h3>
              <p className="text-xs text-gray-400 mb-6 line-clamp-1">
                <i className="fas fa-map-marker-alt mr-1"></i> {branch.address}
              </p>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 mb-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Members</p>
                  <p className="text-lg font-black text-gray-900">{stats.memberCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Revenue</p>
                  <p className="text-lg font-black text-blue-600">₹{stats.revenue.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenEdit(branch)}
                  className="flex-1 py-3 bg-gray-50 text-gray-500 rounded-xl font-bold text-[10px] hover:bg-gray-100 transition-colors uppercase tracking-widest"
                >
                  Configure
                </button>
                <button 
                  onClick={() => { setActiveBranchId(branch.id); setQrModalOpen(true); }}
                  className="px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-[10px] hover:bg-black transition-colors uppercase tracking-widest flex items-center gap-2"
                >
                  <i className="fas fa-qrcode"></i> Check-in QR
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {qrModalOpen && currentActiveBranch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-[slideUp_0.3s_ease-out] text-center">
             <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-qrcode text-3xl text-slate-900"></i>
             </div>
             <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Gate Entry QR</h3>
             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">{currentActiveBranch.name}</p>
             
             <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-50 shadow-inner flex items-center justify-center mb-8">
                <QRCodeSVG 
                  value={currentActiveBranch.id} 
                  size={200}
                  level="H"
                  includeMargin={true}
                />
             </div>

             <p className="text-[10px] text-slate-400 font-medium px-6 mb-8 uppercase tracking-widest">Members & Staff should scan this code using the IronFlow App Scanner to record attendance.</p>
             
             <button 
               onClick={() => setQrModalOpen(false)}
               className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all uppercase tracking-widest shadow-xl"
             >
               Close QR Display
             </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-[slideUp_0.3s_ease-out] overflow-y-auto max-h-[90vh] scrollbar-hide">
            <h3 className="text-2xl font-bold mb-6 tracking-tight uppercase">{selectedBranch ? 'Update Branch' : 'Register New Branch'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <section className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-info-circle text-blue-500"></i> Identity & Location
                </label>
                <input required placeholder="Branch Name" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input required placeholder="Address" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <input required placeholder="Phone" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  <input required type="email" placeholder="Branch Public Email" className="w-full p-3 bg-gray-50 border rounded-xl outline-none text-xs" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </section>

              <section className="space-y-3 pt-6 border-t">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-dumbbell"></i> Gym Equipment Inventory
                </label>
                <p className="text-[9px] text-slate-400 italic">List machines and free weights here. AI Coach uses this for member plans.</p>
                <textarea 
                  rows={4}
                  placeholder="e.g. 5 Treadmills, Smith Machine, Dumbbells (2-40kg), Leg Press, Cable Crossover..."
                  className="w-full p-4 bg-blue-50/30 border border-blue-100 rounded-2xl outline-none text-xs font-medium"
                  value={formData.equipment}
                  onChange={e => setFormData({...formData, equipment: e.target.value})}
                ></textarea>
              </section>

              <section className="space-y-3 pt-6 border-t">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-envelope-open-text"></i> Email Infrastructure
                </label>
                <select className="w-full p-3 bg-gray-50 border rounded-xl outline-none text-xs font-bold" value={formData.emailProvider} onChange={e => setFormData({...formData, emailProvider: e.target.value as any})}>
                  <option value="SENDGRID">SendGrid</option>
                  <option value="MAILGUN">Mailgun</option>
                  <option value="SMTP">Custom SMTP</option>
                </select>
                <input placeholder={emailPlaceholders.key} className="w-full p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl outline-none text-xs font-mono" value={formData.emailApiKey} onChange={e => setFormData({...formData, emailApiKey: e.target.value})} />
                <input placeholder={emailPlaceholders.from} className="w-full p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl outline-none text-xs font-mono" value={formData.emailFromAddress} onChange={e => setFormData({...formData, emailFromAddress: e.target.value})} />
              </section>

              <section className="space-y-3 pt-6 border-t">
                <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-sms"></i> SMS Gateway
                </label>
                <select className="w-full p-3 bg-gray-50 border rounded-xl outline-none text-xs font-bold" value={formData.smsProvider} onChange={e => setFormData({...formData, smsProvider: e.target.value as any})}>
                  <option value="TWILIO">Twilio</option>
                  <option value="MSG91">Msg91 (India)</option>
                  <option value="GUPSHUP">Gupshup</option>
                </select>
                <input placeholder={smsPlaceholders.key} className="w-full p-3 bg-orange-50/50 border border-orange-100 rounded-xl outline-none text-xs font-mono" value={formData.smsApiKey} onChange={e => setFormData({...formData, smsApiKey: e.target.value})} />
                <input placeholder={smsPlaceholders.sender} className="w-full p-3 bg-orange-50/50 border border-orange-100 rounded-xl outline-none text-xs font-mono" value={formData.smsSenderId} onChange={e => setFormData({...formData, smsSenderId: e.target.value})} />
              </section>

              <section className="space-y-3 pt-6 border-t">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-credit-card"></i> Payment Gateway
                </label>
                <select className="w-full p-3 bg-gray-50 border rounded-xl outline-none text-xs font-bold" value={formData.paymentProvider} onChange={e => setFormData({...formData, paymentProvider: e.target.value as any})}>
                  <option value="RAZORPAY">Razorpay (India)</option>
                  <option value="STRIPE">Stripe (Global)</option>
                  <option value="PAYTM">Paytm (India)</option>
                </select>
                <input placeholder={paymentPlaceholders.secret} className="w-full p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl outline-none text-xs font-mono" value={formData.paymentApiKey} onChange={e => setFormData({...formData, paymentApiKey: e.target.value})} />
                <input placeholder={paymentPlaceholders.key} className="w-full p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl outline-none text-xs font-mono" value={formData.paymentMerchantId} onChange={e => setFormData({...formData, paymentMerchantId: e.target.value})} />
              </section>

              <div className="pt-6">
                <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-black shadow-xl shadow-slate-100 transition-all uppercase tracking-tighter">
                  {selectedBranch ? 'Sync Branch Overrides' : 'Deploy Branch Environment'}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors uppercase text-[10px] tracking-[0.2em]">CANCEL</button>
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

export default Branches;
