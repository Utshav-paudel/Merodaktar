import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface DoctorLoginProps {
  onLogin: (token: string) => void;
}

const DoctorLogin: React.FC<DoctorLoginProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    specialization: '',
    license_number: '',
    years_of_experience: '',
    education: '',
    bio: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const specializations = [
    'General Practice',
    'Cardiology',
    'Dermatology',
    'Pediatrics',
    'Orthopedics',
    'Neurology',
    'Psychiatry',
    'Obstetrics & Gynecology',
    'ENT',
    'Ophthalmology',
    'Dentistry',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await fetch('http://localhost:8000/api/v1/auth/login/doctor', {
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
          navigate('/doctor/dashboard');
        } else {
          setError('Invalid email or password');
        }
      } else {
        // Register
        const response = await fetch('http://localhost:8000/api/v1/auth/register/doctor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            years_of_experience: parseInt(formData.years_of_experience)
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Note: Doctor needs verification before full access
          alert('Registration successful! Please wait for account verification.');
          setIsLogin(true);
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Registration failed. Email might already exist.');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-teal-100 py-8">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex flex-col items-center mb-6">
          <img 
            src="/mero-daktar-logo.png" 
            alt="MeroDaktar Logo" 
            className="h-20 w-20 mb-3"
          />
          <h2 className="text-3xl font-bold text-center text-teal-600">
            MeroDaktar
          </h2>
          <p className="text-sm text-gray-500 text-center mt-1">Professional Healthcare Platform</p>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-2 mb-4 text-center">
          <p className="text-teal-700 font-semibold text-sm">🩺 Doctor Portal</p>
        </div>
        <h3 className="text-xl text-center mb-6 text-gray-700 font-semibold">
          {isLogin ? 'Doctor Sign In' : 'Register as Doctor'}
        </h3>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />

              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />

              <select
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                required
              >
                <option value="">Select Specialization</option>
                {specializations.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Medical License Number"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                required
              />

              <input
                type="number"
                placeholder="Years of Experience"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={formData.years_of_experience}
                onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value })}
                required
                min="0"
              />

              <input
                type="text"
                placeholder="Education (e.g., MBBS, MD)"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={formData.education}
                onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                required
              />

              <textarea
                placeholder="Brief Bio (Optional)"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
              />
            </>
          )}

          <button
            type="submit"
            className="w-full bg-teal-600 text-white p-3 rounded-lg hover:bg-teal-700 transition duration-200 disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Register')}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-teal-600 hover:text-teal-800 font-semibold"
          >
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </p>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            ← Patient Portal
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorLogin;
