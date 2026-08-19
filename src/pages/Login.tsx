import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Lock, Shield, RefreshCw, ArrowRight, UserPlus, LogIn, CheckCircle2, Smartphone, ShieldAlert, Globe } from 'lucide-react';
import Logo from '../components/Logo';
import AppBar from '../components/AppBar';
import { updateScreenRecordingProtection } from '../utils/securityBridge';
import { isNativeAppEnvironment, getDeviceId } from '../utils/appEnvironment';

export default function Login() {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoChecking, setAutoChecking] = useState(true);
  const [isNativeApp, setIsNativeApp] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    // Check if the current environment is a verified APK / Native App
    const isApp = isNativeAppEnvironment();
    setIsNativeApp(isApp);

    if (!isApp) {
      setAutoChecking(false);
      return;
    }

    const isRemembered = localStorage.getItem('gc_remember_me') === 'true';
    const savedUser = localStorage.getItem('username');
    const savedKey = localStorage.getItem('licenseKey');

    // Auto-login ONLY if the user previously selected "Να παραμείνω συνδεδεμένος"
    if (isRemembered && savedUser && savedKey) {
      const deviceId = getDeviceId();
      axios.post('/api/user-status', { username: savedUser, licenseKey: savedKey, deviceId })
        .then(res => {
          if (res.data.status === 'active' || res.data.status === 'pending' || res.data.isAdmin) {
            updateScreenRecordingProtection(false);
            navigate('/dashboard', { replace: true });
          } else {
            updateScreenRecordingProtection(false);
            localStorage.removeItem('gc_remember_me');
            localStorage.removeItem('licenseKey');
            setAutoChecking(false);
          }
        })
        .catch(() => {
          updateScreenRecordingProtection(false);
          localStorage.removeItem('gc_remember_me');
          setAutoChecking(false);
        });
    } else {
      updateScreenRecordingProtection(false);
      // If not set to remember, remove any stored key so no automatic background login occurs
      if (!isRemembered) {
        localStorage.removeItem('licenseKey');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('isReadOnlyAdmin');
      }
      if (savedUser) {
        setUsername(savedUser);
      }
      setAutoChecking(false);
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const deviceId = getDeviceId();

    try {
      if (authMode === 'signup') {
        // Sign Up with Username + Password
        const res = await axios.post('/api/signup', {
          username: username.trim(),
          password: password.trim(),
          deviceId
        });

        if (res.data.success) {
          updateScreenRecordingProtection(false);
          if (rememberMe) {
            localStorage.setItem('gc_remember_me', 'true');
          } else {
            localStorage.removeItem('gc_remember_me');
          }
          localStorage.setItem('username', res.data.username);
          localStorage.setItem('licenseKey', res.data.licenseKey);
          localStorage.setItem('isAdmin', 'false');
          sessionStorage.setItem('username', res.data.username);
          sessionStorage.setItem('licenseKey', res.data.licenseKey);
          navigate('/dashboard');
        }
      } else {
        // Login with Username + Password
        const res = await axios.post('/api/login', {
          username: username.trim(),
          password: password.trim(),
          deviceId
        });

        if (res.data.success) {
          const userKey = res.data.licenseKey || res.data.key || '';
          if (rememberMe) {
            localStorage.setItem('gc_remember_me', 'true');
          } else {
            localStorage.removeItem('gc_remember_me');
          }
          localStorage.setItem('username', res.data.username);
          localStorage.setItem('licenseKey', userKey);
          sessionStorage.setItem('username', res.data.username);
          sessionStorage.setItem('licenseKey', userKey);

          if (res.data.isAdmin) {
            localStorage.setItem('isAdmin', 'true');
            localStorage.setItem('isReadOnlyAdmin', res.data.isReadOnlyAdmin ? 'true' : 'false');
            updateScreenRecordingProtection(!res.data.isReadOnlyAdmin);
          } else {
            localStorage.setItem('isAdmin', 'false');
            localStorage.setItem('isReadOnlyAdmin', 'false');
            updateScreenRecordingProtection(false);
          }
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      updateScreenRecordingProtection(false);
      setErrorMsg(err.response?.data?.error || 'Σφάλμα κατά την αυθεντικοποίηση. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setLoading(false);
    }
  };

  if (autoChecking) {
    return (
      <div className="min-h-screen bg-darker text-white flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Logo size="lg" />
          <div className="flex items-center gap-2.5 text-sm text-gray-400 font-bold mt-4">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span>Έλεγχος αποθηκευμένης σύνδεσης...</span>
          </div>
        </div>
      </div>
    );
  }

  // Security lockdown for standard web browsers
  if (!isNativeApp) {
    return (
      <div className="min-h-screen bg-[#070b13] text-white flex flex-col items-center justify-center p-5 relative overflow-hidden select-none">
        {/* Background Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-[#0e1626]/95 backdrop-blur-2xl p-8 rounded-3xl border border-red-500/30 shadow-2xl z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center justify-center mb-6 text-red-400 shadow-inner">
            <ShieldAlert className="w-10 h-10 animate-pulse" />
          </div>

          <Logo size="md" />

          <h2 className="text-xl font-black text-white mt-5 mb-2">
            Αποκλειστική Πρόσβαση μέσω Εφαρμογής
          </h2>

          <p className="text-xs text-gray-300 leading-relaxed mb-6 font-medium">
            Η σύνδεση και η αναπαραγωγή περιεχομένου μέσω απλού web browser (Chrome, Edge, Firefox, Safari) έχουν <span className="text-red-400 font-bold">απενεργοποιηθεί</span> για λόγους ασφαλείας και προστασίας από καταγραφή οθόνης.
          </p>

          <div className="w-full bg-[#070b13] border border-gray-800/80 rounded-2xl p-4 mb-6 flex flex-col gap-3 text-left">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Επίσημη Εφαρμογή APK</p>
                <p className="text-[11px] text-gray-400">Android, Android TV, Google TV & FireStick</p>
              </div>
            </div>
            <div className="border-t border-gray-800/60 pt-2.5 flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
              <Shield className="w-4 h-4 shrink-0" />
              <span>Ενεργή προστασία DRM & Anti-Screen Capture (FLAG_SECURE)</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-500">
            Παρακαλούμε ανοίξτε την εφαρμογή αποκλειστικά από την εγκατεστημένη εφαρμογή σας.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darker text-white flex flex-col relative overflow-x-hidden">
      <AppBar title={authMode === 'login' ? "Είσοδος" : "Εγγραφή"} />

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative my-auto">
        {/* Background Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[160px] pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="w-full max-w-md z-10 flex flex-col items-center py-6">
          <div className="mb-6 hover:scale-105 transition-transform duration-300">
            <Logo size="lg" />
          </div>

          <div className="bg-panel/90 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl border border-gray-800/80 shadow-2xl w-full relative">
            
            {/* Mode Selector Tabs (Login vs Sign Up) */}
            <div className="flex bg-dark p-1.5 rounded-2xl border border-gray-800 mb-6">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                className={`flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Σύνδεση</span>
              </button>

              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setErrorMsg(''); }}
                className={`flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Εγγραφή</span>
              </button>
            </div>

            {errorMsg && (
              <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                <Shield className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username + Password Fields */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider">
                  Όνομα Χρήστη (Username)
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="π.χ. giorgos123"
                    className="w-full bg-dark border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider">
                  Κωδικός Πρόσβασης (Password)
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-dark border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Stay Logged In (Remember Me) Checkbox */}
              <div className="pt-1 pb-1">
                <label className="flex items-center gap-3 text-xs text-gray-300 hover:text-white cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-md border-gray-700 bg-dark text-primary focus:ring-primary focus:ring-offset-dark cursor-pointer accent-primary shrink-0 transition-all"
                  />
                  <span className="font-semibold text-gray-300 group-hover:text-white transition-colors">
                    Να παραμείνω συνδεδεμένος
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary hover:bg-primary-dark active:scale-[0.98] text-white font-extrabold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-sm cursor-pointer mt-2"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>{authMode === 'signup' ? "Δημιουργία Λογαριασμού" : "Σύνδεση"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* No Email Disclaimer */}
              {authMode === 'signup' && (
                <div className="p-3 bg-dark/60 rounded-xl border border-gray-800/80 text-[11px] text-gray-400 text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Δεν απαιτείται email ή προσωπικά στοιχεία (100% Ανώνυμο).</span>
                </div>
              )}
            </form>
          </div>

          <div className="mt-6 pt-5 border-t border-gray-800/80 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => {
                localStorage.setItem("gc_studio_preview_mode", "landing");
                navigate("/landing");
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/40 rounded-xl text-blue-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Globe className="w-4 h-4 text-blue-400" />
              <span>🌐 Προβολή Landing Page (Προσωρινό Κουμπί)</span>
            </button>

            <p className="text-[11px] text-gray-500 text-center">
              Greek Streaming Platform &bull; Protected & Encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
