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

        {/* Appointments List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Your Appointments</h2>
          </div>
          <div className="p-6">
            {appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((apt, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <CalendarIcon className="h-6 w-6 text-blue-500 mr-3 mt-1" />
                        <div>
                          <h3 className="font-semibold">Dr. {apt.doctor_name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{apt.reason}</p>
                          <p className="text-sm text-gray-500 mt-2">
                            {new Date(apt.appointment_date).toLocaleDateString()} at{' '}
                            {new Date(apt.appointment_date).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        apt.status === 'scheduled' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No appointments scheduled. Click "Book New Appointment" to schedule one.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Appointments;