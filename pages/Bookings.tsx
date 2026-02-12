
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, PlanType, SubscriptionStatus, Booking, ClassSession } from '../types';
import { ClassCompletionQR } from '../components/ClassCompletionQR';

const Bookings: React.FC = () => {
  const { currentUser, bookings, users, plans, subscriptions, addBooking, showToast, branches, classSchedules, addClassTemplate, deleteClassSession } = useAppContext();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'GROUP' | 'PT'>('GROUP');
  const [selectedTrainer, setSelectedTrainer] = useState<string>('');
  const [isPTBookingModalOpen, setPTBookingModalOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [isCompletionQROpen, setIsCompletionQROpen] = useState(false);
  
  // Date Strip Logic
  const dates = useMemo(() => {
     const list = [];
     const today = new Date();
     for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        list.push({
           full: d.toISOString().split('T')[0],
           day: d.toLocaleDateString('en-US', { weekday: 'short' }),
           date: d.getDate()
        });
     }
     return list;
  }, []);

  const [classFormData, setClassFormData] = useState({
    trainerId: currentUser?.id || '',
    dayOfWeek: 'MONDAY',
    timeSlot: '07:00 AM',
    title: '',
    capacity: 20
  });

  const allTimeSlots = [
    "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", 
    "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM"
  ];

  const trainers = useMemo(() => users.filter(u => 
    u.role === UserRole.TRAINER && 
    (currentUser?.role === UserRole.SUPER_ADMIN || u.branchId === currentUser?.branchId)
  ), [users, currentUser]);

  const filteredClasses = useMemo(() => {
     return classSchedules
       .filter(s => s.date === selectedDate)
       .sort((a, b) => {
          const timeA = new Date(`2000-01-01 ${a.timeSlot}`).getTime();
          const timeB = new Date(`2000-01-01 ${b.timeSlot}`).getTime();
          return timeA - timeB;
       });
  }, [classSchedules, selectedDate]);

  const handleBooking = async (session: ClassSession) => {
    if (!currentUser || isSubmitting) return;

    const bookedCount = bookings.filter(b => 
       b.trainerId === session.trainerId && 
       b.date === session.date && 
       b.timeSlot === session.timeSlot &&
       b.status !== 'CANCELLED'
    ).length;

    if (bookedCount >= session.capacity) {
       showToast("Class Full! Please choose another slot.", "error");
       return;
    }

    const isJoined = bookings.some(b => 
       b.memberId === currentUser.id && 
       b.trainerId === session.trainerId && 
       b.date === session.date && 
       b.timeSlot === session.timeSlot &&
       b.status !== 'CANCELLED'
    );

    if (isJoined) {
       showToast("You have already booked this class.", "error");
       return;
    }

    // Check Plan Validity
    const activeSub = subscriptions.find(s => 
       s.memberId === currentUser.id && 
       s.status === SubscriptionStatus.ACTIVE &&
       plans.find(p => p.id === s.planId)?.type === PlanType.GROUP
    );

    if (!activeSub) {
       showToast("You need an active Group Class subscription.", "error");
       return;
    }

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 600));

    const newBooking: Booking = {
      id: `book-${Date.now()}`,
      memberId: currentUser.id,
      trainerId: session.trainerId,
      type: PlanType.GROUP,
      date: session.date,
      timeSlot: session.timeSlot,
      branchId: session.branchId,
      status: 'BOOKED'
    };

    addBooking(newBooking);
    setIsSubmitting(false);
    showToast("Class Booked Successfully!", "success");
  };

  const handleScheduleTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classFormData.trainerId || !classFormData.timeSlot || !classFormData.title) return;
    
    const newTemplate = {
       id: `temp-${Date.now()}`,
       trainerId: classFormData.trainerId,
       dayOfWeek: classFormData.dayOfWeek,
       timeSlot: classFormData.timeSlot,
       title: classFormData.title,
       capacity: classFormData.capacity,
       branchId: currentUser?.branchId || branches[0].id
    };
    addClassTemplate(newTemplate);
    setScheduleModalOpen(false);
  };

  // PT Booking Functions
  const getTrainerPTBookings = (trainerId: string, date: string) => {
    return bookings.filter(b => 
      b.trainerId === trainerId && 
      b.date === date && 
      b.type === PlanType.PT &&
      b.status !== 'CANCELLED'
    );
  };

  const isTimeSlotAvailable = (trainerId: string, date: string, timeSlot: string) => {
    const trainerBookings = getTrainerPTBookings(trainerId, date);
    return !trainerBookings.some(b => b.timeSlot === timeSlot);
  };

  const handlePTBooking = async () => {
    if (!currentUser || !selectedTrainer || !selectedTimeSlot || isSubmitting) return;

    // Check if user has active PT subscription
    const activePTSub = subscriptions.find(s => {
      const plan = plans.find(p => p.id === s.planId);
      return s.memberId === currentUser.id && 
             s.status === SubscriptionStatus.ACTIVE &&
             plan?.type === PlanType.PT;
    });

    if (!activePTSub) {
      showToast("You need an active Personal Training subscription.", "error");
      return;
    }

    // Check if sessions remaining
    const plan = plans.find(p => p.id === activePTSub.planId);
    const usedSessions = bookings.filter(b => 
      b.memberId === currentUser.id && 
      b.type === PlanType.PT &&
      b.status !== 'CANCELLED'
    ).length;

    if (plan?.maxSessions && usedSessions >= plan.maxSessions) {
      showToast("You have used all your PT sessions. Please upgrade your plan.", "error");
      return;
    }

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 600));

    const newBooking: Booking = {
      id: `book-${Date.now()}`,
      memberId: currentUser.id,
      trainerId: selectedTrainer,
      type: PlanType.PT,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      branchId: currentUser.branchId || branches[0].id,
      status: 'BOOKED'
    };

    addBooking(newBooking);
    setIsSubmitting(false);
    setPTBookingModalOpen(false);
    setSelectedTimeSlot('');
    showToast(`PT Session Booked with ${users.find(u => u.id === selectedTrainer)?.name}!`, "success");
  };

  const getAvailableTrainers = () => {
    return trainers.filter(trainer => {
      // Check if trainer has any availability on selected date
      return allTimeSlots.some(slot => 
        isTimeSlotAvailable(trainer.id, selectedDate, slot)
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            {activeTab === 'GROUP' ? 'Class Schedule' : 'Personal Training'}
          </h2>
          <p className="text-gray-500 font-medium text-sm">
            {activeTab === 'GROUP' ? 'Book your next workout' : 'Book 1-on-1 sessions with trainers'}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Tab Switcher */}
          <div className="bg-white p-1 rounded-xl border flex">
            <button
              onClick={() => setActiveTab('GROUP')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'GROUP' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className="fas fa-users mr-1"></i> Group
            </button>
            <button
              onClick={() => setActiveTab('PT')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'PT' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className="fas fa-user mr-1"></i> PT
            </button>
          </div>
          
          {/* QR Code Button for Trainers */}
          {currentUser?.role === UserRole.TRAINER && (
            <button 
              onClick={() => setIsCompletionQROpen(true)}
              className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg shadow-green-100"
            >
              <i className="fas fa-qrcode"></i> Complete Class
            </button>
          )}
          
          {(currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.TRAINER) && activeTab === 'GROUP' && (
            <button 
              onClick={() => setScheduleModalOpen(true)}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
            >
              <i className="fas fa-plus-circle"></i> MANAGE
            </button>
          )}
        </div>
      </div>

      {/* Date Strip */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
         {dates.map((d, idx) => (
            <button 
               key={idx}
               onClick={() => { setSelectedDate(d.full); setSelectedTrainer(''); }}
               className={`min-w-[70px] flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                  selectedDate === d.full 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' 
                  : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
               }`}
            >
               <span className="text-[10px] font-black uppercase tracking-widest">{d.day}</span>
               <span className="text-xl font-black">{d.date}</span>
            </button>
         ))}
      </div>

      {/* PT Booking Section */}
      {activeTab === 'PT' && (
        <div className="space-y-4">
          {/* Trainer Selection */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Select Trainer</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {getAvailableTrainers().map(trainer => {
                const isSelected = selectedTrainer === trainer.id;
                const availableSlots = allTimeSlots.filter(slot => 
                  isTimeSlotAvailable(trainer.id, selectedDate, slot)
                ).length;
                
                return (
                  <button
                    key={trainer.id}
                    onClick={() => { setSelectedTrainer(trainer.id); setSelectedTimeSlot(''); }}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50' 
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <img src={trainer.avatar} alt="" className="w-12 h-12 rounded-full mb-2 border-2 border-white shadow" />
                    <p className="font-bold text-sm text-slate-900">{trainer.name}</p>
                    <p className="text-xs text-slate-500">{availableSlots} slots available</p>
                  </button>
                );
              })}
            </div>
            {getAvailableTrainers().length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <i className="fas fa-calendar-times text-3xl mb-2"></i>
                <p>No trainers available on this date</p>
              </div>
            )}
          </div>

          {/* Time Slot Selection */}
          {selectedTrainer && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">
                Available Slots - {users.find(u => u.id === selectedTrainer)?.name}
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {allTimeSlots.map(slot => {
                  const isAvailable = isTimeSlotAvailable(selectedTrainer, selectedDate, slot);
                  const isSelected = selectedTimeSlot === slot;
                  
                  return (
                    <button
                      key={slot}
                      disabled={!isAvailable}
                      onClick={() => setSelectedTimeSlot(slot)}
                      className={`py-3 px-2 rounded-xl text-xs font-bold transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-lg' 
                          : isAvailable 
                            ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
              
              {/* Book Button */}
              {currentUser?.role === UserRole.MEMBER && selectedTimeSlot && (
                <button
                  onClick={handlePTBooking}
                  disabled={isSubmitting}
                  className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  {isSubmitting ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i> Booking...</>
                  ) : (
                    <><i className="fas fa-check mr-2"></i> Book PT Session</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* My PT Bookings */}
          {currentUser?.role === UserRole.MEMBER && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">My PT Sessions</h3>
              {bookings.filter(b => 
                b.memberId === currentUser.id && 
                b.type === PlanType.PT &&
                b.status !== 'CANCELLED'
              ).length === 0 ? (
                <p className="text-slate-400 text-sm">No PT sessions booked yet</p>
              ) : (
                <div className="space-y-3">
                  {bookings.filter(b => 
                    b.memberId === currentUser.id && 
                    b.type === PlanType.PT &&
                    b.status !== 'CANCELLED'
                  ).map(booking => {
                    const trainer = users.find(u => u.id === booking.trainerId);
                    return (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <img src={trainer?.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-white" />
                          <div>
                            <p className="font-bold text-slate-900">{trainer?.name}</p>
                            <p className="text-xs text-slate-500">{booking.date} • {booking.timeSlot}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">
                          {booking.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Group Classes Section */}
      {activeTab === 'GROUP' && (<>

      {/* Class Cards */}
      </>)}
      
      {activeTab === 'GROUP' && (<div className="space-y-4">
         {filteredClasses.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
               <i className="fas fa-mug-hot text-4xl text-slate-200 mb-4"></i>
               <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No classes scheduled for today.</p>
            </div>
         ) : (
            filteredClasses.map(session => {
               const trainer = users.find(u => u.id === session.trainerId);
               const bookedCount = bookings.filter(b => 
                  b.trainerId === session.trainerId && 
                  b.date === session.date && 
                  b.timeSlot === session.timeSlot &&
                  b.status !== 'CANCELLED'
               ).length;
               const isFull = bookedCount >= session.capacity;
               const isJoined = bookings.some(b => 
                  b.memberId === currentUser?.id && 
                  b.trainerId === session.trainerId && 
                  b.date === session.date && 
                  b.timeSlot === session.timeSlot &&
                  b.status !== 'CANCELLED'
               );

               return (
                  <div key={session.id} className="bg-white p-0 rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-lg transition-all group">
                     {/* Time Column */}
                     <div className="bg-slate-50 p-6 flex flex-col justify-center items-center md:w-32 border-b md:border-b-0 md:border-r border-slate-100">
                        <span className="text-lg font-black text-slate-900">{session.timeSlot.split(' ')[0]}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase">{session.timeSlot.split(' ')[1]}</span>
                     </div>
                     
                     {/* Details */}
                     <div className="p-6 flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-2">
                           <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">{session.title}</h4>
                           {isFull && <span className="bg-red-100 text-red-600 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest">FULL</span>}
                        </div>
                        <div className="flex items-center gap-3">
                           <img src={trainer?.avatar || 'https://i.pravatar.cc/150?u=coach'} className="w-6 h-6 rounded-full border border-slate-100" alt="" />
                           <span className="text-xs font-bold text-slate-500 uppercase">{trainer?.name}</span>
                           <span className="text-slate-300">•</span>
                           <span className="text-xs font-bold text-slate-500 uppercase">{session.capacity - bookedCount} Slots Left</span>
                        </div>
                     </div>

                     {/* Action Button */}
                     <div className="p-6 flex items-center justify-center md:w-48 bg-white border-t md:border-t-0 md:border-l border-slate-50">
                        {currentUser?.role === UserRole.MEMBER ? (
                           <button 
                              onClick={() => handleBooking(session)}
                              disabled={isFull || isJoined || isSubmitting}
                              className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                                 isJoined ? 'bg-green-500 text-white cursor-default' : 
                                 isFull ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 
                                 'bg-slate-900 text-white hover:bg-black shadow-lg hover:shadow-xl active:scale-95'
                              }`}
                           >
                              {isJoined ? 'BOOKED' : isFull ? 'WAITLIST' : 'BOOK'}
                           </button>
                        ) : (
                           <button 
                              onClick={() => deleteClassSession(session.id)}
                              className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all"
                           >
                              CANCEL
                           </button>
                        )}
                     </div>
                  </div>
               );
            })
         )}
      </div>)}

      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight leading-none mb-1">Schedule Class</h3>
                <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest">Admin Control Panel</p>
              </div>
              <button onClick={() => setScheduleModalOpen(false)} className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleScheduleTemplate} className="p-8 space-y-6">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class Title</label>
                  <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" placeholder="e.g. Morning Yoga" value={classFormData.title} onChange={e => setClassFormData({ ...classFormData, title: e.target.value })} />
               </div>

               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instructor</label>
                  <select 
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-xs uppercase"
                    value={classFormData.trainerId}
                    onChange={e => setClassFormData({ ...classFormData, trainerId: e.target.value })}
                  >
                    <option value="">Select Instructor...</option>
                    {trainers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Day of Week</label>
                    <select required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-xs uppercase" value={classFormData.dayOfWeek} onChange={e => setClassFormData({ ...classFormData, dayOfWeek: e.target.value })}>
                       {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(day => (
                         <option key={day} value={day}>{day}</option>
                       ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time Slot</label>
                    <select required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-xs" value={classFormData.timeSlot} onChange={e => setClassFormData({ ...classFormData, timeSlot: e.target.value })}>
                       <option value="">Select Time...</option>
                       {allTimeSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                    </select>
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Capacity Limit</label>
                  <input type="number" required min="1" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={classFormData.capacity} onChange={e => setClassFormData({ ...classFormData, capacity: Number(e.target.value) })} />
               </div>

               <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-200 transition-all active:scale-95 hover:bg-indigo-700">
                  SAVE & GENERATE SESSIONS
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Class Completion QR Modal */}
      <ClassCompletionQR 
        isOpen={isCompletionQROpen}
        onClose={() => setIsCompletionQROpen(false)}
        selectedDate={selectedDate}
      />
      
      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default Bookings;
