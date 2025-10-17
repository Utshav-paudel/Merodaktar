import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatBubbleLeftIcon, CalendarIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    
    try {
      // Fetch dashboard summary
      const summaryResponse = await fetch('/api/dashboard/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        // Set any summary data you need
      }

      // Fetch consultation history (this replaces patient records)
      const recordsResponse = await fetch('/api/dashboard/consultation-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (recordsResponse.ok) {
        const data = await recordsResponse.json();
        setRecords(data.consultations || []);
      }

      // Fetch appointments (corrected endpoint)
      const appointmentsResponse = await fetch('/api/appointments/my-appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (appointmentsResponse.ok) {
        const data = await appointmentsResponse.json();
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow border-b-4 border-blue-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <img 
                src="/mero-daktar-logo.png" 
                alt="MeroDaktar Logo" 
                className="h-12 w-12"
              />
              <div>
                <h1 className="text-2xl font-bold text-blue-600">MeroDaktar</h1>
                <p className="text-xs text-gray-500">Patient Dashboard</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center text-gray-500 hover:text-gray-700"
            >
              <ArrowRightOnRectangleIcon className="h-6 w-6 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Welcome Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, {user?.full_name || 'Patient'}!
          </h2>
          <p>Your health journey starts here. How can we help you today?</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <button
            onClick={() => navigate('/chat')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <ChatBubbleLeftIcon className="h-12 w-12 text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">AI Medical Chat</h3>
            <p className="text-gray-600">Get instant health advice from our AI assistant</p>
          </button>

          <button
            onClick={() => navigate('/appointments')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <CalendarIcon className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Book Appointment</h3>
            <p className="text-gray-600">Schedule a consultation with a doctor</p>
          </button>

          <button
            onClick={() => navigate('/ehr')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <UserCircleIcon className="h-12 w-12 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">📋 Health Records (EHR)</h3>
            <p className="text-gray-600">View your complete medical history & vitals</p>
          </button>

          <button
            onClick={() => navigate('/chat')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-2 border-orange-200"
          >
            <div className="text-4xl mb-2">🎙️</div>
            <h3 className="text-lg font-semibold mb-2">Voice AI Chat</h3>
            <p className="text-gray-600">AI consultation with voice support</p>
          </button>
        </div>

        {/* Recent Consultations */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Recent Consultations</h3>
          </div>
          <div className="p-6">
            {records.length > 0 ? (
              <div className="space-y-4">
                {records.slice(0, 3).map((record, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <p className="font-medium">{record.symptoms}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(record.consultation_date).toLocaleDateString()} - 
                      Urgency: <span className={`font-medium ${
                        record.urgency_level === 'emergency' ? 'text-red-600' :
                        record.urgency_level === 'moderate' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>{record.urgency_level}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No consultations yet. Start a chat to get health advice.</p>
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="mt-8 mb-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Upcoming Appointments</h3>
          </div>
          <div className="p-6">
            {appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((apt, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Dr. {apt.doctor_name}</p>
                      <p className="text-sm text-gray-600">{apt.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{apt.appointment_date}</p>
                      <p className="text-xs text-green-600">{apt.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No upcoming appointments.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;