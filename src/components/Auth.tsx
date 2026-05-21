import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onLoginSuccess?: () => void;
}

export function Auth({ onLoginSuccess }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (onLoginSuccess) onLoginSuccess();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: email.split('@')[0],
            }
          }
        });
        if (error) throw error;
        alert('Cadastro realizado! Se o e-mail for real, talvez seja necessário confirmar (se configurado no Supabase). Você já pode tentar logar.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-900 rounded-lg p-8 shadow-xl border border-slate-700 max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold text-white mb-6">
        {isLogin ? 'Acessar FootSim Nuvem' : 'Criar Conta FootSim'}
      </h2>
      
      {error && (
        <div className="w-full bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleAuth} className="w-full flex flex-col gap-4">
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-1">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="seu@email.com"
            required
          />
        </div>
        
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-1">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="******"
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 mt-2"
        >
          {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
        </button>
      </form>

      <button
        onClick={() => setIsLogin(!isLogin)}
        className="mt-6 text-sm text-slate-400 hover:text-white transition-colors"
      >
        {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem conta? Faça Login'}
      </button>
    </div>
  );
}
