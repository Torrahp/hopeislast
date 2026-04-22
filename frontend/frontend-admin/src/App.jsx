import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import AdminLogin from './pages/AdminLogin';
import UserManagement from './pages/UserManagement';
import PlotManagement from './pages/PlotManagement';
import PredictionLogs from './pages/PredictionLogs';
import ModelManagement from './pages/ModelManagement';
import LegacyLogs from './pages/LegacyLogs';

function App() {
  const [isAuth, setIsAuth] = useState(!!localStorage.getItem('adminToken'));

  const handleLoginSuccess = () => {
    setIsAuth(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuth(false);
  };

  return (
    <Router>
      {isAuth && <Navbar onLogout={handleLogout} />}

      <Routes>
        <Route path="/" element={<Navigate to="/admin/login" />} />

        <Route
          path="/admin/login"
          element={isAuth ? <Navigate to="/admin/users" /> : <AdminLogin onLoginSuccess={handleLoginSuccess} />}
        />

        <Route
          path="/admin/users"
          element={isAuth ? <UserManagement /> : <Navigate to="/admin/login" />}
        />
        
        <Route
          path="/admin/plots"
          element={isAuth ? <PlotManagement /> : <Navigate to="/admin/login" />}
        />

        <Route
          path="/admin/logs"
          element={isAuth ? <PredictionLogs /> : <Navigate to="/admin/login" />}
        />

        <Route
          path="/admin/models"
          element={isAuth ? <ModelManagement /> : <Navigate to="/admin/login" />}
        />

        <Route
          path="/admin/legacy-logs"
          element={isAuth ? <LegacyLogs /> : <Navigate to="/admin/login" />}
        />

        <Route path="*" element={<Navigate to="/admin/login" />} />
      </Routes>
    </Router>
  );
}

export default App;