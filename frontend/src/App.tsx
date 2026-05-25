import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import SearchPage from './pages/SearchPage'
import PropertyDetailPage from './pages/PropertyDetailPage'
import SuburbAnalyticsPage from './pages/SuburbAnalyticsPage'
import PropertyManagementPage from './pages/PropertyManagementPage'
import NearbyPage from './pages/NearbyPage'

function Protected() {
  const { isAuthed } = useAuth()
  if (!isAuthed) return <Navigate to="/auth" replace />
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

function AuthRoute() {
  const { isAuthed } = useAuth()
  if (isAuthed) return <Navigate to="/" replace />
  return <AuthPage />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthRoute />} />
          <Route element={<Protected />}>
            <Route index element={<DashboardPage />} />
            <Route path="search"          element={<SearchPage />} />
            <Route path="properties/:id"  element={<PropertyDetailPage />} />
            <Route path="analytics"       element={<SuburbAnalyticsPage />} />
            <Route path="manage"          element={<PropertyManagementPage />} />
            <Route path="nearby"          element={<NearbyPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
