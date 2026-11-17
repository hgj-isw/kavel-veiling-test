import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Admin from './pages/Admin.jsx'
import Bieden from './pages/Bieden.jsx'
import Login from './pages/Login.jsx'
import Stand from './pages/Stand.jsx'
import { ensureSeeded } from './data/store.js'

ensureSeeded()

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={basename === '/' ? undefined : basename}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Stand />} />
            <Route path="bieden" element={<Bieden />} />
            <Route path="login" element={<Login />} />
            <Route path="admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
