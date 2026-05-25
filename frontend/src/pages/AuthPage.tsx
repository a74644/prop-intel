import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'

type Mode = 'login' | 'register'

export default function AuthPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode]               = useState<Mode>('login')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [firstName, setFirstName]     = useState('')
  const [lastName, setLastName]       = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password, firstName, lastName)
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-void">
      {/* ── Left panel — animated AU map ──────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-canvas items-center justify-center">
        {/* Grid bg */}
        <div className="absolute inset-0 bg-grid opacity-60" />

        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(18,200,192,0.08) 0%, transparent 70%)',
          }}
        />

        {/* AU Map SVG */}
        <svg
          viewBox="0 0 500 400"
          className="w-[480px] max-w-full relative z-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Rough Australia outline */}
          <path
            d="M 120 80 C 140 60 200 55 240 58 C 290 62 350 50 400 70 C 430 83 455 110 460 140
               C 465 170 450 195 445 220 C 440 250 460 270 455 295 C 448 325 420 340 400 345
               C 380 350 355 340 335 350 C 310 362 295 380 275 385 C 258 390 240 378 225 368
               C 200 352 185 320 168 305 C 148 288 120 285 105 265 C 88 243 90 215 92 195
               C 95 170 80 150 80 130 C 80 105 100 95 120 80 Z"
            fill="none"
            stroke="#1D3450"
            strokeWidth="1.5"
          />
          <path
            d="M 120 80 C 140 60 200 55 240 58 C 290 62 350 50 400 70 C 430 83 455 110 460 140
               C 465 170 450 195 445 220 C 440 250 460 270 455 295 C 448 325 420 340 400 345
               C 380 350 355 340 335 350 C 310 362 295 380 275 385 C 258 390 240 378 225 368
               C 200 352 185 320 168 305 C 148 288 120 285 105 265 C 88 243 90 215 92 195
               C 95 170 80 150 80 130 C 80 105 100 95 120 80 Z"
            fill="rgba(18,200,192,0.03)"
          />

          {/* City nodes + connection lines */}
          {/* Sydney → Melbourne */}
          <line x1="390" y1="290" x2="320" y2="320" stroke="rgba(18,200,192,0.2)" strokeWidth="1" strokeDasharray="4 4">
            <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="2s" repeatCount="indefinite" />
          </line>
          {/* Sydney → Brisbane */}
          <line x1="390" y1="290" x2="410" y2="210" stroke="rgba(18,200,192,0.2)" strokeWidth="1" strokeDasharray="4 4">
            <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="2.4s" repeatCount="indefinite" />
          </line>
          {/* Sydney → Adelaide */}
          <line x1="390" y1="290" x2="240" y2="300" stroke="rgba(201,137,34,0.15)" strokeWidth="1" strokeDasharray="4 4">
            <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="3s" repeatCount="indefinite" />
          </line>
          {/* Adelaide → Perth */}
          <line x1="240" y1="300" x2="130" y2="250" stroke="rgba(201,137,34,0.15)" strokeWidth="1" strokeDasharray="4 4">
            <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="3.5s" repeatCount="indefinite" />
          </line>

          {/* Sydney */}
          <g>
            <circle cx="390" cy="290" r="10" fill="rgba(18,200,192,0.1)" >
              <animate attributeName="r" values="10;16;10" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="390" cy="290" r="5" fill="#12C8C0" />
            <text x="400" y="285" fill="#12C8C0" fontSize="11" fontFamily="DM Sans" fontWeight="500">Sydney</text>
          </g>

          {/* Melbourne */}
          <g>
            <circle cx="320" cy="320" r="10" fill="rgba(228,165,58,0.1)">
              <animate attributeName="r" values="10;16;10" dur="3.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="3.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="320" cy="320" r="5" fill="#E4A53A" />
            <text x="330" y="315" fill="#E4A53A" fontSize="11" fontFamily="DM Sans" fontWeight="500">Melbourne</text>
          </g>

          {/* Brisbane */}
          <g>
            <circle cx="410" cy="210" r="10" fill="rgba(18,200,192,0.1)">
              <animate attributeName="r" values="10;15;10" dur="4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle cx="410" cy="210" r="4.5" fill="#12C8C0" />
            <text x="420" y="205" fill="#8799B8" fontSize="10" fontFamily="DM Sans">Brisbane</text>
          </g>

          {/* Adelaide */}
          <g>
            <circle cx="240" cy="300" r="4" fill="#E4A53A" opacity="0.8" />
            <text x="250" y="295" fill="#8799B8" fontSize="10" fontFamily="DM Sans">Adelaide</text>
          </g>

          {/* Perth */}
          <g>
            <circle cx="130" cy="250" r="10" fill="rgba(167,139,250,0.1)">
              <animate attributeName="r" values="10;15;10" dur="4.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="4.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="130" cy="250" r="4" fill="#A78BFA" />
            <text x="140" y="245" fill="#8799B8" fontSize="10" fontFamily="DM Sans">Perth</text>
          </g>

          {/* Gold Coast */}
          <circle cx="420" cy="235" r="3" fill="#F5C35A" opacity="0.7" />
        </svg>

        {/* Brand text overlay */}
        <div className="absolute bottom-12 left-0 right-0 text-center">
          <p className="text-ink-2 text-sm font-mono tracking-widest uppercase">
            35+ Properties · 6 Cities · Real-time AVM
          </p>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────────────────── */}
      <div className="w-full lg:w-[440px] flex-shrink-0 flex flex-col justify-center px-10 py-12 bg-void relative">
        {/* Subtle radial bg */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(201,137,34,0.05) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-sm mx-auto w-full">
          {/* Logo */}
          <div className="mb-8">
            <div className="font-display text-4xl leading-none select-none mb-2">
              <span className="text-ink-0 font-semibold">PROP</span>
              <span className="text-gradient-teal font-bold">INTEL</span>
            </div>
            <p className="text-ink-2 text-sm tracking-wide">
              {mode === 'login' ? 'Welcome back. Sign in to continue.' : 'Create your intelligence account.'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-panel rounded-xl p-1 mb-7 border border-edge">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                  mode === m
                    ? 'bg-gradient-to-r from-teal/20 to-teal/10 text-teal-bright border border-teal/25'
                    : 'text-ink-2 hover:text-ink-1'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-ink-2 mb-1.5 font-medium">First name</label>
                  <input
                    className="input"
                    placeholder="Alex"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-2 mb-1.5 font-medium">Last name</label>
                  <input
                    className="input"
                    placeholder="Chen"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-ink-2 mb-1.5 font-medium">Email address</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs text-ink-2 mb-1.5 font-medium">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPwd ? 'text' : 'password'}
                  placeholder={mode === 'register' ? 'Min 8 characters' : '••••••••'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink-1"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-950/30 border border-red-800/40 rounded-lg px-4 py-3">
                <AlertCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-gold btn-lg w-full mt-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 p-4 rounded-xl border border-edge bg-panel/50">
            <p className="text-xs text-ink-2 font-mono text-center">
              Demo: register any email + password (8+ chars)
            </p>
          </div>

          <p className="text-center text-xs text-ink-2 mt-5">
            PropIntelligence © 2025 · AI-Powered Property Analytics
          </p>
        </div>
      </div>
    </div>
  )
}
