
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Branch, Plan, Subscription, Sale, Attendance, Booking, Feedback, UserRole, SubscriptionStatus, Communication, CommType, InventoryItem, BodyMetric, Offer } from './types';
import { MOCK_USERS, BRANCHES, MOCK_PLANS, MOCK_SUBSCRIPTIONS, MOCK_OFFERS, MOCK_ATTENDANCE, MOCK_SALES, MOCK_BOOKINGS } from './constants';
import { GoogleGenAI } from "@google/genai";

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  branches: Branch[];
  users: User[];
  plans: Plan[];
  subscriptions: Subscription[];
  sales: Sale[];
  attendance: Attendance[];
  bookings: Booking[];
  feedback: Feedback[];
  communications: Communication[];
  inventory: InventoryItem[];
  metrics: BodyMetric[];
  offers: Offer[];
  settlementRate: number;
  setSettlementRate: (rate: number) => void;
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  addBranch: (branch: Branch) => void;
  updateBranch: (id: string, updates: Partial<Branch>) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addPlan: (plan: Plan) => void;
  updatePlan: (id: string, updates: Partial<Plan>) => void;
  addSubscription: (sub: Subscription) => void;
  addSale: (sale: Sale) => void;
  recordAttendance: (att: Attendance) => void;
  updateAttendance: (id: string, updates: Partial<Attendance>) => void;
  addBooking: (booking: Booking) => void;
  addFeedback: (fb: Feedback) => void;
  updateFeedbackStatus: (id: string, status: Feedback['status']) => void;
  addInventory: (item: InventoryItem) => void;
  updateInventory: (id: string, updates: Partial<InventoryItem>) => void;
  sellInventoryItem: (itemId: string, memberId: string, quantity: number) => void;
  addMetric: (metric: BodyMetric) => void;
  addOffer: (offer: Offer) => void;
  deleteOffer: (id: string) => void;
  enrollMember: (userData: Partial<User>, planId: string, trainerId?: string, password?: string) => Promise<void>;
  purchaseSubscription: (userId: string, planId: string, paymentMethod: 'CASH' | 'CARD' | 'ONLINE', trainerId?: string) => Promise<void>;
  sendNotification: (comm: Omit<Communication, 'id' | 'timestamp' | 'status'>) => void;
  askGemini: (prompt: string, modelType?: 'flash' | 'pro') => Promise<string>;
  toast: { message: string; type: 'success' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const safeSave = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Storage Error for ${key}:`, e);
  }
};

const safeLoad = <T,>(key: string, fallback: T): T => {
  const saved = localStorage.getItem(key);
  try {
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    console.warn(`Malformed data for ${key}, resetting to fallback.`);
    return fallback;
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => safeLoad('if_user', null));
  const [branches, setBranches] = useState<Branch[]>(() => safeLoad('if_branches', BRANCHES));
  const [users, setUsers] = useState<User[]>(() => safeLoad('if_users', MOCK_USERS));
  const [plans, setPlans] = useState<Plan[]>(() => safeLoad('if_plans', MOCK_PLANS));
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => safeLoad('if_subs', MOCK_SUBSCRIPTIONS));
  const [sales, setSales] = useState<Sale[]>(() => safeLoad('if_sales', MOCK_SALES));
  const [attendance, setAttendance] = useState<Attendance[]>(() => safeLoad('if_attendance', MOCK_ATTENDANCE));
  const [bookings, setBookings] = useState<Booking[]>(() => safeLoad('if_bookings', MOCK_BOOKINGS));
  const [feedback, setFeedback] = useState<Feedback[]>(() => safeLoad('if_feedback', []));
  const [communications, setCommunications] = useState<Communication[]>(() => safeLoad('if_comms', []));
  const [inventory, setInventory] = useState<InventoryItem[]>(() => safeLoad('if_inventory', []));
  const [metrics, setMetrics] = useState<BodyMetric[]>(() => safeLoad('if_metrics', []));
  const [offers, setOffers] = useState<Offer[]>(() => safeLoad('if_offers', MOCK_OFFERS));
  const [settlementRate, setSettlementRate] = useState<number>(() => safeLoad('if_settlement_rate', 250));
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isGlobalLoading, setGlobalLoading] = useState(false);

  useEffect(() => safeSave('if_user', currentUser), [currentUser]);
  useEffect(() => safeSave('if_branches', branches), [branches]);
  useEffect(() => safeSave('if_users', users), [users]);
  useEffect(() => safeSave('if_plans', plans), [plans]);
  useEffect(() => safeSave('if_subs', subscriptions), [subscriptions]);
  useEffect(() => safeSave('if_sales', sales), [sales]);
  useEffect(() => safeSave('if_attendance', attendance), [attendance]);
  useEffect(() => safeSave('if_bookings', bookings), [bookings]);
  useEffect(() => safeSave('if_feedback', feedback), [feedback]);
  useEffect(() => safeSave('if_comms', communications), [communications]);
  useEffect(() => safeSave('if_inventory', inventory), [inventory]);
  useEffect(() => safeSave('if_metrics', metrics), [metrics]);
  useEffect(() => safeSave('if_offers', offers), [offers]);
  useEffect(() => safeSave('if_settlement_rate', settlementRate), [settlementRate]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const askGemini = async (prompt: string, modelType: 'flash' | 'pro' = 'flash') => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: modelType === 'pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || 'Unable to generate response.';
    } catch (e) {
      console.error(e);
      return 'AI services offline.';
    }
  };

  const generateInvoiceNo = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    const prefix = branch?.name.slice(0, 3).toUpperCase() || 'IF';
    const year = new Date().getFullYear();
    const count = sales.filter(s => s.branchId === branchId).length + 1001;
    return `INV/${prefix}/${year}/${count}`;
  };

  const addBranch = (b: Branch) => setBranches(prev => [...prev, b]);
  const updateBranch = (id: string, updates: Partial<Branch>) => setBranches(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  const addUser = (u: User) => setUsers(prev => [...prev, u]);
  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    if (currentUser?.id === id) setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
  };
  const deleteUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));
  const addPlan = (p: Plan) => setPlans(prev => [...prev, p]);
  const updatePlan = (id: string, updates: Partial<Plan>) => setPlans(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  const addSubscription = (s: Subscription) => setSubscriptions(prev => [...prev, s]);
  const addSale = (s: Sale) => setSales(prev => [...prev, s]);
  const recordAttendance = (a: Attendance) => setAttendance(prev => [...prev, a]);
  const updateAttendance = (id: string, updates: Partial<Attendance>) => setAttendance(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  const addBooking = (b: Booking) => setBookings(prev => [...prev, b]);
  const addFeedback = (f: Feedback) => setFeedback(prev => [...prev, f]);
  const updateFeedbackStatus = (id: string, status: Feedback['status']) => setFeedback(prev => prev.map(f => f.id === id ? { ...f, status } : f));
  const addInventory = (item: InventoryItem) => setInventory(prev => [...prev, item]);
  const updateInventory = (id: string, updates: Partial<InventoryItem>) => setInventory(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  const addMetric = (m: BodyMetric) => setMetrics(prev => [...prev, m]);
  const addOffer = (o: Offer) => setOffers(prev => [...prev, o]);
  const deleteOffer = (id: string) => setOffers(prev => prev.filter(o => o.id !== id));

  const sendNotification = (comm: Omit<Communication, 'id' | 'timestamp' | 'status'>) => {
    const user = users.find(u => u.id === comm.userId);
    const bId = comm.branchId || user?.branchId || branches[0].id;
    const branch = branches.find(b => b.id === bId);

    // Using branch-specific credentials logic
    if (comm.type === CommType.SMS && branch) {
      console.log(`[SMS Gateway] Dispatched via ${branch.smsProvider || 'DEFAULT_SMS_GATEWAY'}`);
      console.log(`[Credentials] Key: ${branch.smsApiKey ? branch.smsApiKey.substring(0, 4) + '****' : 'SYSTEM_KEY'}`);
      console.log(`[Sender ID] ${branch.smsSenderId || 'IronFlow'}`);
    } else if (comm.type === CommType.EMAIL && branch) {
      console.log(`[Email Provider] Using ${branch.emailProvider || 'SYSTEM_SMTP'}`);
      console.log(`[From Address] ${branch.emailFromAddress || 'noreply@ironflow.in'}`);
    }

    const newComm: Communication = {
      ...comm,
      id: `comm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toLocaleString(),
      status: 'DELIVERED',
      branchId: bId
    };
    setCommunications(prev => [newComm, ...prev]);
  };

  const sellInventoryItem = (itemId: string, memberId: string, quantity: number) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item || item.stock < quantity) {
      showToast('Insufficient stock!', 'error');
      return;
    }
    const branchId = item.branchId;
    const saleAmount = item.price * quantity;
    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNo: generateInvoiceNo(branchId),
      date: new Date().toISOString().split('T')[0],
      amount: saleAmount,
      memberId,
      itemId,
      staffId: currentUser?.id || 'pos',
      branchId,
      paymentMethod: 'CASH'
    };
    setInventory(prev => prev.map(i => i.id === itemId ? { ...i, stock: i.stock - quantity } : i));
    setSales(prev => [...prev, newSale]);
    showToast(`Sold ${item.name} x ${quantity}!`);
  };

  const enrollMember = async (userData: Partial<User>, planId: string, trainerId?: string, password?: string) => {
    setGlobalLoading(true);
    await new Promise(r => setTimeout(r, 1000)); // Simulate API
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      setGlobalLoading(false);
      return;
    }
    const branchId = userData.branchId || currentUser?.branchId || branches[0].id;
    const newUserId = `u-${Date.now()}`;
    const newUser: User = {
      id: newUserId,
      name: userData.name || 'New Member',
      email: userData.email || '',
      password: password, // Store chosen password
      role: UserRole.MEMBER,
      branchId,
      memberId: `IF-IND-${Math.floor(1000 + Math.random() * 9000)}`,
      avatar: `https://i.pravatar.cc/150?u=${newUserId}`,
      emergencyContact: userData.emergencyContact,
      address: userData.address,
      phone: userData.phone
    };
    const newSub: Subscription = {
      id: `s-${Date.now()}`,
      memberId: newUserId,
      planId: planId,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + plan.durationDays * 86400000).toISOString().split('T')[0],
      status: SubscriptionStatus.ACTIVE,
      branchId,
      trainerId
    };
    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNo: generateInvoiceNo(branchId),
      date: new Date().toISOString().split('T')[0],
      amount: plan.price,
      memberId: newUserId,
      planId: planId,
      staffId: currentUser?.id || 'admin',
      branchId,
      paymentMethod: 'ONLINE',
      trainerId
    };
    setUsers(prev => [...prev, newUser]);
    setSubscriptions(prev => [...prev, newSub]);
    setSales(prev => [...prev, newSale]);

    // Send Welcome Notification via SMS using branch credentials
    sendNotification({
      userId: newUserId,
      type: CommType.SMS,
      recipient: userData.phone || userData.email || 'N/A',
      body: `Welcome to IronFlow! Your athlete ID is ${newUser.memberId}. Login with your chosen token. Valid until ${newSub.endDate}.`,
      category: 'WELCOME',
      branchId: branchId
    });

    setGlobalLoading(false);
    showToast(`Member enrolled! Invoice: ${newSale.invoiceNo}`);
  };

  const purchaseSubscription = async (userId: string, planId: string, paymentMethod: 'CASH' | 'CARD' | 'ONLINE', trainerId?: string) => {
    setGlobalLoading(true);
    await new Promise(r => setTimeout(r, 1500)); // Simulate API
    const plan = plans.find(p => p.id === planId);
    const user = users.find(u => u.id === userId);
    if (!plan || !user) {
      setGlobalLoading(false);
      return;
    }
    const branchId = user.branchId!;
    const newSub: Subscription = {
      id: `s-${Date.now()}`,
      memberId: userId,
      planId: planId,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + plan.durationDays * 86400000).toISOString().split('T')[0],
      status: SubscriptionStatus.ACTIVE,
      branchId,
      trainerId
    };
    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNo: generateInvoiceNo(branchId),
      date: new Date().toISOString().split('T')[0],
      amount: plan.price,
      memberId: userId,
      planId: planId,
      staffId: currentUser?.id || 'self',
      branchId,
      paymentMethod,
      trainerId
    };
    setSubscriptions(prev => [...prev, newSub]);
    setSales(prev => [...prev, newSale]);

    // Send Renewal Confirmation
    sendNotification({
      userId: userId,
      type: CommType.SMS,
      recipient: user.phone || user.email || 'N/A',
      body: `Payment successful! Your ${plan.name} is active until ${newSub.endDate}. Ref: ${newSale.invoiceNo}`,
      category: 'PAYMENT',
      branchId: branchId
    });

    setGlobalLoading(false);
    showToast(`Payment received! Invoice: ${newSale.invoiceNo}`);
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser, branches, users, plans, subscriptions, sales, 
      attendance, bookings, feedback, communications, inventory, metrics, offers,
      settlementRate, setSettlementRate, isGlobalLoading, setGlobalLoading,
      addBranch, updateBranch, addUser, updateUser, deleteUser, addPlan, updatePlan,
      addSubscription, addSale, recordAttendance, updateAttendance, addBooking, addFeedback, updateFeedbackStatus,
      addInventory, updateInventory, sellInventoryItem, addMetric, addOffer, deleteOffer, enrollMember, purchaseSubscription, sendNotification, askGemini, toast, showToast
    }}>
      {children}
      {toast && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[9999] flex items-center gap-3 animate-[slideLeft_0.3s_ease-out] text-white font-bold ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-900'}`}>
          <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'} text-xl`}></i>
          {toast.message}
        </div>
      )}
      {isGlobalLoading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[10000] flex items-center justify-center">
           <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 animate-bounce">
              <i className="fas fa-dumbbell text-4xl text-blue-600 animate-spin"></i>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing with IronFlow Cloud...</p>
           </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
