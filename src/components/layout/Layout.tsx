import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import LiveUpdatesToast from './LiveUpdatesToast';
import { useState, useEffect } from 'react';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  useEffect(() => {
    const check = () =>
      setCollapsed(localStorage.getItem('sidebar-collapsed') === 'true');
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        id="main-content"
        className={`transition-all duration-200 ease-out ${
          collapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <div className="max-w-[1440px] mx-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
      <LiveUpdatesToast />
    </div>
  );
}