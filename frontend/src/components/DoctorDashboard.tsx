import React, { useState, useEffect } from 'react';

interface DoctorDashboardProps {
  token: string;
  onLogout: () => void;
}

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ token, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'patients'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [notes, setNotes] = useState({ note: '', diagnosis: '', prescription: '', follow_up_date: '' });
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchDoctorData();
  }, []);

  const fetchDoctorData = async () => {
    try {
      // Fetch profile
      const profileRes = await fetch('http://localhost:8000/api/v1/doctors/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (profileRes.ok) {
        setProfile(await profileRes.json());
      }

      // Fetch stats
      const statsRes = await fetch('http://localhost:8000/api/v1/dashboard/doctor/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // Fetch appointments
      const appointmentsRes = await fetch('http://localhost:8000/api/v1/appointments/doctor/appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (appointmentsRes.ok) {
        const data = await appointmentsRes.json();
        setAppointments(data || []);
      }

      // Fetch today's appointments (filter from all appointments)
      const todayRes = await fetch('http://localhost:8000/api/v1/appointments/doctor/appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (todayRes.ok) {
        const data = await todayRes.json();
        const today = new Date().toISOString().split('T')[0];
        setTodayAppointments((data || []).filter((apt: any) => apt.appointment_date === today));
      }

      // Fetch patients (derived from appointments)
      const patientsRes = await fetch('http://localhost:8000/api/v1/appointments/doctor/appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (patientsRes.ok) {
        const data = await patientsRes.json();
        // Extract unique patients from appointments
        const uniquePatients = Array.from(
          new Map((data || []).map((apt: any) => [apt.patient_id, {
            id: apt.patient_id,
            name: apt.patient_name || 'Patient',
            email: apt.patient_email || '',
            total_appointments: 1
          }])).values()
        );
        setPatients(uniquePatients);
      }
    } catch (error) {
      console.error('Error fetching doctor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        fetchDoctorData(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const addAppointmentNotes = async (appointmentId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/appointments/doctor/${appointmentId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doctor_notes: notes.note,
          diagnosis: notes.diagnosis,
          prescription: notes.prescription,
          follow_up_date: notes.follow_up_date,
          follow_up_required: notes.follow_up_date ? 'yes' : 'no'
        })
      });
      
      if (response.ok) {
        setNotes({ note: '', diagnosis: '', prescription: '', follow_up_date: '' });
        setSelectedAppointment(null);
        fetchDoctorData();
      }
    } catch (error) {
      console.error('Error adding notes:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b-4 border-teal-500">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img 
              src="/mero-daktar-logo.png" 
              alt="MeroDaktar Logo" 
              className="h-12 w-12"
            />
            <div>
              <h1 className="text-2xl font-bold text-teal-600">MeroDaktar</h1>
              <p className="text-xs text-gray-500">Doctor Dashboard</p>
              {profile && (
                <p className="text-sm text-gray-600 font-medium">Dr. {profile.full_name} - {profile.specialization}</p>
              )}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex space-x-4 border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-semibold ${activeTab === 'overview' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-600'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-4 py-2 font-semibold ${activeTab === 'appointments' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-600'}`}
          >
            Appointments
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-4 py-2 font-semibold ${activeTab === 'patients' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-600'}`}
          >
            Patients
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <p className="text-gray-600 text-sm">Total Appointments</p>
                  <p className="text-3xl font-bold text-teal-600">{stats.total_appointments}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <p className="text-gray-600 text-sm">Today's Appointments</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.today_appointments}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <p className="text-gray-600 text-sm">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending_appointments}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <p className="text-gray-600 text-sm">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completed_appointments}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <p className="text-gray-600 text-sm">Total Patients</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.total_patients}</p>
                </div>
              </div>
            )}

            {/* Today's Appointments */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Today's Appointments</h3>
              {todayAppointments.length > 0 ? (
                <div className="space-y-3">
                  {todayAppointments.map((apt) => (
                    <div key={apt.appointment_id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{apt.patient_name}</p>
                          <p className="text-sm text-gray-600">{apt.appointment_time}</p>
                          <p className="text-sm text-gray-500 mt-1">Reason: {apt.reason}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedAppointment(apt)}
                            className="px-3 py-1 bg-teal-600 text-white text-sm rounded hover:bg-teal-700"
                          >
                            Add Notes
                          </button>
                          <select
                            value={apt.status}
                            onChange={(e) => updateAppointmentStatus(apt.appointment_id, e.target.value)}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no-show">No Show</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No appointments today</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">All Appointments</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {appointments.map((apt) => (
                    <tr key={apt.appointment_id}>
                      <td className="px-6 py-4 whitespace-nowrap">{apt.patient_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(apt.appointment_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{apt.appointment_time}</td>
                      <td className="px-6 py-4">{apt.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                          apt.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedAppointment(apt)}
                          className="text-teal-600 hover:text-teal-800"
                        >
                          View/Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'patients' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">My Patients</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patients.map((patient) => (
                <div key={patient.email} className="border rounded-lg p-4">
                  <h4 className="font-semibold">{patient.name}</h4>
                  <p className="text-sm text-gray-600">{patient.email}</p>
                  <div className="mt-2 text-sm">
                    <p>Total Appointments: {patient.total_appointments}</p>
                    {patient.last_visit && (
                      <p>Last Visit: {new Date(patient.last_visit).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Add Medical Notes</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Notes</label>
                <textarea
                  className="w-full p-2 border rounded-lg"
                  rows={4}
                  value={notes.note}
                  onChange={(e) => setNotes({ ...notes, note: e.target.value })}
                  placeholder="Enter clinical observations and notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg"
                  value={notes.diagnosis}
                  onChange={(e) => setNotes({ ...notes, diagnosis: e.target.value })}
                  placeholder="Enter diagnosis..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prescription</label>
                <textarea
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                  value={notes.prescription}
                  onChange={(e) => setNotes({ ...notes, prescription: e.target.value })}
                  placeholder="Enter prescription details..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded-lg"
                  value={notes.follow_up_date}
                  onChange={(e) => setNotes({ ...notes, follow_up_date: e.target.value })}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => addAppointmentNotes(selectedAppointment.appointment_id)}
                  className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700"
                >
                  Save Notes
                </button>
                <button
                  onClick={() => {
                    setSelectedAppointment(null);
                    setNotes({ note: '', diagnosis: '', prescription: '', follow_up_date: '' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
