import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MedicalChatWithHistory from './components/MedicalChatWithHistory';
import Appointments from './components/Appointments';
import DoctorLogin from './components/DoctorLogin';
import DoctorDashboard from './components/DoctorDashboard';
import PatientEHR from './components/PatientEHR';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [doctorToken, setDoctorToken] = useState<string | null>(localStorage.getItem('doctorToken'));
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (token) {
      fetchUserData();
    }
  }, [token]);

  const fetchUserData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData); // Set user data directly
      } else if (response.status === 401) {
        // Token expired, logout user
        console.log('Token expired, logging out user');
        handleLogout();
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // Don't logout on fetch error, just log it
    }
  };

  const handleLogin = (token: string) => {
    localStorage.setItem('token', token);
    setToken(token);
  };

  const handleDoctorLogin = (token: string) => {
    localStorage.setItem('doctorToken', token);
    setDoctorToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const handleDoctorLogout = () => {
    localStorage.removeItem('doctorToken');
    setDoctorToken(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-ink-950 text-slate-200">
        <Routes>
          {/* Patient Routes */}
          <Route 
            path="/login" 
            element={token ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} 
          />
          <Route 
            path="/dashboard" 
            element={token ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/chat" 
            element={token ? <MedicalChatWithHistory token={token} user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/appointments" 
            element={token ? <Appointments token={token} user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/ehr" 
            element={token ? <PatientEHR token={token} user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          
          {/* Doctor Routes */}
          <Route 
            path="/doctor/login" 
            element={doctorToken ? <Navigate to="/doctor/dashboard" /> : <DoctorLogin onLogin={handleDoctorLogin} />} 
          />
          <Route 
            path="/doctor/dashboard" 
            element={doctorToken ? <DoctorDashboard token={doctorToken} onLogout={handleDoctorLogout} /> : <Navigate to="/doctor/login" />} 
          />
          
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;