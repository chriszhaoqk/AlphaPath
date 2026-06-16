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
  { to: '/journal', icon: PenLine, label: '投资笔记' },
  { to: '/skills', icon: Radar, label: '技能雷达' },
  { to: '/strategy', icon: Shield, label: '策略框架' },
  { to: '/settings', icon: Settings, label: '设置' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const isOnline = navigator.onLine;

  return (
    <div className="flex flex-col h-full bg-[#0D1117] border-r border-[#2A3040]">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#2A3040]">
        <h1 className="text-2xl font-bold text-gold font-display tracking-wide">
          AlphaPath
        </h1>
        <p className="text-xs text-text-muted mt-1">基金经理成长管理系统</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-[#1A1F2E] text-gold border-l-2 border-gold pl-[10px]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-[#1A1F2E]/50'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-gold' : ''} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Sync status */}
      <div className="px-6 py-3 border-t border-[#2A3040]">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          {isOnline ? (
            <>
              <Wifi size={12} className="text-positive" />
              <span>已同步</span>
            </>
          ) : (
            <>
              <WifiOff size={12} className="text-urgent" />
              <span>离线模式</span>
            </>
          )}
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-t border-[#2A3040]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-sm font-semibold">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary truncate">{user?.name || '用户'}</p>
            <p className="text-xs text-text-muted truncate">{user?.email || ''}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-text-muted hover:text-urgent transition-colors"
            title="退出登录"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
