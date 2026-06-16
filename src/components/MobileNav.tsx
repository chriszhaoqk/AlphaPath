import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  Calendar,
  CheckSquare,
  BookOpen,
  PenLine,
  Radar,
  Shield,
  Settings,
  X,
  LogOut,
  Wifi,
  WifiOff,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/roadmap', icon: Target, label: '目标路线图' },
  { to: '/schedule', icon: Calendar, label: '日程管理' },
  { to: '/tasks', icon: CheckSquare, label: '任务中心' },
  { to: '/industry', icon: Building2, label: '产业调研' },
  { to: '/learning', icon: BookOpen, label: '学习追踪' },
  { to: '/journal', icon: PenLine, label: '投资日记' },
  { to: '/skills', icon: Radar, label: '技能雷达' },
  { to: '/strategy', icon: Shield, label: '策略框架' },
  { to: '/settings', icon: Settings, label: '设置' },
];

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const isOnline = navigator.onLine;

  const currentPage = navItems.find(item => item.to === location.pathname);
  const currentPageLabel = currentPage?.label || 'AlphaPath';

  return (
    <>
      {/* Top header bar - mobile only */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0D1117] border-b border-[#2A3040] safe-top">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-3 p-2 -ml-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
              <span className="text-gold font-bold text-lg font-display">α</span>
            </div>
            <span className="text-lg font-semibold text-text-primary">{currentPageLabel}</span>
          </button>
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi size={18} className="text-positive" />
            ) : (
              <WifiOff size={18} className="text-urgent" />
            )}
          </div>
        </div>
      </div>

      {/* Full-screen navigation overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[100] bg-[#0F1419]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-[#2A3040]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center">
                <span className="text-gold font-bold text-xl font-display">α</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gold font-display">AlphaPath</h1>
                <p className="text-xs text-text-muted">基金经理成长管理系统</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#1A1F2E] text-text-secondary"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation items - large touch targets */}
          <nav className="px-4 py-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            {navItems.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to;
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-lg transition-all ${
                    isActive
                      ? 'bg-gold/15 text-gold border border-gold/30'
                      : 'text-text-secondary hover:text-text-primary hover:bg-[#1A1F2E]'
                  }`}
                >
                  <Icon size={24} className={isActive ? 'text-gold' : ''} />
                  <span className="font-medium">{label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User info at bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-6 py-5 border-t border-[#2A3040] safe-bottom bg-[#0D1117]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold text-lg font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base text-text-primary truncate">{user?.name || '用户'}</p>
                <p className="text-sm text-text-muted truncate">{user?.email || ''}</p>
              </div>
              <button
                onClick={logout}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#1A1F2E] text-text-muted hover:text-urgent transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
