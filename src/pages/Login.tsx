import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Lock, Shield, RefreshCw, ArrowRight, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';
import Logo from '../components/Logo';
import AppBar from '../components/AppBar';

export default function Login() {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const getDeviceId = () => {
    let devId = localStorage.getItem('gc_device_id');
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('gc_device_id', devId);
    }
    return devId;
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('username');
    if (savedUser) {
      setUsername(savedUser);
    }
  }, []);

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
          localStorage.setItem('username', res.data.username);
          localStorage.setItem('licenseKey', res.data.licenseKey);
          localStorage.setItem('isAdmin', 'false');
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
          localStorage.setItem('username', res.data.username);
          localStorage.setItem('licenseKey', res.data.key);
          if (res.data.isAdmin) {
            localStorage.setItem('isAdmin', 'true');
            localStorage.setItem('isReadOnlyAdmin', res.data.isReadOnlyAdmin ? 'true' : 'false');
          } else {
            localStorage.setItem('isAdmin', 'false');
            localStorage.setItem('isReadOnlyAdmin', 'false');
          }
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Σφάλμα κατά την αυθεντικοποίηση. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setLoading(false);
    }
  };

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

          <p className="text-xs text-gray-600 mt-6 text-center">
            Greek Cartoons Streaming Platform &bull; Protected & Encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
