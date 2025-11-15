import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface AppointmentsProps {
  token: string;
  user: any;
  onLogout: () => void;
}

const Appointments: React.FC<AppointmentsProps> = ({ token, user }) => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [showBooking, setShowBooking] = useState(false);
  const [formData, setFormData] = useState({
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    reason: '',
    symptoms: '',
    appointment_type: 'in-person'
  });

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/doctors?available=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDoctors(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/appointments/my-appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Show all appointments including completed ones on this page
        setAppointments(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Split datetime-local into date and time
    const datetime = new Date(formData.appointment_date);
    const date = datetime.toISOString().split('T')[0];
    const time = datetime.toTimeString().slice(0, 5);
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          doctor_id: formData.doctor_id,
          appointment_date: date,
          appointment_time: time,
          reason: formData.reason,
          symptoms: formData.symptoms,
          appointment_type: formData.appointment_type
        })
      });

      if (response.ok) {
        const data = await response.json();
        await fetchAppointments();
        setShowBooking(false);
        setFormData({
          doctor_id: '',
          appointment_date: '',
          appointment_time: '',
          reason: '',
          symptoms: '',
          appointment_type: 'in-person'
        });
        alert(`Appointment booked successfully!\nConfirmation Code: ${data.confirmation_code}`);
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to book appointment');
      }
    } catch (error) {
      console.error('Failed to book appointment:', error);
      alert('Failed to book appointment. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow border-b-4 border-green-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="mr-2 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <img 
                src="/mero-daktar-logo.png" 
                alt="MeroDaktar Logo" 
                className="h-10 w-10"
              />
              <div>
                <h1 className="text-xl font-bold text-green-600">Appointments</h1>
                <p className="text-xs text-gray-500">Book & Manage Your Visits</p>
              </div>
            </div>
            <button
              onClick={() => setShowBooking(true)}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
            >
              📅 Book New
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Booking Form Modal */}
        {showBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h2 className="text-xl font-bold mb-4">Book New Appointment</h2>
              <form onSubmit={handleBookAppointment}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Doctor
                  </label>
                  <select
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    value={formData.doctor_id}
                    onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                    required
                  >
                    <option value="">Choose a doctor...</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.full_name} - {doctor.specialization} ({doctor.years_of_experience} yrs)
                        {doctor.is_available ? ' ✅ Available' : ' ⛔ Unavailable'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Type
                  </label>
                  <select
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    value={formData.appointment_type}
                    onChange={(e) => setFormData({ ...formData, appointment_type: e.target.value })}
                  >
                    <option value="in-person">In-Person Visit</option>
                    <option value="video">Video Consultation</option>
                    <option value="phone">Phone Call</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Visit
                  </label>
                  <textarea
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={3}
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    required
                    placeholder="Describe your main concern..."
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Symptoms (Optional)
                  </label>
                  <textarea
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={2}
                    value={formData.symptoms}
                    onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                    placeholder="List any symptoms you're experiencing..."
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
                  >
                    Book Appointment
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBooking(false)}
                    className="flex-1 bg-gray-300 text-gray-700 p-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Active Appointments List */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Active Appointments</h2>
            <p className="text-sm text-gray-500">Scheduled, confirmed, and upcoming appointments</p>
          </div>
          <div className="p-6">
            {appointments.filter(apt => apt.status !== 'completed' && apt.status !== 'cancelled').length > 0 ? (
              <div className="space-y-4">
                {appointments.filter(apt => apt.status !== 'completed' && apt.status !== 'cancelled').map((apt, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1">
                        <CalendarIcon className="h-6 w-6 text-blue-500 mr-3 mt-1" />
                        <div className="flex-1">
                          <h3 className="font-semibold">Dr. {apt.doctor_name || 'Doctor'}</h3>
                          <p className="text-sm text-gray-600 mt-1">{apt.reason}</p>
                          <p className="text-sm text-gray-500 mt-2">
                            📅 {new Date(apt.appointment_date).toLocaleDateString()} at {apt.appointment_time}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Type: {apt.appointment_type} | Code: {apt.confirmation_code}
                          </p>
                          
                          {/* Medical Notes Section - Only show if completed */}
                          {apt.status === 'completed' && (apt.doctor_notes || apt.diagnosis || apt.prescription) && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <h4 className="font-semibold text-sm text-blue-900 mb-2">📋 Medical Summary</h4>
                              
                              {apt.diagnosis && (
                                <div className="mb-2">
                                  <p className="text-xs font-semibold text-gray-700">Diagnosis:</p>
                                  <p className="text-sm text-gray-800">{apt.diagnosis}</p>
                                </div>
                              )}
                              
                              {apt.doctor_notes && (
                                <div className="mb-2">
                                  <p className="text-xs font-semibold text-gray-700">Doctor's Notes:</p>
                                  <p className="text-sm text-gray-800">{apt.doctor_notes}</p>
                                </div>
                              )}
                              
                              {apt.prescription && (
                                <div className="mb-2">
                                  <p className="text-xs font-semibold text-gray-700">💊 Prescription:</p>
                                  <p className="text-sm text-gray-800">{apt.prescription}</p>
                                </div>
                              )}
                              
                              {apt.follow_up_date && (
                                <div className="mt-2 pt-2 border-t border-blue-300">
                                  <p className="text-xs font-semibold text-gray-700">Follow-up Required:</p>
                                  <p className="text-sm text-blue-700">📆 {new Date(apt.follow_up_date).toLocaleDateString()}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                        apt.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        apt.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No active appointments. Click "Book New Appointment" to schedule one.
              </p>
            )}
          </div>
        </div>

        {/* Completed Appointments / Past Consultations */}
        {appointments.filter(apt => apt.status === 'completed').length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700">
              <h2 className="text-lg font-semibold text-white flex items-center">
                <span className="text-2xl mr-2">🏥</span>
                Past Doctor Consultations
              </h2>
              <p className="text-sm text-purple-100">Completed appointments with full medical records</p>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {appointments.filter(apt => apt.status === 'completed').map((apt, index) => (
                  <div key={index} className="border-2 border-purple-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Appointment Header */}
                    <div className="bg-gradient-to-r from-purple-50 to-white p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start flex-1">
                          <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-3">
                            {apt.doctor_name ? apt.doctor_name.charAt(0) : 'Dr'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-lg text-gray-900">Dr. {apt.doctor_name || 'Doctor'}</h3>
                              <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 font-semibold">
                                ✓ Completed
                              </span>
                            </div>
                            <p className="text-sm text-purple-600 font-medium">{apt.doctor_specialization}</p>
                            <p className="text-sm text-gray-700 mt-2">{apt.reason}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span className="flex items-center">
                                <CalendarIcon className="h-4 w-4 mr-1" />
                                {new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <span>⏰ {apt.appointment_time}</span>
                              <span className="text-xs text-gray-400">Code: {apt.confirmation_code}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Medical Records Section */}
                    {(apt.diagnosis || apt.doctor_notes || apt.prescription || apt.follow_up_date) && (
                      <div className="bg-white p-5 space-y-4">
                        <div className="flex items-center border-b border-purple-200 pb-2">
                          <span className="text-xl mr-2">📋</span>
                          <h4 className="font-bold text-purple-900">Medical Records</h4>
                        </div>
                        
                        {apt.diagnosis && (
                          <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg border-l-4 border-red-500">
                            <label className="text-xs font-bold text-red-700 uppercase tracking-wide flex items-center mb-2">
                              <span className="mr-2">🔍</span>Diagnosis
                            </label>
                            <p className="text-gray-900">{apt.diagnosis}</p>
                          </div>
                        )}
                        
                        {apt.doctor_notes && (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-l-4 border-blue-500">
                            <label className="text-xs font-bold text-blue-700 uppercase tracking-wide flex items-center mb-2">
                              <span className="mr-2">📝</span>Doctor's Notes
                            </label>
                            <p className="text-gray-900">{apt.doctor_notes}</p>
                          </div>
                        )}
                        
                        {apt.prescription && (
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-l-4 border-green-500">
                            <label className="text-xs font-bold text-green-700 uppercase tracking-wide flex items-center mb-2">
                              <span className="mr-2">💊</span>Prescription
                            </label>
                            <p className="text-gray-900 whitespace-pre-wrap">{apt.prescription}</p>
                          </div>
                        )}
                        
                        {apt.follow_up_date && (
                          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-lg border-l-4 border-amber-500">
                            <label className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center mb-2">
                              <span className="mr-2">📆</span>Follow-up Required
                            </label>
                            <p className="text-gray-900 font-semibold">{new Date(apt.follow_up_date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Appointments;