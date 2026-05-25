import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Search, BarChart2, MapPin, Database,
  LogOut, ChevronRight, Bell,
} from 'lucide-react'
import { useAuth } from '../lib/auth'

interface NavItem { to: string; icon: React.ReactNode; label: string }

const NAV: NavItem[] = [
  { to: '/',          icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/search',    icon: <Search size={18} />,          label: 'Search' },
  { to: '/analytics', icon: <BarChart2 size={18} />,       label: 'Analytics' },
  { to: '/nearby',    icon: <MapPin size={18} />,          label: 'Nearby' },
  { to: '/manage',    icon: <Database size={18} />,        label: 'Manage' },
]

const PAGE_TITLES: Record<string, string> = {
  '/':           'Market Dashboard',
  '/search':     'Property Search',
  '/analytics':  'Suburb Analytics',
  '/nearby':     'Nearby Properties',
  '/manage':     'Property Management',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const pageTitle = Object.entries(PAGE_TITLES)
    .find(([path]) => pathname === path || pathname.startsWith(path + '/'))
    ?.[1] ?? 'PropIntelligence'

  const initials = user?.fullName
    ? user.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U'

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-edge bg-void">
        {/* Logo */}
        <div className="px-6 pt-7 pb-6">
          <div className="font-display text-3xl leading-none select-none">
            <span className="text-ink-0 font-semibold tracking-tight">PROP</span>
            <span className="text-gradient-teal font-bold ml-0.5 glow-teal">INTEL</span>
          </div>
          <p className="text-ink-2 text-[10px] tracking-widest uppercase mt-1 font-mono">
            AI Property Analytics
          </p>
        </div>

        <div className="divider-gold mx-4 mb-4" />

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group relative
                ${isActive
                  ? 'bg-gradient-to-r from-teal/10 to-transparent text-teal-bright border-l-2 border-teal-bright pl-[10px]'
                  : 'text-ink-2 hover:text-ink-0 hover:bg-lift/40 border-l-2 border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-teal-bright' : 'text-ink-2 group-hover:text-ink-1'}>
                    {icon}
                  </span>
                  <span className={isActive ? 'font-medium' : ''}>{label}</span>
                  {isActive && (
                    <ChevronRight size={12} className="ml-auto text-teal/60" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Role badge */}
        <div className="mx-4 mb-3">
          <div className="px-3 py-2 rounded-lg bg-lift/30 border border-edge">
            <p className="text-[10px] font-mono text-ink-2 uppercase tracking-wider">Role</p>
            <p className="text-xs text-gold-bright font-medium capitalize mt-0.5">
              {user?.role ?? 'Consumer'}
            </p>
          </div>
        </div>

        <div className="divider-gold mx-4 mb-3" />

        {/* User + logout */}
        <div className="px-4 pb-5 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0AA8A0, #12C8C0)', color: '#04080F' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-0 font-medium truncate">{user?.fullName || user?.email}</p>
            {user?.fullName && (
              <p className="text-[10px] text-ink-2 truncate">{user.email}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-ink-2 hover:text-red-400 transition-colors p-1 rounded"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-edge bg-void/50 backdrop-blur-sm flex-shrink-0">
          <div>
            <h1 className="font-display text-xl text-ink-0 font-medium tracking-tight leading-none">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-sm relative">
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-gold rounded-full" />
            </button>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #0AA8A0, #12C8C0)', color: '#04080F' }}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
