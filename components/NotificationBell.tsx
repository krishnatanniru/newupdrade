
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { useNavigate } from 'react-router-dom';
import { Communication, UserRole } from '../types';

const NotificationBell: React.FC = () => {
  const { communications, currentUser, branches, markNotificationAsRead, markAllNotificationsAsRead } = useAppContext();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Get notifications relevant to the current user
  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    
    return communications
      .filter(comm => {
        // Show notifications for the user's branch or company-wide
        const isRelevantBranch = comm.branchId === 'ALL' || comm.branchId === currentUser.branchId;
        // Show notifications sent directly to this user or broadcast
        const isRelevantUser = comm.userId === currentUser.id || comm.category === 'ANNOUNCEMENT' || comm.category === 'HOLIDAY';
        return isRelevantBranch && isRelevantUser;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10); // Show last 10 notifications
  }, [communications, currentUser]);

  const unreadCount = userNotifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (category: Communication['category']) => {
    switch (category) {
      case 'HOLIDAY': return 'fa-calendar-day';
      case 'ANNOUNCEMENT': return 'fa-bullhorn';
      case 'PAYMENT': return 'fa-credit-card';
      case 'REMINDER': return 'fa-clock';
      case 'WELCOME': return 'fa-hand-wave';
      default: return 'fa-bell';
    }
  };

  const getNotificationColor = (category: Communication['category']) => {
    switch (category) {
      case 'HOLIDAY': return 'text-amber-500 bg-amber-50';
      case 'ANNOUNCEMENT': return 'text-indigo-500 bg-indigo-50';
      case 'PAYMENT': return 'text-emerald-500 bg-emerald-50';
      case 'REMINDER': return 'text-blue-500 bg-blue-50';
      case 'WELCOME': return 'text-pink-500 bg-pink-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getBranchName = (branchId: string) => {
    if (branchId === 'ALL') return 'All Branches';
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || 'Unknown';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
      >
        <i className="fas fa-bell text-lg"></i>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-[slideDown_0.2s_ease-out]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">Notifications</h3>
                <p className="text-[10px] text-slate-400 font-bold">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'No new notifications'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await markAllNotificationsAsRead();
                  }}
                  className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider"
                >
                  Mark All Read
                </button>
                <button
                  onClick={() => navigate('/communications')}
                  className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
                >
                  View All
                </button>
              </div>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {userNotifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <i className="fas fa-bell-slash text-3xl mb-3 opacity-30"></i>
                  <p className="text-sm font-medium">No notifications yet</p>
                </div>
              ) : (
                userNotifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-blue-50/30' : ''
                    }`}
                    onClick={async () => {
                      if (!notification.isRead) {
                        await markNotificationAsRead(notification.id);
                      }
                      navigate('/communications');
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getNotificationColor(notification.category)}`}>
                        <i className={`fas ${getNotificationIcon(notification.category)} text-sm`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {notification.subject || notification.category}
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {notification.body}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                            {getBranchName(notification.branchId)}
                          </span>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {userNotifications.length > 0 && (
              <div className="p-3 border-t border-slate-100 bg-slate-50 flex gap-2">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await markAllNotificationsAsRead();
                  }}
                  className="flex-1 py-2 text-[11px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Mark All Read
                </button>
                <button
                  onClick={() => {
                    navigate('/communications');
                    setIsOpen(false);
                  }}
                  className="flex-1 py-2 text-[11px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  See All
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
