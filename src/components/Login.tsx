import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup 
} from 'firebase/auth';
import { LogIn, Key, Mail, Chrome, AlertCircle, Loader } from 'lucide-react';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      let msg = 'Произошла ошибка при авторизации. Попробуйте еще раз.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Неверный адрес электронной почты или пароль.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Этот адрес электронной почты уже используется.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Пароль должен быть не менее 6 символов.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Некорректный формат адреса электронной почты.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Не удалось войти через Google. Пожалуйста, попробуйте снова.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 p-4 relative overflow-hidden">
      {/* Abstract Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-8 shadow-2xl relative rounded-xl">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-emerald-400 to-teal-300 text-zinc-950 font-black text-xl tracking-wider rounded-xl mb-3 shadow-lg font-mono">
              N
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
              Nova Finance
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Управление финансами вашей организации
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-start gap-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1.5 font-mono">
                Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 pl-10 pr-4 py-2.5 text-sm rounded-lg text-white transition-all outline-none"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1.5 font-mono">
                Пароль
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 pl-10 pr-4 py-2.5 text-sm rounded-lg text-white transition-all outline-none"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-zinc-950 font-bold py-2.5 px-4 text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none rounded-lg font-sans cursor-pointer"
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{isRegistering ? 'Создать аккаунт' : 'Войти'}</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-semibold text-zinc-500 tracking-widest font-mono">
              <span className="bg-zinc-900 px-3">Или</span>
            </div>
          </div>

          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-900/50 border border-zinc-800 text-zinc-200 font-medium py-2.5 px-4 text-sm transition-all rounded-lg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Chrome className="w-4 h-4 text-emerald-400" />
            <span>Войти через Google</span>
          </button>

          {/* Toggle link */}
          <div className="text-center mt-6 pt-4 border-t border-zinc-800/60">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors underline font-medium cursor-pointer"
              disabled={loading}
            >
              {isRegistering 
                ? 'Уже есть аккаунт? Войти' 
                : 'Нет аккаунта? Зарегистрироваться'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
