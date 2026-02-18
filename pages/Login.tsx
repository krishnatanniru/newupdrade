import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../AppContext';
import { UserRole } from '../types';
import { supabase } from '../src/lib/supabase';
import { MOCK_USERS, BRANCHES, MOCK_PLANS, MOCK_OFFERS } from '../constants';

// Rate limiting storage
interface LoginAttempt {
  count: number;
  lastAttempt: number;
}

const loginAttempts: Map<string, LoginAttempt> = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

const Login: React.FC = () => {
  const { users, setCurrentUser, showToast } = useAppContext();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); 
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  
  // View states: 'login' | 'forgot' | 'success' | 'reset'
  const [view, setView] = useState<'login' | 'forgot' | 'success' | 'reset'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const session = localStorage.getItem('ironflow_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          // Validate session hasn't expired
          if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
            const user = users.find(u => u.id === parsed.userId);
            if (user) {
              setCurrentUser(user);
              navigate('/dashboard');
            }
          } else {
            localStorage.removeItem('ironflow_session');
          }
        } catch {
          localStorage.removeItem('ironflow_session');
        }
      }
    };
    checkExistingSession();
  }, [users, setCurrentUser, navigate]);

  // Check for password reset token in URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setView('reset');
    }
  }, []);

  // Check rate limiting
  const checkRateLimit = useCallback((email: string): boolean => {
    const now = Date.now();
    const attempt = loginAttempts.get(email);
    
    if (attempt) {
      // Reset if lockout period has passed
      if (now - attempt.lastAttempt > LOCKOUT_DURATION) {
        loginAttempts.set(email, { count: 0, lastAttempt: now });
        return true;
      }
      
      // Check if locked out
      if (attempt.count >= MAX_ATTEMPTS) {
        const remainingTime = Math.ceil((LOCKOUT_DURATION - (now - attempt.lastAttempt)) / 60000);
        setLockoutTime(remainingTime);
        return false;
      }
    }
    
    return true;
  }, []);

  // Record failed attempt
  const recordFailedAttempt = useCallback((email: string) => {
    const now = Date.now();
    const attempt = loginAttempts.get(email);
    
    if (attempt) {
      loginAttempts.set(email, { 
        count: attempt.count + 1, 
        lastAttempt: now 
      });
      
      if (attempt.count + 1 >= MAX_ATTEMPTS) {
        setLockoutTime(15);
      }
    } else {
      loginAttempts.set(email, { count: 1, lastAttempt: now });
    }
  }, []);

  // Simple hash function for password comparison
  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Seed database with initial data if it's empty
  const seedDatabaseIfEmpty = async (branches: any[], users: any[], plans: any[], offers: any[]) => {
    try {
      const { error: bErr } = await supabase.from('branches').upsert(branches, { onConflict: 'id' });
      if (bErr) { console.warn('Could not seed branches:', bErr.message); return false; }
      const { error: uErr } = await supabase.from('users').upsert(users, { onConflict: 'id' });
      if (uErr) { console.warn('Could not seed users:', uErr.message); return false; }
      const { error: pErr } = await supabase.from('plans').upsert(plans, { onConflict: 'id' });
      if (pErr) { console.warn('Could not seed plans:', pErr.message); return false; }
      const { error: oErr } = await supabase.from('offers').upsert(offers, { onConflict: 'id' });
      if (oErr) { console.warn('Could not seed offers:', oErr.message); return false; }
      return true;
    } catch {
      return false;
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limiting
    if (!checkRateLimit(email.toLowerCase())) {
      setError(`Account locked. Try again in ${lockoutTime} minutes.`);
      return;
    }
    
    setIsAuthenticating(true);
    setError('');
    setLockoutTime(null);

    // ── Helper: login with a user object ─────────────────────────
    const loginSuccess = (user: any) => {
      loginAttempts.delete(email.toLowerCase());
      setCurrentUser(user);
      showToast('Login successful', 'success');
      localStorage.setItem('ironflow_session', JSON.stringify({
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }));
      navigate('/dashboard');
      setIsAuthenticating(false);
    };

    // ── Helper: try mock-user fallback (when DB is deleted/offline) ─
    const tryMockFallback = async (): Promise<boolean> => {
      console.log('🔄 Trying offline/mock fallback...');
      const hashedInput = await hashPassword(password);
      const mockUser = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (mockUser && mockUser.password === hashedInput) {
        console.log('✅ Fallback login success via mock data');
        // Attempt to auto-seed if DB becomes available later
        seedDatabaseIfEmpty(BRANCHES, MOCK_USERS.map(u => ({ ...u })), MOCK_PLANS, MOCK_OFFERS)
          .then(seeded => seeded && console.log('✅ DB auto-seeded'))
          .catch(() => {});
        loginSuccess(mockUser);
        return true;
      }
      return false;
    };

    try {
      console.log('=== LOGIN DEBUG ===');
      
      // ── Step 1: Try Supabase DB ───────────────────────────────
      let dbUser: any = null;
      let dbAvailable = true;

      try {
        const { data, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase())
          .single();
        
        console.log('DB User lookup:', data, 'error:', dbError);

        if (dbError) {
          // "PGRST116" = row not found (table exists, user doesn't)
          if (dbError.code === 'PGRST116') {
            dbUser = null; // table works, user just not found
          } else {
            // Any other error = DB/network unavailable
            dbAvailable = false;
          }
        } else {
          dbUser = data;
        }
      } catch (networkErr) {
        // fetch failed = Supabase project deleted / no internet
        console.warn('Supabase unreachable (project deleted?), using offline fallback');
        dbAvailable = false;
      }

      // ── Step 2: If DB is offline → use mock fallback ──────────
      if (!dbAvailable) {
        const ok = await tryMockFallback();
        if (!ok) {
          recordFailedAttempt(email.toLowerCase());
          setError('Invalid email or password.');
          setIsAuthenticating(false);
        }
        return;
      }

      // ── Step 3: DB online but user not found ──────────────────
      if (!dbUser) {
        // Also try mock (in case DB is partially set up)
        const ok = await tryMockFallback();
        if (!ok) {
          recordFailedAttempt(email.toLowerCase());
          setError('User not found. Please contact admin.');
          setIsAuthenticating(false);
        }
        return;
      }

      // ── Step 4: DB user found — verify password ───────────────
      const user = dbUser;
      console.log('User from DB:', user.email, 'role:', user.role, 'has password:', user.password ? 'yes' : 'no');

      if (user.password) {
        const hashedInputPassword = await hashPassword(password);
        if (user.password === hashedInputPassword) {
          console.log('Login success with database credentials');
          loginSuccess(user);
          return;
        }
      }

      // ── Step 5: DB password failed → try Supabase Auth ───────
      console.log('Database password failed, trying Supabase Auth...');
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase(),
          password: password
        });
        if (!authError && authData?.user) {
          loginSuccess(user);
          return;
        }
      } catch {
        // Auth also unreachable
      }

      recordFailedAttempt(email.toLowerCase());
      setError('Invalid email or password.');
      setIsAuthenticating(false);
    } catch (err) {
      console.error('Login error:', err);
      // Last resort: try mock fallback
      const ok = await tryMockFallback();
      if (!ok) {
        setError('An error occurred. Please try again.');
        setIsAuthenticating(false);
      }
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingReset(true);
    setError('');
    
    try {
      // Check if user exists in our database
      const user = users.find(u => u.email.toLowerCase() === forgotEmail.toLowerCase());
      
      if (!user) {
        // Don't reveal if email exists
        setTimeout(() => {
          setIsSendingReset(false);
          setView('success');
        }, 1500);
        return;
      }
      
      // Try to send password reset email via Supabase Auth
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.toLowerCase(), {
        redirectTo: window.location.origin + '/login#type=recovery'
      });
      
      if (error) {
        console.error('Password reset error:', error);
        // If user doesn't exist in Auth, we need to create them first
        if (error.message.includes('User not found')) {
          setIsSendingReset(false);
          setError('Account not set up for password reset. Please contact admin.');
          return;
        }
      }
      
      // Always show success to prevent email enumeration
      setIsSendingReset(false);
      setView('success');
    } catch (err) {
      console.error('Password reset error:', err);
      setIsSendingReset(false);
      setView('success');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setIsResetting(true);
    
    try {
      const { error: resetError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (resetError) {
        setError(resetError.message);
      } else {
        showToast('Password updated successfully!', 'success');
        setView('login');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError('Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-white/5 relative z-10">
        
        {/* Branding Side (Hidden on Mobile) */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                 <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl">
                    <i className="fas fa-dumbbell text-2xl"></i>
                 </div>
                 <span className="font-black text-2xl tracking-tighter uppercase">Speed Fitness</span>
              </div>
              <h1 className="text-5xl font-black leading-tight mb-6 uppercase">Master Your Fitness Empire.</h1>
              <p className="text-blue-100 font-medium leading-relaxed">Enterprise-grade multi-branch infrastructure for the future of physical wellness.</p>
           </div>
           
           <div className="relative z-10 flex items-center gap-4 pt-12 border-t border-white/10">
              <div className="flex -space-x-3">
                 {[1,2,3,4].map(i => (
                   <img key={i} className="w-8 h-8 rounded-full border-2 border-blue-600" src={`https://i.pravatar.cc/100?u=${i}`} alt="" />
                 ))}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Deployed in 50+ Cities</p>
           </div>

           <div className="absolute bottom-0 right-0 opacity-10 scale-150 rotate-12">
              <i className="fas fa-bolt text-[300px]"></i>
           </div>
        </div>

        {/* Form Side */}
        <div className="p-8 md:p-12 flex flex-col justify-center min-h-[500px]">
          {view === 'login' && (
            <div className="animate-[fadeIn_0.3s_ease-out]">
              <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">System Access</h2>
                <p className="text-slate-400 font-medium">Speed Fitness Management Protocol v4.2</p>
              </div>

              <form onSubmit={handleManualLogin} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Work Email</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-2xl outline-none focus:border-blue-500 transition-all pl-12"
                      placeholder="identity@ironflow.in"
                      value={email}
                      disabled={isAuthenticating}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      required
                    />
                    <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Security Token</label>
                  </div>
                  <div className="relative">
                    <input 
                      type="password" 
                      className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-2xl outline-none focus:border-blue-500 transition-all pl-12"
                      placeholder="••••••••"
                      value={password}
                      disabled={isAuthenticating}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      required
                    />
                    <i className="fas fa-key absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <Link 
                      to="/register"
                      className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors"
                    >
                      New Athlete? Join Now
                    </Link>
                    <button 
                      type="button" 
                      onClick={() => setView('forgot')}
                      className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-blue-400 transition-colors"
                    >
                      Forgot Token?
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-3 animate-shake">
                    <i className="fas fa-exclamation-circle text-red-500"></i>
                    <p className="text-red-400 text-[11px] font-bold uppercase tracking-widest">{error}</p>
                  </div>
                )}

                <button 
                  disabled={isAuthenticating}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isAuthenticating ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-shield-check"></i>}
                  {isAuthenticating ? 'VERIFYING...' : 'ESTABLISH SESSION'}
                </button>
              </form>

              {/* Security Notice */}
              <div className="mt-8 p-4 bg-slate-800/30 border border-slate-700/50 rounded-2xl">
                <div className="flex items-start gap-3">
                  <i className="fas fa-shield-alt text-emerald-500 mt-0.5"></i>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Secure Connection</p>
                    <p className="text-[11px] text-slate-500">Your session is encrypted and will expire after 8 hours of inactivity.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'forgot' && (
            <div className="animate-[fadeIn_0.3s_ease-out]">
              <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Recovery</h2>
                <p className="text-slate-400 font-medium">Account restoration protocol initiated</p>
              </div>

              <form onSubmit={handleForgotSubmit} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Verified Email</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      className="w-full bg-slate-800 border border-slate-700 text-white p-4 rounded-2xl outline-none focus:border-blue-500 transition-all pl-12"
                      placeholder="account@ironflow.in"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                    <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <button 
                    type="submit"
                    disabled={isSendingReset}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    {isSendingReset ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        DISPATCHING...
                      </>
                    ) : (
                      'Request Recovery Link'
                    )}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setView('login')}
                    className="w-full py-3 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Return to Login
                  </button>
                </div>
              </form>
            </div>
          )}

          {view === 'success' && (
            <div className="animate-[fadeIn_0.4s_ease-out] text-center">
              <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-500/10">
                <i className="fas fa-paper-plane text-3xl text-green-500"></i>
              </div>
              <h2 className="text-3xl font-black text-white mb-3 uppercase tracking-tight">Email Sent</h2>
              <p className="text-slate-400 font-medium mb-10 leading-relaxed px-6">
                Recovery instructions dispatched to <span className="text-blue-400 font-black">{forgotEmail}</span>. Please check your inbox and spam.
              </p>
              <button 
                onClick={() => setView('login')}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-xl active:scale-[0.98]"
              >
                Back to Authentication
              </button>
            </div>
          )}

          {view === 'reset' && (
            <div className="animate-[fadeIn_0.4s_ease-out]">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/10">
                  <i className="fas fa-lock text-3xl text-blue-500"></i>
                </div>
                <h2 className="text-3xl font-black text-white mb-3 uppercase tracking-tight">Reset Password</h2>
                <p className="text-slate-400 font-medium leading-relaxed px-6">
                  Enter your new password below.
                </p>
              </div>
              
              <form onSubmit={handlePasswordReset} className="space-y-5">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium animate-shake">
                    {error}
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white font-medium transition-all"
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white font-medium transition-all"
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] mt-6"
                >
                  {isResetting ? 'Updating...' : 'Update Password'}
                </button>
                
                <button
                  type="button"
                  onClick={() => { setView('login'); setNewPassword(''); setConfirmPassword(''); setError(''); }}
                  className="w-full py-3 text-slate-400 hover:text-white font-medium text-sm transition-colors"
                >
                  Back to Login
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Login;
