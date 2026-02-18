import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateUserQR } from '../src/lib/qrAttendance';
import { User } from '../types';

interface UserQRCodeProps {
  user: User;
  compact?: boolean; // smaller card for embedding
}

const UserQRCode: React.FC<UserQRCodeProps> = ({ user, compact = false }) => {
  const [showCard, setShowCard] = useState(false);

  const qrValue = useMemo(
    () => generateUserQR(user.id, user.role, user.name, user.memberId),
    [user.id, user.role, user.name, user.memberId]
  );

  const roleColor: Record<string, string> = {
    MEMBER: 'from-blue-600 to-blue-800',
    TRAINER: 'from-purple-600 to-purple-800',
    RECEPTIONIST: 'from-emerald-600 to-emerald-800',
    MANAGER: 'from-orange-600 to-orange-800',
    BRANCH_ADMIN: 'from-red-600 to-red-800',
    SUPER_ADMIN: 'from-slate-700 to-slate-900',
    STAFF: 'from-teal-600 to-teal-800',
  };
  const gradient = roleColor[user.role] || 'from-slate-600 to-slate-800';

  if (compact) {
    return (
      <button
        onClick={() => setShowCard(true)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-sm font-bold text-slate-700"
      >
        <i className="fas fa-qrcode text-slate-500"></i>
        My QR
      </button>
    );
  }

  return (
    <>
      {/* QR Card */}
      <div className={`bg-gradient-to-br ${gradient} rounded-3xl p-6 text-white shadow-2xl`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Personal ID</p>
            <p className="font-black text-lg leading-tight">{user.name}</p>
            {user.memberId && (
              <p className="font-mono text-sm text-white/70">{user.memberId}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">{user.role.replace('_', ' ')}</p>
            {user.avatar && (
              <img src={user.avatar} alt="" className="w-10 h-10 rounded-xl mt-1 border-2 border-white/30 object-cover" />
            )}
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl p-4 flex items-center justify-center mb-4">
          <QRCodeSVG
            value={qrValue}
            size={180}
            level="H"
            includeMargin={false}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fas fa-shield-halved text-white/60 text-xs"></i>
            <span className="text-[10px] text-white/50 font-medium">Signed · Tamper-proof</span>
          </div>
          <div className="flex items-center gap-1">
            <i className="fas fa-infinity text-white/40 text-xs"></i>
            <span className="text-[10px] text-white/40">No expiry</span>
          </div>
        </div>
      </div>

      {/* Instruction note */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mt-3">
        <div className="flex items-start gap-3">
          <i className="fas fa-circle-info text-blue-500 mt-0.5 text-sm"></i>
          <div>
            <p className="text-sm font-bold text-blue-800">How to use your personal QR</p>
            <p className="text-xs text-blue-600 mt-1 leading-relaxed">
              Show this QR to the receptionist — they can scan it to check you in directly.
              Alternatively, scan the <strong>kiosk QR</strong> at the gym entrance yourself.
            </p>
          </div>
        </div>
      </div>

      {/* Fullscreen modal */}
      {showCard && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowCard(false)}
        >
          <div
            className={`bg-gradient-to-br ${gradient} rounded-3xl p-8 text-white shadow-2xl w-full max-w-xs`}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-20 h-20 rounded-2xl mx-auto mb-3 border-4 border-white/30 object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl mx-auto mb-3 bg-white/20 flex items-center justify-center">
                  <i className="fas fa-user text-3xl text-white/60"></i>
                </div>
              )}
              <p className="font-black text-2xl">{user.name}</p>
              {user.memberId && <p className="font-mono text-white/70">{user.memberId}</p>}
              <p className="text-xs uppercase tracking-widest text-white/40 mt-1">{user.role.replace('_', ' ')}</p>
            </div>

            <div className="bg-white rounded-2xl p-5 flex items-center justify-center mb-4">
              <QRCodeSVG value={qrValue} size={220} level="H" includeMargin={false} />
            </div>

            <p className="text-center text-white/60 text-xs">Show this to the receptionist or kiosk</p>
            <button
              onClick={() => setShowCard(false)}
              className="mt-4 w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default UserQRCode;
