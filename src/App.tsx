import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { SearchPage } from './pages/SearchPage';
import { Header } from './components/Header';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Les données ne deviennent jamais périmées automatiquement
      cacheTime: Infinity, // Le cache ne expire jamais automatiquement
      retry: 3,
      refetchOnWindowFocus: false, // Pas de rechargement quand on change de fenêtre
      refetchOnMount: true, // Permettre le chargement au montage initial
      refetchOnReconnect: false // Pas de rechargement à la reconnexion internet
    }
  }
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user?.is_admin) {
    return <Navigate to="/" />;
  }
  return <>{children}</>;
}

export function App() {
  const { token } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-900 text-gray-100">
          {token && <Header />}
          <Routes>
            <Route
              path="/login"
              element={
                token ? <Navigate to="/" /> : <LoginPage />
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <SearchPage />
                </PrivateRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}