import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(email, password, name);
      navigate('/');
    } catch {
      // error is set in store
    }
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gold font-display tracking-wide">
            AlphaPath
          </h1>
          <p className="text-text-secondary mt-2 text-sm">基金经理成长管理系统</p>
        </div>

        {/* Card */}
        <div className="card p-5 md:p-8">
          <h2 className="text-lg md:text-xl font-semibold text-text-primary mb-4 md:mb-6 font-display">
            注册
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-urgent/10 border border-urgent/20 rounded-lg text-urgent text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError();
                }}
                className="w-full px-3 py-3 md:px-4 md:py-2.5 bg-[#0F1419] border border-[#2A3040] rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-gold transition-colors"
                placeholder="你的姓名"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError();
                }}
                className="w-full px-3 py-3 md:px-4 md:py-2.5 bg-[#0F1419] border border-[#2A3040] rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-gold transition-colors"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError();
                }}
                className="w-full px-3 py-3 md:px-4 md:py-2.5 bg-[#0F1419] border border-[#2A3040] rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-gold transition-colors"
                placeholder="至少6位密码"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gold py-2.5 md:py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          <p className="mt-4 md:mt-6 text-center text-sm text-text-secondary">
            已有账号？{' '}
            <Link to="/login" className="text-gold hover:text-gold-light transition-colors">
              登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
