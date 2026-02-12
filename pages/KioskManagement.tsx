import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole } from '../types';

const KioskManagement: React.FC = () => {
  const { currentUser, kiosks, addKiosk, updateKiosk, deleteKiosk, branches } = useAppContext();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    branchId: currentUser?.branchId || '',
    isActive: true
  });

  const branchKiosks = kiosks.filter(k => 
    currentUser?.role === UserRole.SUPER_ADMIN || k.branchId === currentUser?.branchId
  );

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      location: '',
      branchId: currentUser?.branchId || '',
      isActive: true
    });
    setEditingKiosk(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (kiosk: any) => {
    setFormData({
      name: kiosk.name,
      location: kiosk.location,
      branchId: kiosk.branchId,
      isActive: kiosk.isActive
    });
    setEditingKiosk(kiosk);
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingKiosk) {
      updateKiosk(editingKiosk.id, formData);
    } else {
      const newKiosk = {
        id: `kiosk-${Date.now()}`,
        ...formData,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.id || ''
      };
      addKiosk(newKiosk);
    }
    
    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this kiosk?')) {
      deleteKiosk(id);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Kiosk Management</h2>
          <p className="text-gray-500 font-medium text-sm">Manage self-service check-in kiosks for your branch</p>
        </div>
        {(currentUser?.role === UserRole.BRANCH_ADMIN || currentUser?.role === UserRole.MANAGER) && (
          <button 
            onClick={handleOpenAdd}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 md:py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-100"
          >
            <i className="fas fa-desktop"></i> ADD KIOSK
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-gray-50 border-b">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-5">Name</th>
                <th className="px-6 py-5">Location</th>
                <th className="px-6 py-5">Branch</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {branchKiosks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No kiosks found.</td>
                </tr>
              ) : (
                branchKiosks.map(kiosk => {
                  const branch = branches.find(b => b.id === kiosk.branchId);
                  return (
                    <tr key={kiosk.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-5">
                        <span className="font-black text-slate-900 block leading-tight uppercase tracking-tight">{kiosk.name}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm text-gray-600">{kiosk.location}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm text-gray-600">{branch?.name || 'Unknown Branch'}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          kiosk.isActive 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : 'bg-red-50 text-red-600'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            kiosk.isActive ? 'bg-emerald-500' : 'bg-red-500'
                          }`}></span>
                          {kiosk.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right pr-8">
                        <div className="flex justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          {(currentUser?.role === UserRole.BRANCH_ADMIN || currentUser?.role === UserRole.MANAGER) && (
                            <>
                              <button 
                                onClick={() => handleOpenEdit(kiosk)}
                                className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="Edit Kiosk"
                              >
                                <i className="fas fa-user-pen"></i>
                              </button>
                              <button 
                                onClick={() => handleDelete(kiosk.id)}
                                className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                title="Delete Kiosk"
                              >
                                <i className="fas fa-trash-can"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Kiosk Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <div className={`p-8 text-white flex justify-between items-center ${editingKiosk ? 'bg-indigo-600 shadow-indigo-100 shadow-xl' : 'bg-blue-600 shadow-blue-100 shadow-xl'}`}>
              <div>
                 <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-1">{editingKiosk ? 'Update Kiosk' : 'Create New Kiosk'}</h3>
                 <p className="text-[10px] text-white/60 font-black uppercase tracking-widest">Self-Service Check-In Setup</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kiosk Name</label>
                <input 
                  required
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Location Description</label>
                <input 
                  required
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" 
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Branch</label>
                <select 
                  required
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-xs uppercase" 
                  value={formData.branchId}
                  onChange={e => setFormData({...formData, branchId: e.target.value})}
                  disabled={!!editingKiosk} // Disable branch selection when editing
                >
                  {branches.filter(b => 
                    currentUser?.role === UserRole.SUPER_ADMIN || b.id === currentUser?.branchId
                  ).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</label>
                <select 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-xs uppercase" 
                  value={formData.isActive.toString()}
                  onChange={e => setFormData({...formData, isActive: e.target.value === 'true'})}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div className="pt-4">
                <button type="submit" className={`w-full py-5 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95 ${editingKiosk ? 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700' : 'bg-blue-600 shadow-blue-100 hover:bg-blue-700'}`}>
                  {editingKiosk ? 'UPDATE KIOSK' : 'CREATE KIOSK'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors mt-2"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default KioskManagement;