import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import PwaInstallPrompt from './PwaInstallPrompt';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-ink">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-[240px] md:min-h-screen md:fixed md:left-0 md:top-0">
        <Sidebar />
      </aside>

      {/* Main content */}
      {/* mobile: top padding for header bar + bottom padding for tab bar */}
      <main className="flex-1 md:ml-[240px] pt-[72px] pb-[96px] md:pt-0 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 py-4 md:px-6 md:py-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile top header + bottom tab bar + full-screen menu */}
      <MobileNav />

      {/* PWA install prompt */}
      <PwaInstallPrompt />
    </div>
  );
}
