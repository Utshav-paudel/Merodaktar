import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatBubbleLeftIcon, CalendarIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [completedAppointments, setCompletedAppointments] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    
    try {
      // Fetch appointments
      const appointmentsResponse = await fetch('http://localhost:8000/api/v1/appointments/my-appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (appointmentsResponse.ok) {
        const data = await appointmentsResponse.json();
        // Separate completed and active appointments
        const completed = (data || []).filter(
          (apt: any) => apt.status === 'completed'
        );
        const active = (data || []).filter(
          (apt: any) => apt.status !== 'completed' && apt.status !== 'cancelled'
        );
        setCompletedAppointments(completed);
        setAppointments(active);
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
        <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600">
            <h3 className="text-lg font-semibold text-white">Recent Doctor Consultations</h3>
            <p className="text-sm text-purple-100">Your completed appointments and medical records</p>
          </div>
          <div className="p-6">
            {completedAppointments.length > 0 ? (
              <div className="space-y-4">
                {completedAppointments.slice(0, 3).map((apt, index) => (
                  <div 
                    key={index} 
                    className="border border-purple-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-r from-purple-50 to-white"
                    onClick={() => setSelectedAppointment(apt)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {apt.doctor_name ? apt.doctor_name.charAt(0) : 'Dr'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Dr. {apt.doctor_name || 'Doctor'}</p>
                            <p className="text-xs text-purple-600">{apt.doctor_specialization}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 ml-12">{apt.reason}</p>
                        <div className="flex items-center gap-4 mt-2 ml-12 text-xs text-gray-500">
                          <span>📅 {new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          {apt.diagnosis && <span className="text-purple-600 font-medium">• View Details →</span>}
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">✓ Completed</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🏥</div>
                <p className="text-gray-500">No completed consultations yet.</p>
                <p className="text-sm text-gray-400 mt-1">Book an appointment to consult with a doctor.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="mt-8 mb-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Upcoming & Active Appointments</h3>
          </div>
          <div className="p-6">
            {appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div 
                    key={apt.id} 
                    className="flex justify-between items-center border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedAppointment(apt)}
                  >
                    <div>
                      <p className="font-medium">Dr. {apt.doctor_name || 'Doctor'}</p>
                      <p className="text-sm text-gray-600">{apt.doctor_specialization}</p>
                      <p className="text-xs text-gray-500 mt-1">{apt.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{new Date(apt.appointment_date).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-600">{apt.appointment_time}</p>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                        apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                        apt.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No active appointments. Completed appointments appear in consultations above.</p>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">Consultation Details</h3>
                  <p className="text-purple-100 text-sm mt-1">Dr. {selectedAppointment.doctor_name}</p>
                </div>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-white hover:bg-purple-800 rounded-full p-2 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <label className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Doctor</label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">Dr. {selectedAppointment.doctor_name}</p>
                  <p className="text-sm text-purple-600">{selectedAppointment.doctor_specialization}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <label className="text-xs font-semibold text-green-700 uppercase tracking-wide">Status</label>
                  <p className="text-lg font-semibold text-green-600 mt-1">✓ COMPLETED</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Date</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{new Date(selectedAppointment.appointment_date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Time</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedAppointment.appointment_time}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Reason for Visit</label>
                <p className="text-sm text-gray-900 mt-1">{selectedAppointment.reason || 'N/A'}</p>
              </div>

              {/* Medical Records Section */}
              {(selectedAppointment.diagnosis || selectedAppointment.doctor_notes || selectedAppointment.prescription) && (
                <div className="border-t-2 border-purple-200 pt-4 mt-4">
                  <h4 className="text-lg font-bold text-purple-900 mb-4 flex items-center">
                    <span className="text-2xl mr-2">📋</span>
                    Medical Records
                  </h4>
                  <div className="space-y-4">
                    {selectedAppointment.diagnosis && (
                      <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg border-l-4 border-red-500">
                        <label className="text-xs font-bold text-red-700 uppercase tracking-wide flex items-center">
                          <span className="mr-2">🔍</span>Diagnosis
                        </label>
                        <p className="mt-2 text-gray-900">{selectedAppointment.diagnosis}</p>
                      </div>
                    )}

                    {selectedAppointment.doctor_notes && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <label className="text-xs font-bold text-blue-700 uppercase tracking-wide flex items-center">
                          <span className="mr-2">📝</span>Doctor's Notes
                        </label>
                        <p className="mt-2 text-gray-900">{selectedAppointment.doctor_notes}</p>
                      </div>
                    )}

                    {selectedAppointment.prescription && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-l-4 border-green-500">
                        <label className="text-xs font-bold text-green-700 uppercase tracking-wide flex items-center">
                          <span className="mr-2">💊</span>Prescription
                        </label>
                        <p className="mt-2 text-gray-900 whitespace-pre-wrap">{selectedAppointment.prescription}</p>
                      </div>
                    )}

                    {selectedAppointment.follow_up_date && (
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-lg border-l-4 border-amber-500">
                        <label className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center">
                          <span className="mr-2">📆</span>Follow-up Required
                        </label>
                        <p className="mt-2 text-gray-900 font-semibold">{new Date(selectedAppointment.follow_up_date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 pt-4 border-t bg-gray-50 -mx-6 px-6 py-3 rounded-b-xl">
                <p className="mb-1"><span className="font-medium">Confirmation Code:</span> {selectedAppointment.confirmation_code}</p>
                <p><span className="font-medium">Booked on:</span> {new Date(selectedAppointment.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;