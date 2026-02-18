import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAppContext } from '../AppContext';
import { Booking, ClassCompletionCode, PlanType } from '../types';

interface ClassCompletionQRProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string;
}

export const ClassCompletionQR: React.FC<ClassCompletionQRProps> = ({
  isOpen,
  onClose,
  selectedDate = new Date().toISOString().split('T')[0]
}) => {
  const { currentUser, bookings, users, classSchedules, showToast } = useAppContext();
  const [activeTab, setActiveTab] = useState<'PT' | 'GROUP'>('GROUP');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [generatedCode, setGeneratedCode] = useState<ClassCompletionCode | null>(null);
  const [qrToken, setQrToken] = useState<string>('');

  // Generate dynamic QR code that refreshes every 15 seconds
  useEffect(() => {
    if (!generatedCode) return;

    const generateToken = () => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 10);
      // Combine original code with dynamic token
      const baseData = JSON.parse(generatedCode.code);
      const dynamicData = {
        ...baseData,
        dynamicToken: `${timestamp}|${random}`,
        expiresAt: timestamp + 30000 // 30 second validity
      };
      setQrToken(JSON.stringify(dynamicData));
    };

    generateToken(); // Generate immediately
    const interval = setInterval(generateToken, 15000); // Refresh every 15 seconds

    return () => clearInterval(interval);
  }, [generatedCode]);

  // Filter bookings for selected date that are BOOKED (not completed)
  const pendingBookings = bookings.filter(b => {
    const isTrainer = b.trainerId === currentUser?.id;
    const isDate = b.date === selectedDate;
    const isBooked = b.status === 'BOOKED';
    const isType = activeTab === 'PT' ? b.type === PlanType.PT : b.type === PlanType.GROUP;
    return isTrainer && isDate && isBooked && isType;
  });

  const getMemberName = (memberId: string) => {
    return users.find(u => u.id === memberId)?.name || 'Unknown';
  };

  const getClassTitle = (booking: Booking) => {
    if (booking.type === PlanType.GROUP) {
      const session = classSchedules.find(s => 
        s.date === booking.date && 
        s.timeSlot === booking.timeSlot &&
        s.trainerId === booking.trainerId
      );
      return session?.title || 'Group Class';
    }
    return 'Personal Training';
  };

  const getCommissionInfo = (booking: Booking) => {
    const trainer = users.find(u => u.id === booking.trainerId);
    const commission = trainer?.commissionPercentage || 0;
    
    if (booking.type === PlanType.PT) {
      return `${commission}% per session`;
    } else {
      return `${commission}% on group class`;
    }
  };

  const generateCompletionCode = (booking: Booking) => {
    const codeData = JSON.stringify({
      type: 'CLASS_COMPLETION',
      bookingId: booking.id,
      trainerId: booking.trainerId,
      memberId: booking.memberId,
      classType: booking.type,
      date: booking.date,
      timestamp: Date.now()
    });

    const newCode: ClassCompletionCode = {
      id: `cc-${Date.now()}`,
      bookingId: booking.id,
      trainerId: booking.trainerId!,
      memberId: booking.memberId,
      code: codeData,
      status: 'VALID',
      classDate: booking.date,
      classType: booking.type === PlanType.PT ? 'PT' : 'GROUP',
      branchId: booking.branchId,
      createdAt: new Date().toISOString()
    };

    setGeneratedCode(newCode);
    setSelectedBooking(booking);
    showToast('QR Code generated! Ask member to scan.', 'success');
  };

  const regenerateCode = () => {
    if (selectedBooking) {
      generateCompletionCode(selectedBooking);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Class Completion QR</h3>
            <p className="text-sm text-slate-500">Generate QR for members to complete class</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 p-1 rounded-xl flex mb-6">
          <button
            onClick={() => { setActiveTab('GROUP'); setGeneratedCode(null); setSelectedBooking(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
              activeTab === 'GROUP' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'
            }`}
          >
            <i className="fas fa-users mr-1"></i> Group Classes
          </button>
          <button
            onClick={() => { setActiveTab('PT'); setGeneratedCode(null); setSelectedBooking(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
              activeTab === 'PT' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'
            }`}
          >
            <i className="fas fa-user mr-1"></i> PT Sessions
          </button>
        </div>

        {!generatedCode ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                Select Member - {selectedDate}
              </h4>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                {pendingBookings.length} Pending
              </span>
            </div>
            
            {pendingBookings.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl">
                <i className="fas fa-check-circle text-4xl text-green-400 mb-3"></i>
                <p className="text-slate-500">No pending {activeTab === 'PT' ? 'PT sessions' : 'group classes'}</p>
                <p className="text-xs text-slate-400 mt-1">All classes completed for this date!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBookings.map(booking => (
                  <button
                    key={booking.id}
                    onClick={() => generateCompletionCode(booking)}
                    className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-500 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                          <i className="fas fa-user"></i>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{getMemberName(booking.memberId)}</p>
                          <p className="text-xs text-slate-500">{getClassTitle(booking)} • {booking.timeSlot}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <i className="fas fa-qrcode text-slate-300 text-xl mb-1"></i>
                        <p className="text-[10px] text-green-600 font-bold">{getCommissionInfo(booking)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <div className="bg-white p-6 rounded-3xl border-4 border-blue-100 shadow-inner inline-block mb-4">
              <QRCodeSVG 
                value={qrToken || generatedCode.code}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] text-slate-400 font-medium">Refreshes every 15 seconds</p>
            </div>
            
            <div className="space-y-2 mb-6">
              <p className="font-bold text-lg text-slate-900">{getMemberName(selectedBooking?.memberId || '')}</p>
              <p className="text-sm text-slate-500">{getClassTitle(selectedBooking!)} • {selectedBooking?.timeSlot}</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                  <i className="fas fa-coins mr-1"></i>
                  Commission: {getCommissionInfo(selectedBooking!)}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
              <p className="text-xs text-amber-700 font-medium">
                <i className="fas fa-info-circle mr-1"></i>
                Ask member to scan this QR at reception or check-out gate
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={regenerateCode}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                <i className="fas fa-redo mr-2"></i> Regenerate
              </button>
              <button
                onClick={() => { setGeneratedCode(null); setSelectedBooking(null); }}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
              >
                <i className="fas fa-arrow-left mr-2"></i> Back
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-4">
              QR expires in 10 minutes
            </p>
          </div>
        )}

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default ClassCompletionQR;
