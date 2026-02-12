
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { Holiday, UserRole } from '../types';

const Holidays: React.FC = () => {
  const { holidays, branches, currentUser, addHoliday, deleteHoliday, sendHolidayNotification, sendBranchNotification, users } = useAppContext();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    branchId: 'ALL',
    sendNotification: false
  });
  const [notificationForm, setNotificationForm] = useState({
    branchId: 'ALL',
    subject: '',
    message: '',
    targetRoles: [] as UserRole[]
  });

  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const userBranchId = currentUser?.branchId;

  // Filter holidays based on role
  const filteredHolidays = isSuperAdmin 
    ? holidays 
    : holidays.filter(h => h.branchId === userBranchId || h.branchId === 'ALL');

  // Sort by date
  const sortedHolidays = [...filteredHolidays].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    const newHoliday: Holiday = {
      id: `holiday-${Date.now()}`,
      name: formData.name,
      date: formData.date,
      branchId: isSuperAdmin ? formData.branchId : (userBranchId || 'ALL')
    };
    await addHoliday(newHoliday, formData.sendNotification);
    setIsAddModalOpen(false);
    setFormData({ name: '', date: '', branchId: 'ALL', sendNotification: false });
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendBranchNotification(
      notificationForm.branchId,
      notificationForm.subject,
      notificationForm.message,
      notificationForm.targetRoles.length > 0 ? notificationForm.targetRoles : undefined
    );
    setIsNotificationModalOpen(false);
    setNotificationForm({ branchId: 'ALL', subject: '', message: '', targetRoles: [] });
  };

  const handleSendHolidayNotification = async (holiday: Holiday) => {
    if (window.confirm(`Send notification about ${holiday.name} to all affected users?`)) {
      await sendHolidayNotification(holiday);
    }
  };

  const toggleRole = (role: UserRole) => {
    setNotificationForm(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter(r => r !== role)
        : [...prev.targetRoles, role]
    }));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      deleteHoliday(id);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getBranchName = (branchId: string) => {
    if (branchId === 'ALL') return 'All Branches';
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || 'Unknown Branch';
  };

  const isPastHoliday = (dateStr: string) => {
    const holidayDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidayDate < today;
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Holiday Calendar</h2>
          <p className="text-slate-500 font-medium">Manage branch holidays and company-wide off days</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsNotificationModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <i className="fas fa-bullhorn"></i> Send Notification
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <i className="fas fa-plus"></i> Add Holiday
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex items-center gap-6">
          <div className="bg-blue-50 text-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0">
            <i className="fas fa-calendar-day text-xl"></i>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Holidays</p>
            <p className="text-2xl font-black text-slate-900">{sortedHolidays.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex items-center gap-6">
          <div className="bg-emerald-50 text-emerald-600 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0">
            <i className="fas fa-calendar-check text-xl"></i>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upcoming</p>
            <p className="text-2xl font-black text-slate-900">
              {sortedHolidays.filter(h => !isPastHoliday(h.date)).length}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex items-center gap-6">
          <div className="bg-amber-50 text-amber-600 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0">
            <i className="fas fa-globe text-xl"></i>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Wide</p>
            <p className="text-2xl font-black text-slate-900">
              {sortedHolidays.filter(h => h.branchId === 'ALL').length}
            </p>
          </div>
        </div>
      </div>

      {/* Holidays List */}
      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Holiday Name</th>
                <th className="px-8 py-5">Branch</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedHolidays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <i className="fas fa-calendar-xmark text-4xl opacity-20"></i>
                      <p>No holidays added yet.</p>
                      <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="text-blue-600 font-bold text-sm hover:underline"
                      >
                        Add your first holiday
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedHolidays.map((holiday) => (
                  <tr key={holiday.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPastHoliday(holiday.date) ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                          <i className="fas fa-calendar"></i>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{formatDate(holiday.date)}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">
                            {new Date(holiday.date).toLocaleDateString('en-IN', { weekday: 'long' })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-black text-slate-900">{holiday.name}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${holiday.branchId === 'ALL' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {getBranchName(holiday.branchId)}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      {isPastHoliday(holiday.date) ? (
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                          Past
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100 px-3 py-1 rounded-full">
                          Upcoming
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSendHolidayNotification(holiday)}
                          className="text-indigo-400 hover:text-indigo-600 transition-colors p-2 hover:bg-indigo-50 rounded-xl"
                          title="Send notification to users"
                        >
                          <i className="fas fa-bell"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(holiday.id)}
                          className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-xl"
                          title="Delete holiday"
                        >
                          <i className="fas fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Holiday Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-[slideUp_0.3s_ease-out]">
            <div className="p-8 border-b bg-slate-50">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Add Holiday</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 w-10 h-10 rounded-full hover:bg-slate-200 transition-all">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <form onSubmit={handleAddHoliday} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Holiday Name</label>
                <input 
                  required 
                  type="text" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="e.g., Diwali, Christmas"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                <input 
                  required 
                  type="date" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" 
                  value={formData.date} 
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              {isSuperAdmin && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs uppercase"
                    value={formData.branchId}
                    onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                  >
                    <option value="ALL">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Send Notification Checkbox */}
              <div className="space-y-1">
                <label className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl cursor-pointer hover:bg-amber-100 transition-colors">
                  <input 
                    type="checkbox"
                    checked={formData.sendNotification}
                    onChange={e => setFormData({ ...formData, sendNotification: e.target.checked })}
                    className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Notify Users</p>
                    <p className="text-[10px] text-amber-700">Send SMS/Email notification to all affected users</p>
                  </div>
                </label>
              </div>
              
              <div className="pt-4">
                <button 
                  type="submit" 
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Add Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      {isNotificationModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-[slideUp_0.3s_ease-out]">
            <div className="p-8 border-b bg-indigo-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Send Notification</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Broadcast message to branch users</p>
                </div>
                <button onClick={() => setIsNotificationModalOpen(false)} className="text-slate-400 hover:text-slate-600 w-10 h-10 rounded-full hover:bg-slate-200 transition-all">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <form onSubmit={handleSendNotification} className="p-8 space-y-6">
              {isSuperAdmin && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Branch</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs uppercase"
                    value={notificationForm.branchId}
                    onChange={e => setNotificationForm({ ...notificationForm, branchId: e.target.value })}
                  >
                    <option value="ALL">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                <input 
                  required 
                  type="text" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" 
                  value={notificationForm.subject} 
                  onChange={e => setNotificationForm({ ...notificationForm, subject: e.target.value })} 
                  placeholder="e.g., Important Announcement"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message</label>
                <textarea 
                  required 
                  rows={4}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm resize-none" 
                  value={notificationForm.message} 
                  onChange={e => setNotificationForm({ ...notificationForm, message: e.target.value })} 
                  placeholder="Enter your message here..."
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Roles (Optional)</label>
                <div className="flex flex-wrap gap-2">
                  {[UserRole.MEMBER, UserRole.TRAINER, UserRole.STAFF, UserRole.MANAGER, UserRole.BRANCH_ADMIN].map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                        notificationForm.targetRoles.includes(role)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {role.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 ml-1">Leave empty to notify all users</p>
              </div>
              
              <div className="pt-4">
                <button 
                  type="submit" 
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <i className="fas fa-paper-plane mr-2"></i> Send Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default Holidays;
