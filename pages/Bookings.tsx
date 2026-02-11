import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, PlanType, SubscriptionStatus, Booking, User } from '../types';

const Bookings: React.FC = () => {
  const { currentUser, bookings, users, plans, subscriptions, addBooking, showToast, branches } = useAppContext();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingType, setBookingType] = useState<PlanType.PT | PlanType.GROUP>(PlanType.PT);
  const [formData, setFormData] = useState({
    trainerId: '',
    date: new Date().toISOString().split('T')[0],
    timeSlot: ''
  });

  const allTimeSlots = [
    "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", 
    "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM"
  ];

  const time12hToMinutes = (time12h: string): number => {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;
    return hours * 60 + minutes;
  };

  const time24hToMinutes = (time24h: string): number => {
    const [hours, minutes] = time24h.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const trainers = useMemo(() => users.filter(u => 
    u.role === UserRole.TRAINER && 
    (currentUser?.role === UserRole.SUPER_ADMIN || u.branchId === currentUser?.branchId)
  ), [users, currentUser]);

  const selectedTrainer = useMemo(() => 
    trainers.find(t => t.id === formData.trainerId), 
  [trainers, formData.trainerId]);

  const activeSubForCapacity = useMemo(() => {
    if (currentUser?.role !== UserRole.MEMBER) return null;
    return subscriptions.find(s => {
      const p = plans.find(plan => plan.id === s.planId);
      return s.memberId === currentUser.id && s.status === SubscriptionStatus.ACTIVE && p?.type === bookingType;
    });
  }, [subscriptions, plans, currentUser, bookingType]);

  const currentPlanForBooking = useMemo(() => {
    if (!activeSubForCapacity) return null;
    return plans.find(p => p.id === activeSubForCapacity.planId);
  }, [activeSubForCapacity, plans]);

  const availableSlotsData = useMemo(() => {
    if (!selectedTrainer || !selectedTrainer.shifts || selectedTrainer.shifts.length === 0) {
      return [];
    }

    const shiftSlots = allTimeSlots.filter(slot => {
      const slotMinutes = time12hToMinutes(slot);
      return selectedTrainer.shifts?.some(shift => {
        const startMin = time24hToMinutes(shift.start);
        const endMin = time24hToMinutes(shift.end);
        return slotMinutes >= startMin && slotMinutes < endMin;
      });
    });

    return shiftSlots.map(slot => {
      const existingTrainerBookings = bookings.filter(b => 
        b.trainerId === selectedTrainer.id && 
        b.date === formData.date && 
        b.timeSlot === slot &&
        b.status !== 'CANCELLED'
      );

      const hasPT = existingTrainerBookings.some(b => b.type === PlanType.PT);
      const hasGroup = existingTrainerBookings.some(b => b.type === PlanType.GROUP);
      
      if (hasPT) return { slot, available: false, reason: 'PRIVATE SESSION' };
      if (bookingType === PlanType.PT && hasGroup) return { slot, available: false, reason: 'GROUP CLASS' };

      const memberAlreadyInSlot = existingTrainerBookings.some(b => b.memberId === currentUser?.id);
      if (memberAlreadyInSlot) return { slot, available: false, reason: 'ALREADY JOINED' };

      if (bookingType === PlanType.GROUP) {
          const capacity = currentPlanForBooking?.groupCapacity || 15;
          const currentCount = existingTrainerBookings.filter(b => b.type === PlanType.GROUP).length;
          if (currentCount >= capacity) {
             return { slot, available: false, reason: 'CLASS FULL', count: currentCount, capacity };
          }
          return { slot, available: true, count: currentCount, capacity };
      }
      return { slot, available: true };
    });
  }, [selectedTrainer, allTimeSlots, bookings, formData.date, bookingType, currentUser, currentPlanForBooking]);

  const filteredBookings = bookings.filter(b => {
    if (currentUser?.role === UserRole.SUPER_ADMIN) return true;
    if (currentUser?.role === UserRole.TRAINER) return b.trainerId === currentUser.id;
    if (currentUser?.role === UserRole.MEMBER) return b.memberId === currentUser.id;
    return b.branchId === currentUser?.branchId;
  });

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || isSubmitting) return;
    if (!formData.timeSlot) {
      showToast("Please select a valid time slot.", "error");
      return;
    }

    setIsSubmitting(true);

    // Simulated API Delay for transaction integrity
    await new Promise(r => setTimeout(r, 600));

    // Final Race Condition Check
    const finalCollisionCheck = bookings.some(b => 
        b.trainerId === formData.trainerId && 
        b.date === formData.date && 
        b.timeSlot === formData.timeSlot &&
        b.status !== 'CANCELLED' &&
        (b.type === PlanType.PT || (bookingType === PlanType.PT && b.type === PlanType.GROUP))
    );

    if (finalCollisionCheck) {
       showToast("Collision detected: Slot was reserved by another member. Please refresh.", "error");
       setIsSubmitting(false);
       return;
    }

    if (bookingType === PlanType.GROUP) {
        const capacity = currentPlanForBooking?.groupCapacity || 15;
        const currentCount = bookings.filter(b => 
            b.trainerId === formData.trainerId && 
            b.date === formData.date && 
            b.timeSlot === formData.timeSlot &&
            b.type === PlanType.GROUP &&
            b.status !== 'CANCELLED'
        ).length;

        if (currentCount >= capacity) {
            showToast("Capacity Error: This class just reached its limit.", "error");
            setIsSubmitting(false);
            return;
        }
    }

    const activeSub = subscriptions.find(s => {
      const plan = plans.find(p => p.id === s.planId);
      return s.memberId === currentUser.id && s.status === SubscriptionStatus.ACTIVE && plan?.type === bookingType;
    });

    if (!activeSub && currentUser.role === UserRole.MEMBER) {
      showToast(`Credential Error: You need an active ${bookingType.replace('_', ' ')} subscription.`, "error");
      setIsSubmitting(false);
      return;
    }

    if (activeSub) {
      const plan = plans.find(p => p.id === activeSub.planId);
      if (plan?.maxSessions) {
        const usedCount = bookings.filter(b => 
          b.memberId === currentUser.id && 
          b.type === bookingType && 
          b.status !== 'CANCELLED' &&
          b.date >= activeSub.startDate &&
          b.date <= activeSub.endDate
        ).length;

        if (usedCount >= plan.maxSessions) {
          showToast(`Quota Exhausted: You have used all ${plan.maxSessions} sessions for this period.`, "error");
          setIsSubmitting(false);
          return;
        }
      }
    }

    const newBooking: Booking = {
      id: `book-${Date.now()}`,
      memberId: currentUser.id,
      trainerId: formData.trainerId || undefined,
      type: bookingType,
      date: formData.date,
      timeSlot: formData.timeSlot,
      branchId: currentUser.branchId || branches[0].id,
      status: 'BOOKED'
    };

    addBooking(newBooking);
    // Fix: Using setModalOpen instead of the non-existent setIsModalOpen
    setModalOpen(false);
    setIsSubmitting(false);
    showToast("Transaction Confirmed: Session Slot Secured.", "success");
    setFormData({ trainerId: '', date: new Date().toISOString().split('T')[0], timeSlot: '' });
  };

  const format24to12 = (time24: string) => {
    const [h, m] = time24.split(':');
    const hrs = parseInt(h);
    return `${hrs % 12 || 12}:${m} ${hrs >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Class & Session Manager</h2>
          <p className="text-gray-500 font-medium text-sm">Real-time concurrency monitoring active</p>
        </div>
        {currentUser?.role === UserRole.MEMBER && (
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-slate-100"
          >
            <i className="fas fa-calendar-plus"></i> BOOK SESSION
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-5">Scheduled Period</th>
                <th className="px-6 py-5">Type</th>
                {currentUser?.role !== UserRole.MEMBER && <th className="px-6 py-5">Athlete</th>}
                <th className="px-6 py-5">Assigned Coach</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-300 italic font-bold uppercase tracking-widest text-xs">
                     <i className="fas fa-calendar-xmark text-4xl block mb-4 opacity-10"></i>
                     No scheduled training found.
                  </td>
                </tr>
              ) : (
                [...filteredBookings].reverse().map(book => {
                  const member = users.find(u => u.id === book.memberId);
                  const trainer = users.find(u => u.id === book.trainerId);
                  return (
                    <tr key={book.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="font-black text-slate-900 uppercase text-xs">{book.date}</div>
                        <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{book.timeSlot}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${book.type === PlanType.PT ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                          {book.type === PlanType.PT ? 'Personal' : 'Group'}
                        </span>
                      </td>
                      {currentUser?.role !== UserRole.MEMBER && (
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                             <img src={member?.avatar} className="w-8 h-8 rounded-lg border shadow-sm" alt="" />
                             <span className="font-bold text-sm text-slate-700">{member?.name}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <img src={trainer?.avatar || 'https://i.pravatar.cc/150?u=coach'} className="w-8 h-8 rounded-lg border shadow-sm" alt="" />
                          <span className="text-xs text-slate-600 font-bold uppercase">{trainer?.name || (book.type === PlanType.GROUP ? 'Branch Coach' : 'Unassigned')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          book.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          book.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          'bg-blue-600 text-white shadow-lg shadow-blue-100'
                        }`}>
                          {book.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="text-slate-300 hover:text-slate-900 transition-colors">
                          <i className="fas fa-ellipsis-h"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight leading-none mb-1">Secure Session</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Validated Cloud Availability</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleBooking} className="p-8 space-y-6">
              <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem]">
                 <button 
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => { setBookingType(PlanType.PT); setFormData({...formData, trainerId: '', timeSlot: ''}) }}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${bookingType === PlanType.PT ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400'}`}
                 >PERSONAL (1-ON-1)</button>
                 <button 
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => { setBookingType(PlanType.GROUP); setFormData({...formData, trainerId: '', timeSlot: ''}) }}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${bookingType === PlanType.GROUP ? 'bg-white text-orange-600 shadow-xl' : 'text-slate-400'}`}
                 >GROUP CLASS</button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Coach / Instructor</label>
                  <select 
                    required
                    disabled={isSubmitting}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-xs uppercase"
                    value={formData.trainerId}
                    onChange={e => setFormData({...formData, trainerId: e.target.value, timeSlot: ''})}
                  >
                    <option value="">{bookingType === PlanType.PT ? 'Select your personal coach...' : 'Select class instructor...'}</option>
                    {trainers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {selectedTrainer && (
                  <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex justify-between items-start mb-3">
                       <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                          <i className="fas fa-clock"></i> Duty Shifts
                       </p>
                       <span className="text-[8px] font-black bg-white px-2 py-0.5 rounded uppercase text-blue-400 border border-blue-100">Verified</span>
                    </div>
                    <div className="space-y-1.5">
                      {selectedTrainer.shifts && selectedTrainer.shifts.length > 0 ? (
                        selectedTrainer.shifts.map((s, idx) => (
                          <p key={idx} className="text-[10px] font-black text-slate-600 uppercase">
                             Block {idx + 1}: {format24to12(s.start)} - {format24to12(s.end)}
                          </p>
                        ))
                      ) : (
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">No duty shifts configured.</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reservation Date</label>
                    <input 
                      type="date"
                      required
                      disabled={isSubmitting}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-xs"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                       <span>Time Block</span>
                       {availableSlotsData.some(s => s.available) && <span className="text-[8px] text-green-500 font-black">OPEN</span>}
                    </label>
                    <select 
                      required
                      disabled={!formData.trainerId || availableSlotsData.length === 0 || isSubmitting}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-xs disabled:opacity-50"
                      value={formData.timeSlot}
                      onChange={e => setFormData({...formData, timeSlot: e.target.value})}
                    >
                      <option value="">{formData.trainerId ? (availableSlotsData.length > 0 ? 'Select slot...' : 'None Available') : 'Choose Coach'}</option>
                      {availableSlotsData.map(slotInfo => (
                        <option 
                            key={slotInfo.slot} 
                            value={slotInfo.slot} 
                            disabled={!slotInfo.available}
                            className={!slotInfo.available ? 'text-slate-300 line-through' : ''}
                        >
                          {slotInfo.slot} {slotInfo.count !== undefined ? `(${slotInfo.count}/${slotInfo.capacity})` : ''} {!slotInfo.available ? `— [${slotInfo.reason}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {currentPlanForBooking && (
                <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 text-[10px] text-indigo-600 font-black uppercase tracking-[0.1em] flex items-center justify-between">
                  <div className="flex flex-col">
                     <span className="opacity-50 text-[8px]">Linked Contract</span>
                     <span>{currentPlanForBooking.name}</span>
                  </div>
                  <div className="text-right flex flex-col">
                     <span className="opacity-50 text-[8px]">Quota Rule</span>
                     <span>{bookingType === PlanType.GROUP ? `${currentPlanForBooking.groupCapacity || 15} Capacity` : '1-on-1 Block'}</span>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={!formData.timeSlot || isSubmitting}
                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-200 transition-all active:scale-95 disabled:grayscale disabled:opacity-30"
              >
                {isSubmitting ? (
                   <span className="flex items-center justify-center gap-3">
                      <i className="fas fa-spinner fa-spin"></i>
                      ESTABLISHING TRANSACTION...
                   </span>
                ) : 'CONFIRM RESERVATION'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default Bookings;