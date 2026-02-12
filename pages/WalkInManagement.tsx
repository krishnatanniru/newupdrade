import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, WalkIn } from '../types';

const WalkInManagement: React.FC = () => {
  const { users, currentUser, branches, showToast } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWalkIn, setSelectedWalkIn] = useState<WalkIn | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'NEW' | 'FOLLOW_UP' | 'CONVERTED' | 'NOT_INTERESTED'>('ALL');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    purpose: 'MEMBERSHIP_INQUIRY' as WalkIn['purpose'],
    source: 'WALK_IN' as WalkIn['source'],
    notes: '',
    assignedTo: '',
    followUpDate: ''
  });

  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);

  const staffMembers = users.filter(u => 
    u.role !== UserRole.MEMBER && 
    (currentUser?.role === UserRole.SUPER_ADMIN || u.branchId === currentUser?.branchId)
  );

  const filteredWalkIns = walkIns.filter(w => {
    const matchesStatus = filterStatus === 'ALL' || w.status === filterStatus;
    const matchesBranch = currentUser?.role === UserRole.SUPER_ADMIN || w.branchId === currentUser?.branchId;
    return matchesStatus && matchesBranch;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newWalkIn: WalkIn = {
      id: `walkin-${Date.now()}`,
      ...formData,
      status: 'NEW',
      branchId: currentUser?.branchId || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (selectedWalkIn) {
      setWalkIns(prev => prev.map(w => w.id === selectedWalkIn.id ? { ...w, ...formData, updatedAt: new Date().toISOString() } : w));
      showToast('Walk-in updated successfully');
    } else {
      setWalkIns(prev => [...prev, newWalkIn]);
      showToast('Walk-in registered successfully');
    }
    
    resetForm();
    setIsModalOpen(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      purpose: 'MEMBERSHIP_INQUIRY',
      source: 'WALK_IN',
      notes: '',
      assignedTo: '',
      followUpDate: ''
    });
    setSelectedWalkIn(null);
  };

  const handleEdit = (walkIn: WalkIn) => {
    setSelectedWalkIn(walkIn);
    setFormData({
      name: walkIn.name,
      phone: walkIn.phone,
      email: walkIn.email || '',
      purpose: walkIn.purpose,
      source: walkIn.source,
      notes: walkIn.notes || '',
      assignedTo: walkIn.assignedTo || '',
      followUpDate: walkIn.followUpDate || ''
    });
    setIsModalOpen(true);
  };

  const handleStatusChange = (id: string, newStatus: WalkIn['status']) => {
    setWalkIns(prev => prev.map(w => 
      w.id === id ? { ...w, status: newStatus, updatedAt: new Date().toISOString() } : w
    ));
    showToast(`Status updated to ${newStatus}`);
  };

  const handleConvertToMember = (walkIn: WalkIn) => {
    showToast('Redirecting to member enrollment...');
  };

  const getStatusColor = (status: WalkIn['status']) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-700';
      case 'FOLLOW_UP': return 'bg-amber-100 text-amber-700';
      case 'CONVERTED': return 'bg-green-100 text-green-700';
      case 'NOT_INTERESTED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPurposeLabel = (purpose: WalkIn['purpose']) => {
    const labels: Record<string, string> = {
      MEMBERSHIP_INQUIRY: 'Membership Inquiry',
      TOUR: 'Gym Tour',
      DAY_PASS: 'Day Pass',
      PT_CONSULTATION: 'PT Consultation',
      CLASS_INQUIRY: 'Class Inquiry',
      OTHER: 'Other'
    };
    return labels[purpose] || purpose;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Walk-In Management</h2>
          <p className="text-gray-500">Track visitors and convert leads to members</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <i className="fas fa-plus"></i> Register Walk-In
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'New Leads', count: walkIns.filter(w => w.status === 'NEW').length, color: 'blue' },
          { label: 'Follow-ups', count: walkIns.filter(w => w.status === 'FOLLOW_UP').length, color: 'amber' },
          { label: 'Converted', count: walkIns.filter(w => w.status === 'CONVERTED').length, color: 'green' },
          { label: 'Total', count: walkIns.length, color: 'gray' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl border shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
            <p className={`text-2xl font-black text-${stat.color}-600`}>{stat.count}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['ALL', 'NEW', 'FOLLOW_UP', 'CONVERTED', 'NOT_INTERESTED'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
              filterStatus === status 
                ? 'bg-slate-900 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWalkIns.map(walkIn => (
          <div key={walkIn.id} className="bg-white rounded-2xl border p-6 hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{walkIn.name}</h3>
                <p className="text-sm text-gray-500"><i className="fas fa-phone mr-1"></i> {walkIn.phone}</p>
                {walkIn.email && <p className="text-sm text-gray-500"><i className="fas fa-envelope mr-1"></i> {walkIn.email}</p>}
              </div>
              <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${getStatusColor(walkIn.status)}`}>
                {walkIn.status.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Purpose:</span>
                <span className="font-medium">{getPurposeLabel(walkIn.purpose)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Source:</span>
                <span className="font-medium">{walkIn.source.replace('_', ' ')}</span>
              </div>
              {walkIn.assignedTo && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Assigned:</span>
                  <span className="font-medium">{staffMembers.find(s => s.id === walkIn.assignedTo)?.name || 'Unknown'}</span>
                </div>
              )}
              {walkIn.followUpDate && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Follow-up:</span>
                  <span className={`font-medium ${new Date(walkIn.followUpDate) < new Date() ? 'text-red-600' : ''}`}>
                    {walkIn.followUpDate}
                  </span>
                </div>
              )}
            </div>

            {walkIn.notes && (
              <div className="bg-gray-50 p-3 rounded-xl text-sm text-gray-600 mb-4">
                <i className="fas fa-sticky-note mr-1 text-gray-400"></i> {walkIn.notes}
              </div>
            )}

            <div className="flex gap-2">
              <button 
                onClick={() => handleEdit(walkIn)}
                className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
              >
                EDIT
              </button>
              {walkIn.status !== 'CONVERTED' && (
                <button 
                  onClick={() => handleConvertToMember(walkIn)}
                  className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                >
                  CONVERT
                </button>
              )}
            </div>

            {walkIn.status === 'NEW' && (
              <div className="mt-3 pt-3 border-t">
                <button 
                  onClick={() => handleStatusChange(walkIn.id, 'FOLLOW_UP')}
                  className="w-full py-2 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors"
                >
                  MARK FOR FOLLOW-UP
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredWalkIns.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border">
          <i className="fas fa-walking text-4xl text-gray-300 mb-4"></i>
          <p className="text-gray-500">No walk-ins found</p>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="mt-4 text-blue-600 font-bold text-sm hover:underline"
          >
            Register your first walk-in
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 tracking-tight uppercase">
              {selectedWalkIn ? 'Update Walk-In' : 'Register Walk-In'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone</label>
                <input 
                  required
                  type="tel" 
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email (Optional)</label>
                <input 
                  type="email" 
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Purpose</label>
                <select 
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1"
                  value={formData.purpose}
                  onChange={e => setFormData({...formData, purpose: e.target.value as WalkIn['purpose']})}
                >
                  <option value="MEMBERSHIP_INQUIRY">Membership Inquiry</option>
                  <option value="TOUR">Gym Tour</option>
                  <option value="DAY_PASS">Day Pass</option>
                  <option value="PT_CONSULTATION">PT Consultation</option>
                  <option value="CLASS_INQUIRY">Class Inquiry</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Source</label>
                <select 
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1"
                  value={formData.source}
                  onChange={e => setFormData({...formData, source: e.target.value as WalkIn['source']})}
                >
                  <option value="WALK_IN">Walk-In</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="SOCIAL_MEDIA">Social Media</option>
                  <option value="GOOGLE">Google</option>
                  <option value="JUSTDIAL">JustDial</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Assign To</label>
                <select 
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1"
                  value={formData.assignedTo}
                  onChange={e => setFormData({...formData, assignedTo: e.target.value})}
                >
                  <option value="">-- Select Staff --</option>
                  {staffMembers.map(staff => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Follow-up Date</label>
                <input 
                  type="date" 
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1"
                  value={formData.followUpDate}
                  onChange={e => setFormData({...formData, followUpDate: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notes</label>
                <textarea 
                  rows={3}
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none mt-1 resize-none"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <div className="pt-4 space-y-3">
                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors"
                >
                  {selectedWalkIn ? 'Update' : 'Register'}
                </button>
                <button 
                  type="button"
                  onClick={() => { resetForm(); setIsModalOpen(false); }}
                  className="w-full py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                >
                  Cancel
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
      `}</style>
    </div>
  );
};

export default WalkInManagement;
