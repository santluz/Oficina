
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, Wrench, ShieldCheck } from '../constants';
import { db } from '../services/db';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  // Fixed: Added 'const' to declare the navigate variable from useNavigate hook
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulated behavior
    setTimeout(() => {
      db.login(email, name || 'JV Automóveis');
      setLoading(false);
      navigate('/dashboard');
    }, 800);
  };

  return (
    <div className={`min-h-screen bg-${COLORS.bg} flex items-center justify-center p-6`}>
      <div className="w-full max-w-md animate-in">
        <div className="text-center mb-8">
          <div className={`w-12 h-12 bg-${COLORS.primary} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-cyan-500/20`}>
            <Wrench size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">JV Automóveis</h1>
          <p className="text-zinc-500 mt-2">
            {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex bg-zinc-950 p-1 rounded-xl mb-8">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isLogin ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isLogin ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Nome da Oficina</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: JV Automóveis"
                  className="w-full bg-zinc-800 border-zinc-700 text-zinc-100 px-4 py-3 rounded-xl focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-zinc-600"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">E-mail corporativo</label>
              <input 
                type="email" 
                required
                placeholder="seu@email.com"
                className="w-full bg-zinc-800 border-zinc-700 text-zinc-100 px-4 py-3 rounded-xl focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-zinc-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Senha</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className="w-full bg-zinc-800 border-zinc-700 text-zinc-100 px-4 py-3 rounded-xl focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-zinc-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className={`w-full py-4 bg-${COLORS.primary} hover:bg-${COLORS.primaryHover} text-white rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100`}
            >
              {loading ? 'Processando...' : isLogin ? 'Acessar Sistema' : 'Criar minha conta'}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-zinc-500">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>Seus dados estão protegidos</span>
          </div>
        </div>

        <p className="mt-8 text-center text-zinc-600 text-sm">
          Ao continuar, você concorda com nossos <br />
          <a href="#" className="text-zinc-400 hover:text-cyan-500 underline">Termos de Serviço</a> e <a href="#" className="text-zinc-400 hover:text-cyan-500 underline">Privacidade</a>.
        </p>
      </div>
    </div>
  );
};

export default Auth;
