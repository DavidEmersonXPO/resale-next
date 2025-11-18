import type { JSX } from 'react';
import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { authStore } from './stores/auth-store';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/Dashboard';
import { ListingComposer } from './pages/ListingComposer';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = authStore((state) => state.token);
  const hydrated = authStore((state) => state.hydrated);
  if (!hydrated) {
    return null;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export const App = () => {
  useEffect(() => {
    authStore.getState().hydrateFromStorage();
  }, []);

  const hydrated = authStore((state) => state.hydrated);
  if (!hydrated) {
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/listings/new"
          element={
            <ProtectedRoute>
              <ListingComposer />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
