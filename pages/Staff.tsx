
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, User, Attendance, Shift } from '../types';
import { ImageUploadModal } from '../components/ImageUploadModal';
import { generateMonthlyPayroll, getShiftSummary } from '../src/lib/payroll';

const Staff: React.FC = () => {
  const { users, branches, currentUser, addUser, updateUser, deleteUser, attendance, bookings, holidays, showToast } = useAppContext();
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isLogsModalOpen, setLogsModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth());
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.TRAINER,
    branchId: branches[0]?.id || '',
    shifts: [{ start: '09:00', end: '13:00' }] as Shift[],
    hourlyRate: 500,
    commissionPercentage: 10,
    emergencyContact: '',
    avatar: '',
    weekOffDay: 0,
    phone: ''
  });
  const [isImageModalOpen, setImageModalOpen] = useState(false);

  const staffMembers = users.filter(u => 
    u.role !== UserRole.MEMBER && 
    (currentUser?.role === UserRole.SUPER_ADMIN || u.branchId === currentUser?.branchId)
  );

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: UserRole.TRAINER,
      branchId: currentUser?.branchId || branches[0]?.id || '',
      shifts: [{ start: '09:00', end: '13:00' }],
      hourlyRate: 500,
      commissionPercentage: 10,
      emergencyContact: '',
      avatar: '',
      weekOffDay: 0,
      phone: ''
    });
    setAddModalOpen(true);
  };

  const handleOpenEdit = (staff: User) => {
    setSelectedStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      password: staff.password || '',
      role: staff.role,
      branchId: staff.branchId || branches[0]?.id || '',
      shifts: staff.shifts && staff.shifts.length > 0 ? staff.shifts : [{ start: '09:00', end: '13:00' }],
      hourlyRate: staff.hourlyRate || 500,
      commissionPercentage: staff.commissionPercentage || 0,
      emergencyContact: staff.emergencyContact || '',
      avatar: staff.avatar || '',
      weekOffDay: staff.weekOffDay ?? 0,
      phone: staff.phone || ''
    });
    setEditModalOpen(true);
  };

  const handleImageUpload = (url: string) => {
    setFormData({ ...formData, avatar: url });
  };

  const handleOpenLogs = (staff: User) => {
    setSelectedStaff(staff);
    setLogsModalOpen(true);
  };

  const handleOpenPayroll = (staff: User) => {
    setSelectedStaff(staff);
    setIsPayrollModalOpen(true);
  };

  // Filter holidays for selected staff's branch
  const staffHolidays = useMemo(() => {
    if (!selectedStaff) return [];
    return holidays.filter(h => h.branchId === 'ALL' || h.branchId === selectedStaff.branchId);
  }, [selectedStaff, holidays]);

  const selectedStaffPayroll = useMemo(() => {
    if (!selectedStaff) return null;
    return generateMonthlyPayroll(selectedStaff, attendance, payrollYear, payrollMonth + 1, bookings, staffHolidays);
  }, [selectedStaff, attendance, payrollYear, payrollMonth, bookings, staffHolidays]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      showToast('Please enter staff name', 'error');
      return;
    }
    if (!formData.email.trim()) {
      showToast('Please enter work email', 'error');
      return;
    }
    if (!formData.password.trim()) {
      showToast('Please set a login password', 'error');
      return;
    }
    if (!formData.emergencyContact.trim()) {
      showToast('Please enter emergency contact', 'error');
      return;
    }
    if (!formData.branchId) {
      showToast('Please select a branch', 'error');
      return;
    }

    try {
      const newStaff: User = {
        id: `staff-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        branchId: formData.branchId,
        shifts: formData.shifts,
        hourlyRate: formData.hourlyRate,
        commissionPercentage: formData.commissionPercentage,
        emergencyContact: formData.emergencyContact,
        avatar: formData.avatar || `https://i.pravatar.cc/150?u=${Date.now()}`,
        weekOffDay: formData.weekOffDay,
        phone: formData.phone
      };
      
      await addUser(newStaff);
      setAddModalOpen(false);
      showToast('Staff member added successfully!', 'success');
    } catch (error: any) {
      console.error('Error adding staff:', error);
      showToast(error?.message || 'Failed to add staff member. Please try again.', 'error');
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStaff) {
      try {
        await updateUser(selectedStaff.id, formData);
        setEditModalOpen(false);
        setSelectedStaff(null);
        showToast('Staff profile updated successfully!', 'success');
      } catch (error) {
        console.error('Error updating staff:', error);
        showToast('Failed to update staff profile. Please try again.', 'error');
      }
    }
  };

  const handleDeleteStaff = (id: string) => {
    if (id === currentUser?.id) {
      showToast('You cannot delete your own profile', 'error');
      return;
    }
    if (window.confirm('Are you sure you want to remove this staff member?')) {
      deleteUser(id);
    }
  };

  const addShiftInput = () => {
    if (formData.shifts.length < 3) {
      setFormData({ ...formData, shifts: [...formData.shifts, { start: '14:00', end: '18:00' }] });
    }
  };

  const removeShiftInput = (index: number) => {
    if (formData.shifts.length > 1) {
      const newShifts = [...formData.shifts];
      newShifts.splice(index, 1);
      setFormData({ ...formData, shifts: newShifts });
    }
  };

  const handleShiftChange = (index: number, field: keyof Shift, value: string) => {
    const newShifts = [...formData.shifts];
    newShifts[index] = { ...newShifts[index], [field]: value };
    setFormData({ ...formData, shifts: newShifts });
  };

  const calculateHours = (timeIn: string, timeOut?: string) => {
    if (!timeOut) return 'Active';
    const start = new Date(`2000-01-01 ${timeIn}`);
    const end = new Date(`2000-01-01 ${timeOut}`);
    const diff = (end.getTime() - start.getTime()) / 1000 / 60 / 60;
    return `${diff.toFixed(1)} hrs`;
  };

  const formatTime = (time?: string) => {
    if (!time) return 'N/A';
    const [hrs, mins] = time.split(':');
    const h = parseInt(hrs);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${mins} ${suffix}`;
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Staff Directory</h2>
          <p className="text-gray-500 font-medium text-sm">Monitor multiple shifts and team attendance logs</p>
        </div>
        {(currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.BRANCH_ADMIN) && (
        <button 
          onClick={handleOpenAdd}
          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 md:py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-100"
        >
          <i className="fas fa-user-plus"></i> ADD STAFF
        </button>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-gray-50 border-b">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-5 text-center w-20">Photo</th>
                <th className="px-6 py-5 min-w-[180px]">Employee</th>
                <th className="px-6 py-5 min-w-[140px]">Role</th>
                <th className="px-6 py-5">Pay / Comm</th>
                <th className="px-6 py-5">Shift Info</th>
                <th className="px-6 py-5">Emergency</th>
                <th className="px-6 py-5 text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">No staff found.</td>
                </tr>
              ) : (
                staffMembers.map(staff => {
                  const branch = branches.find(b => b.id === staff.branchId);
                  const today = new Date().toISOString().split('T')[0];
                  const todayLog = attendance.find(a => a.userId === staff.id && a.date === today);
                  const isCheckedIn = todayLog && !todayLog.timeOut;

                  return (
                    <tr key={staff.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-5">
                        <img src={staff.avatar} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm mx-auto" alt="" />
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-black text-slate-900 block leading-tight uppercase tracking-tight truncate max-w-[150px]">{staff.name}</span>
                        <span className="text-[10px] text-gray-400 font-bold truncate max-w-[150px] block">{staff.email}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest whitespace-nowrap inline-block">
                          {staff.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                           <span className="text-sm font-black text-emerald-600">₹{staff.hourlyRate || 500}<span className="text-[8px] opacity-60">/hr</span></span>
                           {(staff.role === UserRole.TRAINER || staff.role === UserRole.MANAGER) && (
                             <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{staff.commissionPercentage || 0}% Comm.</span>
                           )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                           {isCheckedIn ? (
                             <span className="flex items-center gap-1.5 text-green-600 font-black text-[9px] uppercase tracking-widest">
                               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                               ON DUTY
                             </span>
                           ) : (
                             <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">OFFLINE</span>
                           )}
                           <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest opacity-60 truncate max-w-[120px]">{branch?.name || 'Global'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         {staff.emergencyContact ? (
                           <div className="flex items-center gap-2 group/sos cursor-help">
                             <div className="bg-red-50 text-red-600 w-8 h-8 rounded-lg flex items-center justify-center transition-all group-hover/sos:bg-red-600 group-hover/sos:text-white shrink-0">
                                <i className="fas fa-truck-medical text-xs"></i>
                             </div>
                             <span className="text-[10px] font-black text-slate-500 whitespace-nowrap">
                               {staff.emergencyContact}
                             </span>
                           </div>
                         ) : (
                           <span className="text-[10px] text-slate-300 italic font-bold">N/A</span>
                         )}
                      </td>
                      <td className="px-6 py-5 text-right pr-8">
                        <div className="flex justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          {(currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.BRANCH_ADMIN) && (
                          <button 
                            onClick={() => handleOpenPayroll(staff)}
                            className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="View Payroll"
                          >
                            <i className="fas fa-file-invoice-dollar"></i>
                          </button>
                          )}
                          <button 
                            onClick={() => handleOpenLogs(staff)}
                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Attendance Logs"
                          >
                            <i className="fas fa-clock-rotate-left"></i>
                          </button>
                          {(currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.BRANCH_ADMIN) && (
                          <button 
                            onClick={() => handleOpenEdit(staff)}
                            className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Edit Profile"
                          >
                            <i className="fas fa-user-pen"></i>
                          </button>
                          )}
                          {(currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.BRANCH_ADMIN) && staff.id !== currentUser?.id && (
                          <button 
                            onClick={() => handleDeleteStaff(staff.id)}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Delete Account"
                          >
                            <i className="fas fa-trash-can"></i>
                          </button>
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

      {/* Logs Modal */}
      {isLogsModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
              <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <img src={selectedStaff.avatar} className="w-12 h-12 rounded-2xl border-2 border-white/20 shadow-xl" alt="" />
                    <div>
                       <h3 className="font-black text-xl uppercase tracking-tight">{selectedStaff.name}</h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Employee Attendance Logs</p>
                    </div>
                 </div>
                 <button onClick={() => setLogsModalOpen(false)} className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-colors">
                   <i className="fas fa-times"></i>
                 </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4 bg-slate-50/50">
                 {attendance.filter(a => a.userId === selectedStaff.id).length === 0 ? (
                    <div className="text-center py-20 flex flex-col items-center gap-4">
                       <i className="fas fa-calendar-xmark text-4xl text-slate-200"></i>
                       <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No duty logs recorded yet</p>
                    </div>
                 ) : (
                    [...attendance].filter(a => a.userId === selectedStaff.id).reverse().map(a => (
                       <div key={a.id} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                          <div>
                             <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{a.date}</p>
                             <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold mt-2">
                                <span className="flex items-center gap-1.5"><i className="fas fa-sign-in-alt text-emerald-500"></i> {a.timeIn}</span>
                                {a.timeOut && <span className="flex items-center gap-1.5"><i className="fas fa-sign-out-alt text-red-500"></i> {a.timeOut}</span>}
                             </div>
                          </div>
                          <div className="text-right">
                             {a.timeOut ? (
                                <div className="flex flex-col items-end">
                                   <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest mb-1">COMPLETED</span>
                                   <span className="text-[10px] font-black text-slate-900">{calculateHours(a.timeIn, a.timeOut)}</span>
                                </div>
                             ) : (
                                <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">On Shift</span>
                             )}
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      )}

      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <div className={`p-8 text-white flex justify-between items-center ${isEditModalOpen ? 'bg-indigo-600 shadow-indigo-100 shadow-xl' : 'bg-blue-600 shadow-blue-100 shadow-xl'}`}>
              <div>
                 <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-1">{isEditModalOpen ? 'Update Profile' : 'Staff Onboarding'}</h3>
                 <p className="text-[10px] text-white/60 font-black uppercase tracking-widest">Management Credentials</p>
              </div>
              <button onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }} className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={isEditModalOpen ? handleUpdateStaff : handleAddStaff} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <img 
                    src={formData.avatar || selectedStaff?.avatar || 'https://i.pravatar.cc/150?u=default'} 
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

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <input required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                   <i className="fas fa-mobile-screen"></i> Mobile Number
                </label>
                <input type="tel" className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-sm text-blue-700 placeholder:text-blue-200" placeholder="+91 XXXXX XXXXX" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                   <i className="fas fa-life-ring"></i> Emergency Contact Number
                </label>
                <input required type="tel" className="w-full p-4 bg-red-50 border border-red-100 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-black text-sm text-red-700 placeholder:text-red-200" placeholder="+91 XXXXX XXXXX" value={formData.emergencyContact} onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Work Email</label>
                <input required type="email" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-1">Login Password</label>
                <input required type="password" className="w-full p-4 bg-orange-50 border border-orange-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm" placeholder="Set login password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Hourly Salary (₹)</label>
                  <input type="number" className="w-full p-4 bg-emerald-50 border border-emerald-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm" value={formData.hourlyRate} onChange={e => setFormData({ ...formData, hourlyRate: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Primary Role</label>
                  <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-xs uppercase" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}>
                    <option value={UserRole.BRANCH_ADMIN}>Branch Admin</option>
                    <option value={UserRole.MANAGER}>Manager</option>
                    <option value={UserRole.TRAINER}>Trainer</option>
                    <option value={UserRole.RECEPTIONIST}>Receptionist</option>
                    <option value={UserRole.STAFF}>General Staff</option>
                    <option value={UserRole.KIOSK}>Kiosk User</option>
                  </select>
                </div>
              </div>

              {(formData.role === UserRole.TRAINER || formData.role === UserRole.MANAGER) && (
                <div className="space-y-1 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-[fadeIn_0.3s_ease-out]">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">
                    {formData.role === UserRole.MANAGER ? 'Gym Sales Commission (%)' : 'Session Commission (%)'}
                  </label>
                  <div className="relative">
                    <input type="number" min="0" max="100" className="w-full p-4 bg-white border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-sm" value={formData.commissionPercentage} onChange={e => setFormData({ ...formData, commissionPercentage: Number(e.target.value) })} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-indigo-300">%</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Home Branch</label>
                  <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-xs uppercase" value={formData.branchId} onChange={e => setFormData({ ...formData, branchId: e.target.value })}>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Weekly Off Day</label>
                  <select className="w-full p-4 bg-amber-50 border border-amber-100 rounded-2xl outline-none font-bold text-xs uppercase" value={formData.weekOffDay} onChange={e => setFormData({ ...formData, weekOffDay: Number(e.target.value) })}>
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 space-y-4">
                 <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Work Shifts (1-3 Max)</label>
                    {formData.shifts.length < 3 && (
                       <button type="button" onClick={addShiftInput} className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition-all">
                          <i className="fas fa-plus mr-1"></i> Add Shift
                       </button>
                    )}
                 </div>
                 
                 <div className="space-y-4">
                    {formData.shifts.map((shift, index) => (
                       <div key={index} className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100/50 space-y-3 relative group/shift animate-[slideUp_0.2s_ease-out]">
                          <div className="flex justify-between items-center">
                             <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Shift Slot #{index + 1}</span>
                             {formData.shifts.length > 1 && (
                                <button type="button" onClick={() => removeShiftInput(index)} className="text-red-400 hover:text-red-600 transition-colors text-xs">
                                   <i className="fas fa-trash-can"></i>
                                </button>
                             )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Starts At</label>
                                <input type="time" className="w-full p-3 bg-white border border-blue-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500" value={shift.start} onChange={e => handleShiftChange(index, 'start', e.target.value)} />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Ends At</label>
                                <input type="time" className="w-full p-3 bg-white border border-blue-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500" value={shift.end} onChange={e => handleShiftChange(index, 'end', e.target.value)} />
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="pt-4">
                <button type="submit" className={`w-full py-5 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95 ${isEditModalOpen ? 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700' : 'bg-blue-600 shadow-blue-100 hover:bg-blue-700'}`}>
                  {isEditModalOpen ? 'COMMIT UPDATES' : 'DEPLOY STAFF ACCOUNT'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }}
                  className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors mt-2"
                >
                  DISCARD CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Payroll Modal */}
      {isPayrollModalOpen && selectedStaff && selectedStaffPayroll && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto">
            <div className="bg-emerald-600 p-6 text-white flex justify-between items-center sticky top-0 z-10">
               <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Payroll Details</h3>
                  <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest">{selectedStaff.name} • {selectedStaff.role.replace('_', ' ')}</p>
               </div>
               <button onClick={() => setIsPayrollModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-3 rounded-2xl transition-colors">
                  <i className="fas fa-times"></i>
               </button>
            </div>
            
            <div className="p-8 space-y-6">
               {/* Month Selector */}
               <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period:</label>
                  <select 
                    className="p-2 bg-white border rounded-xl font-bold text-xs"
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(Number(e.target.value))}
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                  <select 
                    className="p-2 bg-white border rounded-xl font-bold text-xs"
                    value={payrollYear}
                    onChange={(e) => setPayrollYear(Number(e.target.value))}
                  >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
               </div>

               {/* Shifts Info */}
               <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Assigned Shifts</p>
                  <p className="text-sm font-medium text-blue-800">{getShiftSummary(selectedStaff.shifts || [])}</p>
               </div>

               {/* Attendance Summary */}
               <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl text-center">
                     <p className="text-2xl font-black text-slate-900">{selectedStaffPayroll.totalDaysWorked}</p>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Days Worked</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl text-center">
                     <p className="text-2xl font-black text-slate-900">{selectedStaffPayroll.totalHoursWorked.toFixed(1)}</p>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hours Logged</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl text-center">
                     <p className="text-2xl font-black text-slate-900">{selectedStaffPayroll.weekOffsTaken}</p>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Week Offs</p>
                  </div>
               </div>

               {/* Earnings Breakdown */}
               <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Earnings Breakdown</p>
                  
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                     <span className="text-sm font-medium text-slate-600">Base Salary ({selectedStaffPayroll.totalHoursWorked.toFixed(1)}h × ₹{selectedStaff.hourlyRate || 0})</span>
                     <span className="font-bold text-slate-900">₹{selectedStaffPayroll.baseSalary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                     <span className="text-sm font-medium text-slate-600">Week Off Pay ({selectedStaffPayroll.weekOffsTaken} × 9h)</span>
                     <span className="font-bold text-purple-600">+₹{selectedStaffPayroll.weekOffPay.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                     <span className="text-sm font-medium text-slate-600">Holiday Pay</span>
                     <span className="font-bold text-orange-600">+₹{selectedStaffPayroll.holidayPay.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                     <span className="text-sm font-medium text-slate-600">Commission ({selectedStaff.commissionPercentage || 0}%)</span>
                     <span className="font-bold text-emerald-600">+₹{selectedStaffPayroll.commissionEarned.toLocaleString()}</span>
                  </div>
               </div>

               {/* Total */}
               <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                  <div className="flex justify-between items-center">
                     <div>
                        <p className="text-lg font-black text-emerald-900 uppercase">Net Pay</p>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                           {selectedStaffPayroll.lateDays > 0 && `${selectedStaffPayroll.lateDays} late • `}
                           {selectedStaffPayroll.earlyOutDays > 0 && `${selectedStaffPayroll.earlyOutDays} early out`}
                        </p>
                     </div>
                     <p className="text-3xl font-black text-emerald-700">₹{selectedStaffPayroll.netPay.toLocaleString()}</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onUpload={handleImageUpload}
        title="Update Staff Photo"
      />

      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Staff;
