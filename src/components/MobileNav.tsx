import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  PenLine,
  BookOpen,
  MoreHorizontal,
  Target,
  Calendar,
  Radar,
  Shield,
  Settings,
} from 'lucide-react';

const mainTabs = [
  { to: '/', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/tasks', icon: CheckSquare, label: '任务' },
  { to: '/journal', icon: PenLine, label: '日记' },
  { to: '/learning', icon: BookOpen, label: '学习' },
];

const moreItems = [
  { to: '/roadmap', icon: Target, label: '目标路线图' },
  { to: '/schedule', icon: Calendar, label: '日程管理' },
  { to: '/skills', icon: Radar, label: '技能雷达' },
  { to: '/strategy', icon: Shield, label: '策略框架' },
  { to: '/settings', icon: Settings, label: '设置' },
];

export default function MobileNav() {
  const [showMore, setShowMore] = useState(false);
  const location = useLocation();

  return (
    <div className="relative">
      {/* More dropdown */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMore(false)}
          />
          <div className="absolute bottom-full left-0 right-0 bg-[#1A1F2E] border-t border-[#2A3040] rounded-t-xl p-4 z-50 animate-fade-in-up">
            <div className="grid grid-cols-3 gap-4">
              {moreItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setShowMore(false)}
                  className={`flex flex-col items-center gap-1.5 py-2 text-xs transition-colors ${
                    location.pathname === to
                      ? 'text-gold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bottom tab bar */}
      <div className="bg-[#0D1117] border-t border-[#2A3040] flex items-center justify-around px-2 py-2">
        {mainTabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 text-xs transition-colors ${
              location.pathname === to
                ? 'text-gold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setShowMore(!showMore)}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 text-xs transition-colors ${
            showMore ? 'text-gold' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <MoreHorizontal size={20} />
          <span>更多</span>
        </button>
      </div>
    </div>
  );
}
