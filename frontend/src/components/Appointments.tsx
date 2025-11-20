import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface AppointmentsProps {
  token: string;
  user: any;
  onLogout: () => void;
}

interface TimeSlot {
  id: string;
  time: string;
  date: string;
  duration: number;
  is_booked: boolean;
  appointment_id?: string;
}

interface DoctorWithSchedule {
  id: string;
  full_name: string;
  specialization: string;
  years_of_experience: number;
  is_available: boolean;
  has_schedule: boolean;
}

interface Encounter {
  id: string;
  chief_complaint: string;
  assessment: string;
  created_at: string;
}

const Appointments: React.FC<AppointmentsProps> = ({ token }) => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<DoctorWithSchedule[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({
    doctor_id: '',
    slot_id: '',
    encounter_id: '',
    reason: '',
    symptoms: '',
    appointment_type: 'in-person'
  });

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
    fetchEncounters();
  }, []);

  // Fetch available slots when doctor and date are selected
  useEffect(() => {
    if (formData.doctor_id && selectedDate) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [formData.doctor_id, selectedDate]);

  const fetchDoctors = async () => {
    try {
      // Fetch all available doctors
      const response = await fetch('http://localhost:8000/api/v1/doctors?available=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const allDoctors = await response.json();
        
        // Check which doctors have schedules
        const doctorsWithScheduleStatus = await Promise.all(
          allDoctors.map(async (doctor: any) => {
            try {
              const scheduleResponse = await fetch(
                `http://localhost:8000/api/v1/schedules/doctor/${doctor.id}/slots?start_date=${new Date().toISOString().split('T')[0]}&end_date=${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
              );
              const slots = await scheduleResponse.json();
              return {
                ...doctor,
                has_schedule: slots && slots.length > 0
              };
            } catch {
              return { ...doctor, has_schedule: false };
            }
          })
        );
        
        // Filter to only show doctors with active schedules
        const doctorsWithSchedules = doctorsWithScheduleStatus.filter(
          (d: DoctorWithSchedule) => d.has_schedule
        );
        setDoctors(doctorsWithSchedules);
      }
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!formData.doctor_id || !selectedDate) return;
    
    setLoadingSlots(true);
    try {
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 7); // Get slots for next 7 days from selected date
      
      const response = await fetch(
        `http://localhost:8000/api/v1/schedules/doctor/${formData.doctor_id}/slots?start_date=${selectedDate}&end_date=${endDate.toISOString().split('T')[0]}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const slots = await response.json();
        // Filter slots for the selected date and not booked
        const slotsForDate = slots.filter((slot: TimeSlot) => 
          slot.date === selectedDate && !slot.is_booked
        );
        setAvailableSlots(slotsForDate);
      }
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const fetchEncounters = async () => {
    try {
      console.log('[APPOINTMENTS] Fetching encounters...');
      const response = await fetch('http://localhost:8000/api/v1/ehr/me/encounters', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('[APPOINTMENTS] Encounters response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[APPOINTMENTS] Encounters data:', data);
        console.log('[APPOINTMENTS] Number of encounters:', data?.length || 0);
        setEncounters(data || []);
      } else {
        const errorText = await response.text();
        console.error('[APPOINTMENTS] Failed to fetch encounters. Status:', response.status, 'Error:', errorText);
      }
    } catch (error) {
      console.error('[APPOINTMENTS] Failed to fetch encounters:', error);
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
    
    if (!formData.slot_id) {
      alert('Please select a time slot');
      return;
    }
    
    // Find the selected slot to get its date and time
    const selectedSlot = availableSlots.find(slot => slot.id === formData.slot_id);
    if (!selectedSlot) {
      alert('Selected time slot not found');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          doctor_id: formData.doctor_id,
          slot_id: formData.slot_id,
          appointment_date: selectedSlot.date,  // Send date from slot
          appointment_time: selectedSlot.time,  // Send time from slot
          encounter_id: formData.encounter_id || undefined,
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
          slot_id: '',
          encounter_id: '',
          reason: '',
          symptoms: '',
          appointment_type: 'in-person'
        });
        setSelectedDate('');
        setAvailableSlots([]);
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

  const handleCancelAppointment = async (appointmentId: string, status: string) => {
    // Only allow cancellation if doctor hasn't accepted/completed yet
    if (status === 'completed' || status === 'cancelled') {
      alert('Cannot cancel this appointment.');
      return;
    }

    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/appointments/${appointmentId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        await fetchAppointments();
        alert('Appointment cancelled successfully');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      alert('Failed to cancel appointment. Please try again.');
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
                    onChange={(e) => {
                      setFormData({ ...formData, doctor_id: e.target.value, slot_id: '' });
                      setSelectedDate('');
                      setAvailableSlots([]);
                    }}
                    required
                  >
                    <option value="">Choose a doctor...</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.full_name} - {doctor.specialization} ({doctor.years_of_experience} yrs)
                      </option>
                    ))}
                  </select>
                  {doctors.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No doctors with active schedules available. Please check back later.
                    </p>
                  )}
                </div>

                {formData.doctor_id && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Date
                      </label>
                      <input
                        type="date"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        value={selectedDate}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          setFormData({ ...formData, slot_id: '' });
                        }}
                        required
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    {selectedDate && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Available Time Slots
                        </label>
                        {loadingSlots ? (
                          <div className="text-center py-4 text-gray-500">
                            Loading available slots...
                          </div>
                        ) : availableSlots.length > 0 ? (
                          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                            {availableSlots.map((slot) => (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, slot_id: slot.id })}
                                className={`p-2 rounded border text-sm font-medium transition ${
                                  formData.slot_id === slot.id
                                    ? 'bg-green-500 text-white border-green-600 shadow-md'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:border-green-300'
                                }`}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 border rounded-lg">
                            No available slots for this date. Try another date.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

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

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Previous Symptom Report (Optional)
                  </label>
                  <select
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    value={formData.encounter_id}
                    onChange={(e) => {
                      const encounterId = e.target.value;
                      setFormData({ ...formData, encounter_id: encounterId });
                      
                      // Auto-fill reason and symptoms from encounter
                      if (encounterId) {
                        const encounter = encounters.find(enc => enc.id === encounterId);
                        if (encounter) {
                          setFormData({
                            ...formData,
                            encounter_id: encounterId,
                            reason: encounter.chief_complaint,
                            symptoms: encounter.assessment.substring(0, 200) // First 200 chars
                          });
                        }
                      }
                    }}
                  >
                    <option value="">Select a previous report (or write below)</option>
                    {encounters.map((encounter) => (
                      <option key={encounter.id} value={encounter.id}>
                        {encounter.chief_complaint} - {new Date(encounter.created_at).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                  {encounters.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No previous reports. Complete a symptom interview in Chat to create one.
                    </p>
                  )}
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
                      <div className="flex items-start flex-1">
                        <CalendarIcon className="h-6 w-6 text-blue-500 mr-3 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold">Dr. {apt.doctor_name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{apt.reason}</p>
                          <p className="text-sm text-gray-500 mt-2">
                            📅 {new Date(apt.appointment_date).toLocaleDateString()} at{' '}
                            🕐 {new Date(apt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {apt.symptoms && (
                            <p className="text-xs text-gray-500 mt-1">
                              Symptoms: {apt.symptoms}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          apt.status === 'scheduled' || apt.status === 'pending'
                            ? 'bg-blue-100 text-blue-800'
                            : apt.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : apt.status === 'completed'
                            ? 'bg-gray-100 text-gray-800'
                            : apt.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {apt.status}
                        </span>
                        {(apt.status === 'scheduled' || apt.status === 'pending') && (
                          <button
                            onClick={() => handleCancelAppointment(apt.id, apt.status)}
                            className="px-3 py-1 bg-red-50 text-red-600 rounded text-sm hover:bg-red-100 transition"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
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