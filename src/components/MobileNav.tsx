import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  Menu,
  Home,
  ListTodo,
  BookText,
  GraduationCap,
  ChevronRight,
  Wallet,
  BookHeart,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/roadmap', icon: Target, label: '目标路线图' },
  { to: '/schedule', icon: Calendar, label: '日程管理' },
  { to: '/tasks', icon: CheckSquare, label: '任务中心' },
  { to: '/industry', icon: Building2, label: '产业调研' },
  { to: '/funds', icon: Wallet, label: '家庭资金' },
  { to: '/diary', icon: BookHeart, label: '个人日记' },
  { to: '/learning', icon: BookOpen, label: '学习追踪' },
  { to: '/journal', icon: PenLine, label: '投资笔记' },
  { to: '/skills', icon: Radar, label: '技能雷达' },
  { to: '/strategy', icon: Shield, label: '策略框架' },
  { to: '/settings', icon: Settings, label: '设置' },
];

// Bottom Tab items - 5 core tabs
const bottomTabs = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/tasks', icon: ListTodo, label: '任务' },
  { to: '/industry', icon: BookText, label: '调研' },
  { to: '/learning', icon: GraduationCap, label: '学习' },
  { to: '/settings', icon: Settings, label: '设置', isMenu: true },
];

export default function MobileNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const isOnline = navigator.onLine;

  const currentPage = navItems.find(item => item.to === location.pathname);
  const currentPageLabel = currentPage?.label || 'AlphaPath';

  const handleTabClick = (item: typeof bottomTabs[0]) => {
    if (item.isMenu) {
      setIsMenuOpen(true);
    } else {
      navigate(item.to);
    }
  };

  const isActiveTab = (to: string) => location.pathname === to;

  return (
    <>
      {/* Top header bar - mobile only */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0D1117] border-b border-[#2A3040] safe-top">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left: tap to open menu */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center gap-3 p-2 -ml-2 active:opacity-60 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl bg-gold/20 flex items-center justify-center">
              <span className="text-gold font-bold text-lg font-display">α</span>
            </div>
            <div className="text-left">
              <h2 className="text-base font-semibold text-text-primary leading-tight">{currentPageLabel}</h2>
              <p className="text-xs text-text-muted leading-tight">AlphaPath</p>
            </div>
          </button>

          {/* Right: menu button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1A1F2E] text-text-secondary active:bg-[#242938] transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Bottom Tab bar - mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0D1117] border-t border-[#2A3040] safe-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {bottomTabs.map((item) => {
            const active = isActiveTab(item.to);
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleTabClick(item)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 h-full min-w-0 transition-colors ${
                  active ? 'text-gold' : 'text-text-muted active:text-text-primary'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    active ? 'bg-gold/15' : 'bg-transparent'
                  }`}
                >
                  <Icon size={22} className={active ? 'text-gold' : ''} />
                </div>
                <span className={`text-[11px] font-medium ${active ? 'text-gold' : 'text-text-muted'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Full-screen navigation overlay */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] bg-[#0F1419] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 h-16 border-b border-[#2A3040] safe-top flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center">
                <span className="text-gold font-bold text-xl font-display">α</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gold font-display">AlphaPath</h1>
                <p className="text-xs text-text-muted">基金经理成长管理</p>
              </div>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#1A1F2E] text-text-secondary active:bg-[#242938]"
            >
              <X size={22} />
            </button>
          </div>

          {/* Status bar */}
          <div className="px-5 py-3 flex items-center justify-between text-sm text-text-muted border-b border-[#1A1F2E]">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Wifi size={14} className="text-positive" />
                  <span>已联网</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} className="text-urgent" />
                  <span>离线模式</span>
                </>
              )}
            </div>
            <div className="text-xs">
              {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
            </div>
          </div>

          {/* Navigation items - large touch targets, scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {/* Quick shortcuts section */}
            <div className="mb-3">
              <p className="text-xs text-text-muted px-3 mb-2 font-medium tracking-wide">快捷入口</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {navItems.slice(0, 4).map(({ to, icon: Icon, label }) => {
                  const active = location.pathname === to;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors ${
                        active ? 'bg-gold/15 border border-gold/30' : 'bg-[#1A1F2E] border border-transparent active:bg-[#242938]'
                      }`}
                    >
                      <Icon size={20} className={active ? 'text-gold' : 'text-text-secondary'} />
                      <span className={`text-sm font-medium ${active ? 'text-gold' : 'text-text-primary'}`}>{label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* All features */}
            <p className="text-xs text-text-muted px-3 mb-2 font-medium tracking-wide">全部功能</p>
            {navItems.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to;
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-colors ${
                    isActive
                      ? 'bg-gold/15 text-gold border border-gold/20'
                      : 'text-text-primary active:bg-[#1A1F2E]'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isActive ? 'bg-gold/20' : 'bg-[#1A1F2E]'
                  }`}>
                    <Icon size={18} className={isActive ? 'text-gold' : 'text-text-secondary'} />
                  </div>
                  <span className="text-base font-medium flex-1">{label}</span>
                  <ChevronRight size={16} className={isActive ? 'text-gold' : 'text-text-muted'} />
                </NavLink>
              );
            })}
          </div>

          {/* User info at bottom */}
          <div className="px-5 py-4 border-t border-[#2A3040] safe-bottom bg-[#0D1117] flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold text-lg font-semibold flex-shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base text-text-primary truncate font-medium">{user?.name || '用户'}</p>
                <p className="text-sm text-text-muted truncate">{user?.email || ''}</p>
              </div>
              <button
                onClick={logout}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#1A1F2E] text-text-muted active:bg-[#242938]"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
