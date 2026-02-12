import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { UserRole, PlanType, SubscriptionStatus } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const Dashboard: React.FC = () => {
  const { currentUser, subscriptions, plans, sales, users, attendance, metrics, sendNotification, showToast } = useAppContext();
  const [timeFilter, setTimeFilter] = useState<'7' | '15' | '30' | '60'>('30');
  const [statusFilter, setStatusFilter] = useState<'EXPIRING' | 'EXPIRED' | 'ALL'>('EXPIRING');

  if (!currentUser) return null;

  const isAdmin = [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.MANAGER].includes(currentUser.role);
  const isTrainer = currentUser.role === UserRole.TRAINER;

  // Role-based filtering for data
  const filteredSubs = currentUser?.role === UserRole.SUPER_ADMIN 
    ? subscriptions 
    : subscriptions.filter(s => s.branchId === currentUser?.branchId);
  
  const filteredSales = currentUser?.role === UserRole.SUPER_ADMIN
    ? sales
    : sales.filter(s => s.branchId === currentUser?.branchId);

  // Membership Expiry Tracking
  const today = new Date();
  
  const getExpiringMemberships = () => {
    return filteredSubs.filter(sub => {
      const user = users.find(u => u.id === sub.memberId);
      if (!user || user.role !== UserRole.MEMBER) return false;
      
      // Status filtering
      if (statusFilter === 'EXPIRED' && sub.status !== SubscriptionStatus.EXPIRED) return false;
      if (statusFilter === 'EXPIRING' && sub.status !== SubscriptionStatus.ACTIVE) return false;
      
      const endDate = new Date(sub.endDate);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (statusFilter === 'EXPIRED') {
        return endDate.getTime() < today.getTime();
      }
      
      if (statusFilter === 'EXPIRING') {
        return daysUntilExpiry >= 0 && daysUntilExpiry <= parseInt(timeFilter);
      }
      
      return true;
    });
  };

  const expiringMemberships = getExpiringMemberships();
  
  // Calculate summary statistics
  const expiredMemberships = expiringMemberships.filter(sub => {
    const endDate = new Date(sub.endDate);
    return endDate.getTime() < today.getTime();
  });
  
  const expiringToday = expiringMemberships.filter(sub => {
    const endDate = new Date(sub.endDate);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry === 0;
  });
  
  const expiringThisWeek = expiringMemberships.filter(sub => {
    const endDate = new Date(sub.endDate);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  });
  
  const expiringThisMonth = expiringMemberships.filter(sub => {
    const endDate = new Date(sub.endDate);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 7 && daysUntilExpiry <= 30;
  });

  // Send renewal notification
  const sendRenewalNotification = async (subscription: any) => {
    try {
      const user = users.find(u => u.id === subscription.memberId)!;
      const plan = plans.find(p => p.id === subscription.planId)!;
      const endDate = new Date(subscription.endDate);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      await sendNotification({
        userId: user.id,
        type: 'SMS',
        recipient: 'In-App',
        subject: `💳 Membership Renewal Reminder`,
        body: `Your ${plan.name} membership ${daysUntilExpiry <= 0 ? 'has expired' : `expires in ${daysUntilExpiry} days`} (${subscription.endDate}). Renew now to continue enjoying uninterrupted access! Contact your branch for special renewal offers.`,
        category: 'REMINDER',
        branchId: subscription.branchId
      });
      showToast(`Renewal reminder sent to ${user.name}`, 'success');
    } catch (error) {
      showToast('Failed to send notification', 'error');
    }
  };

  // Bulk send notifications
  const sendBulkNotifications = async () => {
    let successCount = 0;
    let errorCount = 0;

    for (const sub of expiringMemberships) {
      try {
        const user = users.find(u => u.id === sub.memberId)!;
        const plan = plans.find(p => p.id === sub.planId)!;
        const endDate = new Date(sub.endDate);
        const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        await sendNotification({
          userId: user.id,
          type: 'SMS',
          recipient: 'In-App',
          subject: `💳 Membership Status Update`,
          body: `Your ${plan.name} membership ${daysUntilExpiry <= 0 ? 'has expired' : `expires in ${daysUntilExpiry} days`} (${sub.endDate}). Don't miss out on your fitness journey - renew today!`,
          category: 'REMINDER',
          branchId: sub.branchId
        });
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    showToast(`Sent ${successCount} notifications (${errorCount} failed)`, 
      errorCount > 0 ? 'warning' : 'success');
  };

  // Get status badge color
  const getStatusColor = (days: number, isExpired: boolean) => {
    if (isExpired || days < 0) return 'bg-red-100 text-red-800';
    if (days <= 3) return 'bg-red-100 text-red-800';
    if (days <= 7) return 'bg-orange-100 text-orange-800';
    if (days <= 14) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  // Get status text
  const getStatusText = (days: number, isExpired: boolean) => {
    if (isExpired || days < 0) return 'EXPIRED';
    if (days === 0) return 'EXPIRES TODAY';
    if (days === 1) return 'EXPIRES TOMORROW';
    return `EXPIRES IN ${days} DAYS`;
  };

  // TRAINER DASHBOARD
  if (isTrainer) {
     return (
       <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
               <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Coach Dashboard</h2>
               <p className="text-slate-500 font-medium text-sm">Welcome back, {currentUser.name.split(' ')[0]}</p>
             </div>
             <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl border border-indigo-100 flex items-center gap-2">
               <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
               <span className="text-[10px] font-black uppercase tracking-widest">On Shift</span>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
                <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600">
                   <i className="fas fa-users text-xl"></i>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Clients</p>
                   <p className="text-3xl font-black text-slate-900">{subscriptions.filter(s => s.trainerId === currentUser.id && s.status === 'ACTIVE').length}</p>
                </div>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Active personal training</p>
             </div>

             <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
                <div className="bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-600">
                   <i className="fas fa-calendar-day text-xl"></i>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Today's Sessions</p>
                   {/* In a real app, filter bookings by date */}
                   <p className="text-3xl font-black text-slate-900">4</p>
                </div>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Next: 2:00 PM - Yoga</p>
             </div>

             <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
                <div className="bg-amber-50 w-12 h-12 rounded-2xl flex items-center justify-center text-amber-600">
                   <i className="fas fa-star text-xl"></i>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">My Rating</p>
                   <p className="text-3xl font-black text-slate-900">4.9 <span className="text-sm text-slate-400">/ 5</span></p>
                </div>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Based on member feedback</p>
             </div>
          </div>
       </div>
     );
  }

  // MEMBER DASHBOARD
  if (!isAdmin) {
    const mySub = subscriptions.find(s => s.memberId === currentUser.id && s.status === SubscriptionStatus.ACTIVE);
    const myPlan = mySub ? plans.find(p => p.id === mySub.planId) : null;
    const myAttendance = attendance.filter(a => a.userId === currentUser.id).sort((a, b) => b.date.localeCompare(a.date));
    const myMetrics = metrics.filter(m => m.memberId === currentUser.id).sort((a, b) => b.date.localeCompare(a.date));
    const latestMetric = myMetrics[0];

    return (
      <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Welcome, {currentUser.name.split(' ')[0]}</h2>
            <p className="text-slate-500 font-medium text-sm">Your personal training dashboard</p>
          </div>
          {mySub && (
            <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest">{myPlan?.name} Active</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
             <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600">
                <i className="fas fa-calendar-check text-xl"></i>
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Check-ins this month</p>
                <p className="text-3xl font-black text-slate-900">{myAttendance.length}</p>
             </div>
             <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Last visit: {myAttendance[0]?.date || 'Never'}</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
             <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600">
                <i className="fas fa-weight-scale text-xl"></i>
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Weight</p>
                <p className="text-3xl font-black text-slate-900">{latestMetric?.weight || '--'} <span className="text-sm">kg</span></p>
             </div>
             <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Updated: {latestMetric?.date || 'N/A'}</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
             <div className="bg-amber-50 w-12 h-12 rounded-2xl flex items-center justify-center text-amber-600">
                <i className="fas fa-clock text-xl"></i>
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan Validity</p>
                <p className="text-lg font-black text-slate-900 truncate">{mySub?.endDate || 'No Active Plan'}</p>
             </div>
             <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{mySub ? 'Renews automatically' : 'Purchase plan to start'}</p>
          </div>
        </div>

        <div className="bg-slate-900 p-8 md:p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
           <div className="relative z-10 max-w-xl">
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">Daily Goal Status</h3>
              <p className="text-slate-400 text-sm font-medium mb-8">You're on a 3-day streak! Consistency is the key to massive transformation. Keep showing up.</p>
              <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden mb-4">
                 <div className="bg-blue-500 h-full w-[75%] rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                 <span>Progress: 12/16 sessions</span>
                 <span>75% Completed</span>
              </div>
           </div>
           <i className="fas fa-dumbbell absolute -bottom-12 -right-12 text-[200px] text-white/5 rotate-12"></i>
        </div>
      </div>
    );
  }

  const activeCount = filteredSubs.filter(s => s.status === SubscriptionStatus.ACTIVE).length;

  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.amount, 0);
  const todayRevenue = filteredSales
    .filter(s => s.date === new Date().toISOString().split('T')[0])
    .reduce((acc, s) => acc + s.amount, 0);

  const salesByPlanData = [
    { name: 'Gym', value: filteredSubs.filter(s => plans.find(p => p.id === s.planId)?.type === PlanType.GYM).length || 0 },
    { name: 'PT', value: filteredSubs.filter(s => plans.find(p => p.id === s.planId)?.type === PlanType.PT).length || 0 },
    { name: 'Group', value: filteredSubs.filter(s => plans.find(p => p.id === s.planId)?.type === PlanType.GROUP).length || 0 },
  ].filter(d => d.value > 0);

  if (salesByPlanData.length === 0) salesByPlanData.push({ name: 'No Data', value: 1 });

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIdx = new Date().getMonth();
  
  const revenueData = months.slice(0, currentMonthIdx + 1).map((month, idx) => {
    let baseline = 140000 + (idx * 5000);
    const monthSales = filteredSales
      .filter(s => new Date(s.date).getMonth() === idx)
      .reduce((acc, s) => acc + s.amount, 0);
    
    return {
      month,
      revenue: monthSales > 0 ? monthSales : baseline
    };
  });

  const recentTransactions = [...filteredSales].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5);

  // ADMIN DASHBOARD WITH EXPIRY TRACKING
  return (
    <div className="space-y-6 md:space-y-8 animate-[fadeIn_0.5s_ease-out]">
      {/* Membership Expiry Summary Section */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Membership Expiry Tracker</h3>
              <p className="text-gray-500">Monitor upcoming membership expirations</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={sendBulkNotifications}
                disabled={expiringMemberships.length === 0}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <i className="fas fa-paper-plane"></i>
                Send Bulk Notifications ({expiringMemberships.length})
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Time Frame</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as any)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="7">Next 7 Days</option>
                  <option value="15">Next 15 Days</option>
                  <option value="30">Next 30 Days</option>
                  <option value="60">Next 60 Days</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="EXPIRING">Expiring Soon</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="ALL">All Memberships</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <div className="bg-blue-50 p-3 rounded-lg w-full">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{expiringMemberships.length}</div>
                    <div className="text-sm text-blue-800 font-bold">Members Found</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">{expiredMemberships.length}</div>
                  <div className="text-sm text-red-800 font-bold">Expired</div>
                </div>
                <i className="fas fa-exclamation-circle text-red-500 text-xl"></i>
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-600">{expiringToday.length}</div>
                  <div className="text-sm text-orange-800 font-bold">Expiring Today</div>
                </div>
                <i className="fas fa-bolt text-orange-500 text-xl"></i>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{expiringThisWeek.length}</div>
                  <div className="text-sm text-yellow-800 font-bold">Expiring This Week</div>
                </div>
                <i className="fas fa-clock text-yellow-500 text-xl"></i>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{expiringThisMonth.length}</div>
                  <div className="text-sm text-green-800 font-bold">Expiring This Month</div>
                </div>
                <i className="fas fa-calendar-check text-green-500 text-xl"></i>
              </div>
            </div>
          </div>

          {/* Detailed List */}
          {expiringMemberships.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b">
                <h4 className="font-bold text-gray-900">Expiring Memberships ({expiringMemberships.length})</h4>
              </div>
              <div className="divide-y">
                {expiringMemberships.map((sub) => {
                  const user = users.find(u => u.id === sub.memberId)!;
                  const plan = plans.find(p => p.id === sub.planId)!;
                  const endDate = new Date(sub.endDate);
                  const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isExpired = endDate.getTime() < today.getTime();

                  return (
                    <div key={sub.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <img 
                            src={user.avatar} 
                            alt={user.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                          />
                          <div>
                            <h5 className="font-bold text-gray-900">{user.name}</h5>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                              {plan.name} • {user.phone}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="text-center md:text-right">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(daysUntilExpiry, isExpired)}`}>
                              <i className={`fas ${isExpired ? 'fa-exclamation-circle' : 'fa-clock'} mr-1`}></i>
                              {getStatusText(daysUntilExpiry, isExpired)}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              Expires: {sub.endDate}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => sendRenewalNotification(sub)}
                            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-1"
                          >
                            <i className="fas fa-bell"></i>
                            Notify
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Grid - Ultra Responsive */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Members" value={filteredSubs.length} icon="fa-users" color="blue" />
        <StatCard title="Active" value={activeCount} icon="fa-check-circle" color="green" />
        <StatCard title="Total" value={formatCurrency(totalRevenue).replace('₹', '')} icon="fa-indian-rupee-sign" color="amber" />
        <StatCard title="Today" value={formatCurrency(todayRevenue).replace('₹', '')} icon="fa-bolt" color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 min-w-0">
          <h3 className="text-sm md:text-base font-black mb-6 flex items-center gap-2 uppercase tracking-tight">
            <i className="fas fa-chart-line text-blue-500"></i> Performance Trends
          </h3>
          <div className="h-64 md:h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(val) => `${val/1000}k`} stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                  formatter={(value) => formatCurrency(Number(value))} 
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 min-w-0">
          <h3 className="text-sm md:text-base font-black mb-6 flex items-center gap-2 uppercase tracking-tight">
            <i className="fas fa-chart-pie text-indigo-500"></i> Subscription Mix
          </h3>
          <div className="h-64 md:h-80 w-full flex items-center justify-center min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={salesByPlanData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                  {salesByPlanData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Transactions - Robust for all sizes */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base md:text-lg font-black uppercase tracking-tight">Recent Sales</h3>
          <div className="flex bg-green-50 text-green-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">Real-Time</div>
        </div>
        
        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center text-gray-400 italic text-sm">No sales yet.</div>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
            <table className="w-full text-left min-w-[500px] md:min-w-0">
              <thead>
                <tr className="text-gray-400 uppercase text-[9px] font-black tracking-widest border-b pb-4">
                  <th className="pb-4 px-2">Athlete</th>
                  <th className="pb-4 px-2">Plan Details</th>
                  <th className="pb-4 px-2">Value</th>
                  <th className="pb-4 px-2">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentTransactions.map((sale) => {
                  const member = users.find(u => u.id === sale.memberId);
                  const plan = plans.find(p => p.id === sale.planId);
                  return (
                    <tr key={sale.id} className="text-sm hover:bg-gray-50 transition-colors group">
                      <td className="py-4 px-2">
                        <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{member?.name}</div>
                      </td>
                      <td className="py-4 px-2">
                        <span className="text-gray-500 text-xs font-medium">{plan?.name || 'Retail Item'}</span>
                      </td>
                      <td className="py-4 px-2">
                        <span className="font-black text-green-600">{formatCurrency(sale.amount)}</span>
                      </td>
                      <td className="py-4 px-2 text-gray-400 text-xs whitespace-nowrap">{sale.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group flex items-start justify-between min-w-0">
      <div className="min-w-0">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 truncate">{title}</p>
        <p className="text-2xl font-black text-gray-900 truncate tracking-tight">{value}</p>
      </div>
      <div className={`${colorMap[color]} w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-sm`}>
        <i className={`fas ${icon} text-sm md:text-lg`}></i>
      </div>
    </div>
  );
};

export default Dashboard;