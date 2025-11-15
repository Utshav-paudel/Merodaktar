import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    date_of_birth: ''
  });
  const [error, setError] = useState('');

  const validatePassword = (password: string): boolean => {
    const byteLength = new TextEncoder().encode(password).length;
    if (byteLength > 72) {
      setError('Password is too long (max 72 bytes). Please use a shorter password.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validatePassword(formData.password)) {
      return;
    }

    try {
      if (isLogin) {
        const response = await fetch('http://localhost:8000/api/v1/auth/login/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          }),
        });

        if (response.ok) {
          const data = await response.json();
          onLogin(data.access_token);
          navigate('/dashboard');
        } else {
          setError('Invalid email or password');
        }
      } else {
        // Register
        const response = await fetch('http://localhost:8000/api/v1/auth/register/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          // Already returns token with registration
          const data = await response.json();
          onLogin(data.access_token);
          navigate('/dashboard');
        } else {
          setError('Registration failed. Email might already exist.');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-96">
        <div className="flex flex-col items-center mb-6">
          <img 
            src="/mero-daktar-logo.png" 
            alt="MeroDaktar Logo" 
            className="h-20 w-20 mb-3"
          />
          <h2 className="text-3xl font-bold text-center text-blue-600">
            MeroDaktar
          </h2>
          <p className="text-sm text-gray-500 text-center mt-1">Your Health, Our Priority</p>
        </div>
        <h3 className="text-xl text-center mb-6 text-gray-700 font-semibold">
          {isLogin ? 'Patient Sign In' : 'Create Patient Account'}
        </h3>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <div className="mb-4">
            <input
              type="password"
              placeholder="Password (min 8 characters)"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              minLength={8}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {new TextEncoder().encode(formData.password).length} / 72 bytes used
            </p>
          </div>

          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />

              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />

              <input
                type="date"
                placeholder="Date of Birth"
                className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                required
              />
            </>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            {isLogin ? 'Sign In' : 'Register'}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:underline"
          >
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </p>
        
        <div className="mt-4 text-center">
          <a
            href="/doctor/login"
            className="text-teal-600 hover:text-teal-800 text-sm font-semibold"
          >
            Doctor Portal →
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;