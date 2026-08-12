import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Lightbulb,
  MessageSquare,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Radio,
  Gauge,
  LayoutGrid,
  Zap,
  FlaskConical,
  Compass,
  Swords,
  Mic,
  Network,
  UploadCloud,
} from 'lucide-react';
import { useLiveUpdates } from '../../lib/liveUpdates';

const navGroups: { label: string; items: { to: string; icon: typeof LayoutDashboard; label: string }[] }[] = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/command-center', icon: LayoutGrid, label: 'Command Center' },
      { to: '/data-import', icon: UploadCloud, label: 'Import Data' },
      { to: '/live-demo', icon: Zap, label: 'Live Demo' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/insights', icon: Lightbulb, label: 'Insights' },
      { to: '/timeline', icon: Radio, label: 'Timeline' },
      { to: '/evaluation', icon: Gauge, label: 'Evaluation' },
      { to: '/memory-graph', icon: Network, label: 'Memory Graph' },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { to: '/simulator', icon: FlaskConical, label: 'Simulator' },
      { to: '/strategy', icon: Compass, label: 'Strategy' },
      { to: '/debate', icon: Swords, label: 'Debate' },
      { to: '/meeting', icon: Mic, label: 'Meetings' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/slack', icon: MessageSquare, label: 'Slack' },
      { to: '/reports', icon: FileText, label: 'Reports' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    return stored === 'true';
  });
  const { connected } = useLiveUpdates(1);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  return (
    <aside
      aria-label="Main navigation"
      className={`fixed left-0 top-0 h-full z-40 flex flex-col border-r border-border bg-background transition-all duration-200 ease-out ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-on-primary" />
            </div>
            <span className="font-heading font-semibold text-sm text-foreground">
              AI CEO
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Sparkles className="w-4 h-4 text-on-primary" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-4 overflow-y-auto" aria-label="Main">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-foreground-secondary/70">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-primary/15 text-primary'
                        : 'text-foreground-secondary hover:bg-muted hover:text-foreground'
                    } ${collapsed ? 'justify-center' : ''}`
                  }
                  title={collapsed ? label : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-border space-y-1">
        <div className={`flex items-center gap-2 px-3 py-1.5 text-xs text-foreground-secondary ${collapsed ? 'justify-center' : ''}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${connected ? 'bg-success pulse-dot' : 'bg-foreground-secondary/40'}`} />
          {!collapsed && <span>{connected ? 'Live' : 'Reconnecting…'}</span>}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-foreground-secondary hover:bg-muted hover:text-foreground transition-all duration-150 cursor-pointer"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}