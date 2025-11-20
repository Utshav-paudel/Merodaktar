import React, { useState, useEffect } from 'react';

interface DoctorDashboardProps {
  token: string;
  onLogout: () => void;
}

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ token, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'patients' | 'schedule'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [encounterDetails, setEncounterDetails] = useState<any>(null);
  const [notes, setNotes] = useState({ note: '', diagnosis: '', prescription: '', follow_up_date: '' });
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  // Patient encounters state
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientEncounters, setPatientEncounters] = useState<any[]>([]);
  const [selectedEncounters, setSelectedEncounters] = useState<string[]>([]);
  const [loadingEncounters, setLoadingEncounters] = useState(false);
  const [encounterNote, setEncounterNote] = useState('');
  const [detailedEncounter, setDetailedEncounter] = useState<any>(null);
  const [patientEhr, setPatientEhr] = useState<any>(null);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [savingNote, setSavingNote] = useState(false);
  
  // Schedule management state
  const [schedule, setSchedule] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    day_of_week: 0,
    start_time: '09:00',
    end_time: '17:00',
    slot_duration_minutes: 30,
    is_available: true
  });

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
        console.log('[DOCTOR] Appointments data:', data);
        
        // Extract unique patients from appointments
        const patientMap = new Map();
        (data || []).forEach((apt: any) => {
          if (apt.patient_id) {
            if (patientMap.has(apt.patient_id)) {
              const existing = patientMap.get(apt.patient_id);
              existing.total_appointments += 1;
            } else {
              patientMap.set(apt.patient_id, {
                id: apt.patient_id,
                name: apt.patient_name || 'Patient',
                email: apt.patient_email || '',
                total_appointments: 1,
                last_visit: apt.appointment_date
              });
            }
          }
        });
        
        const uniquePatients = Array.from(patientMap.values());
        console.log('[DOCTOR] Unique patients:', uniquePatients);
        setPatients(uniquePatients);
      }
      
      // Fetch schedule
      await fetchSchedule();
    } catch (error) {
      console.error('Error fetching doctor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async () => {
    setScheduleLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/schedules/my-schedule', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSchedule(data || []);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setScheduleLoading(false);
    }
  };

  // Fetch encounters for a specific patient
  const fetchPatientEncounters = async (patientId: string) => {
    setLoadingEncounters(true);
    setSelectedPatient(patientId);
    setSelectedEncounters([]); // Clear previous selections
    
    try {
      console.log('[DOCTOR] Fetching encounters for patient:', patientId);
      const response = await fetch(`http://localhost:8000/api/v1/ehr/patients/${patientId}/encounters`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[DOCTOR] Patient encounters:', data);
        setPatientEncounters(data || []);
      } else {
        console.error('[DOCTOR] Failed to fetch encounters. Status:', response.status);
        setPatientEncounters([]);
      }
    } catch (error) {
      console.error('[DOCTOR] Error fetching patient encounters:', error);
      setPatientEncounters([]);
    } finally {
      setLoadingEncounters(false);
    }
  };

  // Toggle encounter selection
  const toggleEncounterSelection = (encounterId: string) => {
    setSelectedEncounters(prev => {
      if (prev.includes(encounterId)) {
        return prev.filter(id => id !== encounterId);
      } else {
        return [...prev, encounterId];
      }
    });
  };

  // Select all encounters
  const selectAllEncounters = () => {
    if (selectedEncounters.length === patientEncounters.length) {
      setSelectedEncounters([]);
    } else {
      setSelectedEncounters(patientEncounters.map(enc => enc.id));
    }
  };

  // Fetch full encounter details for modal view
  const viewEncounterDetails = async (encounterId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/ehr/encounters/${encounterId}/full`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[DOCTOR] Full encounter data:', data);
        // The response has encounter, patient_info, and patient_ehr
        const encounterData = data.encounter || data;
        setDetailedEncounter(encounterData);
        setPatientInfo(data.patient_info || null);
        setPatientEhr(data.patient_ehr || null);
        setEncounterNote(encounterData.doctor_notes || '');
      } else {
        const error = await response.json();
        alert('Failed to load encounter details: ' + (error.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching encounter details:', error);
      alert('Failed to load encounter details');
    }
  };

  // Save doctor note to encounter
  const saveEncounterNote = async () => {
    if (!detailedEncounter) return;
    
    setSavingNote(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/ehr/encounters/${detailedEncounter.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doctor_notes: encounterNote
        })
      });

      if (response.ok) {
        alert('Doctor note saved successfully!');
        // Refresh the encounters list
        if (selectedPatient) {
          await fetchPatientEncounters(selectedPatient);
        }
        // Close modal
        setDetailedEncounter(null);
        setEncounterNote('');
      } else {
        const error = await response.json();
        alert('Error saving note: ' + (error.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving doctor note:', error);
      alert('Failed to save doctor note');
    } finally {
      setSavingNote(false);
    }
  };

  const saveScheduleDay = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/schedules/my-schedule', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleForm)
      });

      if (response.ok) {
        await fetchSchedule();
        setEditingDay(null);
        setScheduleForm({
          day_of_week: 0,
          start_time: '09:00',
          end_time: '17:00',
          slot_duration_minutes: 30,
          is_available: true
        });
        alert('Schedule saved successfully!');
      } else {
        const error = await response.json();
        alert('Error saving schedule: ' + (error.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Error saving schedule. Please try again.');
    }
  };

  const deleteScheduleDay = async (scheduleId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/schedules/my-schedule/${scheduleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchSchedule();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
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
        alert('Appointment status updated!');
      } else {
        const error = await response.json();
        alert('Error updating status: ' + (error.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status. Please try again.');
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/appointments/${appointmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchDoctorData(); // Refresh data
        alert('Appointment deleted successfully!');
      } else {
        const error = await response.json();
        alert('Error deleting appointment: ' + (error.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Error deleting appointment. Please try again.');
    }
  };

  const addAppointmentNotes = async (appointmentId: string) => {
    try {
      // Create form data for the request
      const formData = new URLSearchParams();
      if (notes.note) formData.append('doctor_notes', notes.note);
      if (notes.diagnosis) formData.append('diagnosis', notes.diagnosis);
      if (notes.prescription) formData.append('prescription', notes.prescription);
      if (notes.follow_up_date) {
        formData.append('follow_up_date', notes.follow_up_date);
        formData.append('follow_up_required', 'yes');
      } else {
        formData.append('follow_up_required', 'no');
      }

      const response = await fetch(`http://localhost:8000/api/v1/appointments/${appointmentId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });
      
      if (response.ok) {
        // If appointment has linked encounter, update encounter with doctor notes
        if (selectedAppointment?.encounter_id) {
          try {
            await fetch(`http://localhost:8000/api/v1/ehr/encounters/${selectedAppointment.encounter_id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                diagnosis: notes.diagnosis,
                treatment_plan: notes.prescription,
                doctor_notes: notes.note,
                follow_up_required: notes.follow_up_date ? true : false,
                follow_up_date: notes.follow_up_date || undefined
              })
            });
          } catch (encErr) {
            console.error('Error updating encounter:', encErr);
            // Don't fail the whole operation if encounter update fails
          }
        }
        
        setNotes({ note: '', diagnosis: '', prescription: '', follow_up_date: '' });
        setSelectedAppointment(null);
        fetchDoctorData();
        alert('Notes saved successfully!');
      } else {
        const error = await response.json();
        alert('Error saving notes: ' + (error.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding notes:', error);
      alert('Error saving notes. Please try again.');
    }
  };

  const fetchEncounterDetails = async (encounterId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/ehr/me/encounters/${encounterId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEncounterDetails(data);
      }
    } catch (error) {
      console.error('Error fetching encounter details:', error);
    }
  };

  const handleSelectAppointment = (apt: any) => {
    setSelectedAppointment(apt);
    setEncounterDetails(null);
    if (apt.encounter_id) {
      fetchEncounterDetails(apt.encounter_id);
    }
  };

  const getDayName = (dayNum: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
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
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 font-semibold ${activeTab === 'schedule' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-600'}`}
          >
            Schedule
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
                    <div key={apt.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold">{apt.patient_name}</p>
                          <p className="text-sm text-gray-600">{apt.appointment_time}</p>
                          <p className="text-sm text-gray-500 mt-1">Reason: {apt.reason}</p>
                          <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                            apt.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                            apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {apt.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <select
                            value={apt.status}
                            onChange={(e) => updateAppointmentStatus(apt.id, e.target.value)}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no-show">No Show</option>
                          </select>
                          <button
                            onClick={() => deleteAppointment(apt.id)}
                            className="px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                            title="Delete Appointment"
                          >
                            ✕
                          </button>
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
                    <tr key={apt.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{apt.patient_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(apt.appointment_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{apt.appointment_time}</td>
                      <td className="px-6 py-4">{apt.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={apt.status}
                          onChange={(e) => updateAppointmentStatus(apt.id, e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="no-show">No Show</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleSelectAppointment(apt)}
                          className="text-teal-600 hover:text-teal-800 text-sm"
                        >
                          Add Notes
                        </button>
                        <button
                          onClick={() => deleteAppointment(apt.id)}
                          className="ml-2 text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Patient List */}
              <div>
                <h4 className="text-md font-semibold mb-3">Patient List</h4>
                <div className="space-y-3">
                  {patients.map((patient) => (
                    <div 
                      key={patient.id || patient.email} 
                      className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 ${
                        selectedPatient === patient.id ? 'bg-teal-50 border-teal-500' : ''
                      }`}
                      onClick={() => fetchPatientEncounters(patient.id)}
                    >
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

              {/* Patient Encounters */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-md font-semibold">Medical History</h4>
                  {patientEncounters.length > 0 && (
                    <button
                      onClick={selectAllEncounters}
                      className="text-sm text-teal-600 hover:text-teal-800"
                    >
                      {selectedEncounters.length === patientEncounters.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {selectedPatient === null && (
                  <div className="text-center py-8 text-gray-500">
                    Select a patient to view their medical history
                  </div>
                )}

                {selectedPatient !== null && loadingEncounters && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                  </div>
                )}

                {selectedPatient !== null && !loadingEncounters && patientEncounters.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No medical history found for this patient
                  </div>
                )}

                {selectedPatient !== null && !loadingEncounters && patientEncounters.length > 0 && (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {patientEncounters.map((encounter) => (
                      <div 
                        key={encounter.id} 
                        className={`border rounded-lg p-4 ${
                          selectedEncounters.includes(encounter.id) ? 'bg-teal-50 border-teal-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedEncounters.includes(encounter.id)}
                              onChange={() => toggleEncounterSelection(encounter.id)}
                              className="h-4 w-4 text-teal-600 rounded"
                            />
                            <div>
                              <h5 className="font-semibold text-gray-800">{encounter.chief_complaint}</h5>
                              <p className="text-sm text-gray-600">
                                {new Date(encounter.encounter_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              encounter.severity === 'emergency' ? 'bg-red-100 text-red-800' :
                              encounter.severity === 'severe' ? 'bg-orange-100 text-orange-800' :
                              encounter.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {encounter.severity}
                            </span>
                            <button
                              onClick={() => viewEncounterDetails(encounter.id)}
                              className="px-3 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 transition"
                            >
                              View Details
                            </button>
                          </div>
                        </div>

                        {/* Symptoms */}
                        {encounter.symptoms && encounter.symptoms.length > 0 && (
                          <div className="mb-3">
                            <h6 className="text-xs font-semibold text-gray-600 mb-1">Symptoms:</h6>
                            <div className="flex flex-wrap gap-1">
                              {encounter.symptoms.map((symptom: any, idx: number) => (
                                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  {typeof symptom === 'string' ? symptom : symptom.symptom || symptom.name || JSON.stringify(symptom)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Assessment Report - Truncated */}
                        {encounter.assessment_report && (
                          <div className="mb-3">
                            <h6 className="text-xs font-semibold text-gray-600 mb-1">Assessment:</h6>
                            <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                              {encounter.assessment_report.length > 200 
                                ? `${encounter.assessment_report.substring(0, 200)}...` 
                                : encounter.assessment_report
                              }
                            </div>
                          </div>
                        )}

                        {/* Doctor's Note - Truncated */}
                        {encounter.doctor_notes && (
                          <div className="mb-3">
                            <h6 className="text-xs font-semibold text-gray-600 mb-1">Doctor's Note:</h6>
                            <p className="text-sm text-gray-700">
                              {encounter.doctor_notes.length > 150 
                                ? `${encounter.doctor_notes.substring(0, 150)}...` 
                                : encounter.doctor_notes
                              }
                            </p>
                          </div>
                        )}

                        {/* Recommended Specialization */}
                        {encounter.recommended_specialization && (
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <span className="font-semibold">Recommended:</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {encounter.recommended_specialization.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedEncounters.length > 0 && (
                  <div className="mt-4 p-3 bg-teal-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{selectedEncounters.length}</span> encounter(s) selected
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">My Schedule</h3>
              <button
                onClick={() => {
                  setEditingDay(-1); // Use -1 to indicate new entry
                  setScheduleForm({
                    day_of_week: 1, // Default to Monday
                    start_time: '09:00',
                    end_time: '17:00',
                    slot_duration_minutes: 30,
                    is_available: true
                  });
                }}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                + Add Schedule
              </button>
            </div>
            {scheduleLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {schedule.length === 0 && (
                    <div className="col-span-1 text-center py-4">
                      <p className="text-gray-500">No schedule found. Please add your availability.</p>
                    </div>
                  )}
                  {schedule.map((day) => (
                    <div key={day.id} className="border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{getDayName(day.day_of_week)}</p>
                        <p className="text-sm text-gray-600">{day.start_time} - {day.end_time}</p>
                        <p className="text-sm text-gray-500">Slot Duration: {day.slot_duration_minutes} mins</p>
                      </div>
                      <div className="flex-shrink-0 mt-2 sm:mt-0 sm:ml-4">
                        <button
                          onClick={() => {
                            setEditingDay(day.day_of_week);
                            setScheduleForm({
                              day_of_week: day.day_of_week,
                              start_time: day.start_time,
                              end_time: day.end_time,
                              slot_duration_minutes: day.slot_duration_minutes,
                              is_available: day.is_available
                            });
                          }}
                          className="px-3 py-1 bg-teal-600 text-white text-sm rounded hover:bg-teal-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteScheduleDay(day.id)}
                          className="ml-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add/Edit Schedule Form */}
                {editingDay !== null && (
                  <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold mb-4">{editingDay === -1 ? 'Add New Schedule' : 'Edit Schedule'}</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                        <select
                          value={scheduleForm.day_of_week}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: Number(e.target.value) })}
                          className="w-full p-2 border rounded-lg"
                        >
                          <option value={0}>Sunday</option>
                          <option value={1}>Monday</option>
                          <option value={2}>Tuesday</option>
                          <option value={3}>Wednesday</option>
                          <option value={4}>Thursday</option>
                          <option value={5}>Friday</option>
                          <option value={6}>Saturday</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={scheduleForm.start_time}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                          className="w-full p-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <input
                          type="time"
                          value={scheduleForm.end_time}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                          className="w-full p-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Slot Duration (minutes)</label>
                        <input
                          type="number"
                          value={scheduleForm.slot_duration_minutes}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, slot_duration_minutes: Number(e.target.value) })}
                          className="w-full p-2 border rounded-lg"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={scheduleForm.is_available}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, is_available: e.target.checked })}
                          className="h-4 w-4 text-teal-600 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">Available</label>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-3">
                      <button
                        onClick={saveScheduleDay}
                        className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingDay(null)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Add Medical Notes - {selectedAppointment.patient_name}</h3>
            
            {/* Show Comprehensive EHR Report if encounter is linked */}
            {encounterDetails && (
              <div className="mb-6 space-y-4">
                {/* Patient Summary */}
                {encounterDetails.patient_summary && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                      � Patient Information
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div><strong>Name:</strong> {encounterDetails.patient_summary.patient_name}</div>
                      <div><strong>Age:</strong> {encounterDetails.patient_summary.age}</div>
                      <div><strong>Gender:</strong> {encounterDetails.patient_summary.gender}</div>
                      <div><strong>Blood Type:</strong> {encounterDetails.patient_summary.blood_type}</div>
                      <div><strong>Height:</strong> {encounterDetails.patient_summary.height}</div>
                      <div><strong>Weight:</strong> {encounterDetails.patient_summary.weight}</div>
                    </div>
                  </div>
                )}
                
                {/* Allergies - CRITICAL */}
                {encounterDetails.patient_summary?.known_allergies && encounterDetails.patient_summary.known_allergies.length > 0 && (
                  <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg">
                    <h4 className="font-semibold text-red-900 mb-3 flex items-center">
                      ⚠️ ALLERGIES - CRITICAL
                    </h4>
                    <div className="space-y-2">
                      {encounterDetails.patient_summary.known_allergies.map((allergy: any, idx: number) => (
                        <div key={idx} className="text-sm bg-red-100 p-2 rounded">
                          <strong>{allergy.allergen || allergy.name}:</strong> {allergy.reaction} 
                          <span className="ml-2 text-red-700">(Severity: {allergy.severity})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Current Medications */}
                {encounterDetails.patient_summary?.current_medications && encounterDetails.patient_summary.current_medications.length > 0 && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-3">💊 Current Medications</h4>
                    <div className="space-y-2">
                      {encounterDetails.patient_summary.current_medications.map((med: any, idx: number) => (
                        <div key={idx} className="text-sm bg-purple-100 p-2 rounded">
                          <strong>{med.medication || med.name}:</strong> {med.dosage} ({med.frequency})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Chronic Conditions / Medical History */}
                {encounterDetails.patient_summary?.chronic_conditions && encounterDetails.patient_summary.chronic_conditions.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-3">📋 Medical History / Chronic Conditions</h4>
                    <div className="space-y-2">
                      {encounterDetails.patient_summary.chronic_conditions.map((condition: any, idx: number) => (
                        <div key={idx} className="text-sm bg-yellow-100 p-2 rounded">
                          <strong>{condition.condition || condition.name}:</strong> {condition.status} 
                          <span className="ml-2 text-gray-600">(Diagnosed: {condition.diagnosed_date})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Recent Vital Signs */}
                {encounterDetails.patient_summary?.vital_signs_history && encounterDetails.patient_summary.vital_signs_history.length > 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-3">💓 Recent Vital Signs</h4>
                    <div className="space-y-3">
                      {encounterDetails.patient_summary.vital_signs_history.slice(-3).map((vitals: any, idx: number) => (
                        <div key={idx} className="text-sm bg-green-100 p-2 rounded">
                          <div className="font-medium mb-1">Record {idx + 1} - {vitals.recorded_at}</div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {vitals.blood_pressure_systolic && (
                              <div>BP: {vitals.blood_pressure_systolic}/{vitals.blood_pressure_diastolic}</div>
                            )}
                            {vitals.heart_rate && <div>HR: {vitals.heart_rate} bpm</div>}
                            {vitals.temperature && <div>Temp: {vitals.temperature}°F</div>}
                            {vitals.weight && <div>Weight: {vitals.weight} kg</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Chief Complaint & AI Report */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">📝 Chief Complaint</h4>
                  <p className="text-sm">{encounterDetails.chief_complaint}</p>
                  
                  {encounterDetails.ai_preliminary_report && (
                    <div className="mt-3">
                      <h4 className="font-semibold text-gray-900 mb-2">🤖 AI Preliminary Assessment</h4>
                      <pre className="text-xs bg-white p-3 rounded border whitespace-pre-wrap">{encounterDetails.ai_preliminary_report}</pre>
                    </div>
                  )}
                  
                  {encounterDetails.assessment && (
                    <div className="mt-3">
                      <h4 className="font-semibold text-gray-900 mb-2">📋 Clinical Assessment</h4>
                      <pre className="text-xs bg-white p-3 rounded border whitespace-pre-wrap">{encounterDetails.assessment}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Notes Input Form */}
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
                  onClick={() => addAppointmentNotes(selectedAppointment.id)}
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

      {/* Detailed Encounter Modal */}
      {detailedEncounter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Encounter Details</h3>
              <button
                onClick={() => {
                  setDetailedEncounter(null);
                  setPatientInfo(null);
                  setPatientEhr(null);
                  setEncounterNote('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Patient Summary Section */}
            {patientInfo && (
              <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg mb-6 shadow-sm">
                <h4 className="font-bold text-blue-900 mb-4 flex items-center text-xl">
                  👤 Patient Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Name</p>
                    <p className="text-sm font-bold text-gray-800">{patientInfo.name}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Age</p>
                    <p className="text-sm font-bold text-gray-800">{patientInfo.age} years</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Gender</p>
                    <p className="text-sm font-bold text-gray-800">{patientInfo.gender}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Blood Type</p>
                    <p className="text-sm font-bold text-gray-800">{patientEhr?.blood_type || 'Unknown'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Phone</p>
                    <p className="text-sm font-bold text-gray-800">{patientInfo.phone}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Address</p>
                    <p className="text-sm font-bold text-gray-800">{patientInfo.address}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Latest Vital Signs */}
            {patientEhr && patientEhr.vital_signs && patientEhr.vital_signs.length > 0 && (
              <div className="p-5 bg-green-50 border-2 border-green-300 rounded-lg mb-6">
                <h4 className="font-bold text-green-900 mb-3 text-lg">💓 Latest Vital Signs</h4>
                {(() => {
                  const latestVitals = patientEhr.vital_signs[patientEhr.vital_signs.length - 1];
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {latestVitals.blood_pressure_systolic && (
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">BP</p>
                          <p className="text-sm font-bold text-gray-800">
                            {latestVitals.blood_pressure_systolic}/{latestVitals.blood_pressure_diastolic}
                          </p>
                        </div>
                      )}
                      {latestVitals.heart_rate && (
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">HR</p>
                          <p className="text-sm font-bold text-gray-800">{latestVitals.heart_rate} bpm</p>
                        </div>
                      )}
                      {latestVitals.temperature && (
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Temp</p>
                          <p className="text-sm font-bold text-gray-800">{latestVitals.temperature}°F</p>
                        </div>
                      )}
                      {latestVitals.weight && (
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Weight</p>
                          <p className="text-sm font-bold text-gray-800">{latestVitals.weight} kg</p>
                        </div>
                      )}
                      {patientEhr.height && (
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Height</p>
                          <p className="text-sm font-bold text-gray-800">{patientEhr.height}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Medical Information */}
            {patientEhr && (
              <div className="space-y-4 mb-6">

                {/* Current Medications */}
                {patientEhr.medications && patientEhr.medications.length > 0 && (
                  <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                    <h4 className="font-bold text-purple-900 mb-3 text-lg">💊 Current Medications</h4>
                    <div className="space-y-2">
                      {patientEhr.medications.map((med: any, idx: number) => (
                        <div key={idx} className="text-sm bg-purple-100 p-2 rounded">
                          <strong>{med.medication || med.name || 'Unknown'}:</strong>{' '}
                          {med.dosage || 'N/A'} ({med.frequency || 'N/A'})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ALLERGIES - CRITICAL */}
                {patientEhr.allergies && patientEhr.allergies.length > 0 && (
                  <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg">
                    <h4 className="font-bold text-red-900 mb-3 flex items-center text-lg">
                      ⚠️ ALLERGIES - CRITICAL
                    </h4>
                    <div className="space-y-2">
                      {patientEhr.allergies.map((allergy: any, idx: number) => (
                        <div key={idx} className="text-sm bg-red-100 p-3 rounded border border-red-300">
                          <strong className="text-red-900">{allergy.allergen || allergy.name || 'Unknown'}:</strong>{' '}
                          <span className="text-red-800">{allergy.reaction || 'N/A'}</span>
                          {allergy.severity && (
                            <span className="ml-2 px-2 py-0.5 bg-red-200 text-red-900 rounded text-xs font-bold">
                              Severity: {allergy.severity}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chronic Conditions / Medical History */}
                {patientEhr.chronic_conditions && patientEhr.chronic_conditions.length > 0 && (
                  <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                    <h4 className="font-bold text-yellow-900 mb-3 text-lg">📋 Medical History / Chronic Conditions</h4>
                    <div className="space-y-2">
                      {patientEhr.chronic_conditions.map((condition: any, idx: number) => (
                        <div key={idx} className="text-sm bg-yellow-100 p-2 rounded">
                          <strong>{condition.condition || condition.name || 'Unknown'}:</strong>{' '}
                          {condition.status || 'Active'}
                          {condition.diagnosed_date && (
                            <span className="ml-2 text-gray-600">(Diagnosed: {condition.diagnosed_date})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Current Encounter Details */}
            <div className="space-y-4 mb-6 border-t-4 border-teal-500 pt-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">📝 Current Encounter</h3>
              
              <div className="p-4 bg-gray-50 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-lg">Chief Complaint</h4>
                    <p className="text-gray-700 mt-1">{detailedEncounter.chief_complaint}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    detailedEncounter.severity === 'emergency' ? 'bg-red-100 text-red-800' :
                    detailedEncounter.severity === 'severe' ? 'bg-orange-100 text-orange-800' :
                    detailedEncounter.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {detailedEncounter.severity?.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {new Date(detailedEncounter.encounter_date).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Symptoms */}
              {detailedEncounter.symptoms && detailedEncounter.symptoms.length > 0 && (
                <div className="p-4 bg-teal-50 border-2 border-teal-200 rounded-lg">
                  <h4 className="font-semibold text-teal-900 mb-2">🩺 Symptoms</h4>
                  <div className="flex flex-wrap gap-2">
                    {detailedEncounter.symptoms.map((symptom: any, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium">
                        {typeof symptom === 'string' ? symptom : symptom.symptom || symptom.name || JSON.stringify(symptom)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Encounter Vital Signs */}
              {detailedEncounter.vital_signs && Object.keys(detailedEncounter.vital_signs).length > 0 && (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-2">🩺 Encounter Vital Signs</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {detailedEncounter.vital_signs.blood_pressure_systolic && (
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold">BP:</span> {detailedEncounter.vital_signs.blood_pressure_systolic}/{detailedEncounter.vital_signs.blood_pressure_diastolic} mmHg
                      </div>
                    )}
                    {detailedEncounter.vital_signs.heart_rate && (
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold">Heart Rate:</span> {detailedEncounter.vital_signs.heart_rate} bpm
                      </div>
                    )}
                    {detailedEncounter.vital_signs.temperature && (
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold">Temperature:</span> {detailedEncounter.vital_signs.temperature}°F
                      </div>
                    )}
                    {detailedEncounter.vital_signs.respiratory_rate && (
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold">Respiratory:</span> {detailedEncounter.vital_signs.respiratory_rate} /min
                      </div>
                    )}
                    {detailedEncounter.vital_signs.oxygen_saturation && (
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold">SpO2:</span> {detailedEncounter.vital_signs.oxygen_saturation}%
                      </div>
                    )}
                    {detailedEncounter.vital_signs.weight && (
                      <div className="bg-white p-2 rounded">
                        <span className="font-semibold">Weight:</span> {detailedEncounter.vital_signs.weight} kg
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Preliminary Report */}
              {detailedEncounter.ai_preliminary_report && (
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <h4 className="font-bold text-blue-900 mb-2 text-lg">🤖 AI Preliminary Assessment</h4>
                  <pre className="text-gray-700 whitespace-pre-wrap text-sm font-sans bg-white p-3 rounded border border-blue-100">
                    {detailedEncounter.ai_preliminary_report}
                  </pre>
                </div>
              )}

              {/* Assessment */}
              {detailedEncounter.assessment && (
                <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                  <h4 className="font-bold text-purple-900 mb-2 text-lg">📋 Clinical Assessment</h4>
                  <pre className="text-gray-700 whitespace-pre-wrap text-sm font-sans bg-white p-3 rounded border border-purple-100">
                    {detailedEncounter.assessment}
                  </pre>
                </div>
              )}

              {/* Recommended Specialization */}
              {detailedEncounter.recommended_specialization && (
                <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">🏥 Recommended Specialization</h4>
                  <span className="px-3 py-1 bg-purple-200 text-purple-900 rounded-lg text-sm font-bold">
                    {detailedEncounter.recommended_specialization.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Doctor's Note Section */}
            <div className="border-t-4 border-teal-500 pt-6">
              <h4 className="font-bold text-gray-800 mb-3 text-xl">✍️ Doctor's Note</h4>
              
              {/* Show existing diagnosis and treatment plan if available */}
              {(detailedEncounter.diagnosis || detailedEncounter.treatment_plan || detailedEncounter.doctor_notes) && (
                <div className="mb-4 p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
                  <h5 className="font-semibold text-gray-700 mb-2">Previous Documentation:</h5>
                  {detailedEncounter.diagnosis && (
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Diagnosis:</span>
                      <p className="text-gray-700 mt-1">{detailedEncounter.diagnosis}</p>
                    </div>
                  )}
                  {detailedEncounter.treatment_plan && (
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Treatment Plan:</span>
                      <p className="text-gray-700 mt-1">{detailedEncounter.treatment_plan}</p>
                    </div>
                  )}
                  {detailedEncounter.doctor_notes && (
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Doctor's Notes:</span>
                      <p className="text-gray-700 mt-1">{detailedEncounter.doctor_notes}</p>
                    </div>
                  )}
                </div>
              )}
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add/Update Doctor's Note:
              </label>
              <textarea
                className="w-full p-3 border-2 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                rows={6}
                value={encounterNote}
                onChange={(e) => setEncounterNote(e.target.value)}
                placeholder="Add your clinical observations, diagnosis, treatment plan, and recommendations here..."
              />
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={saveEncounterNote}
                  disabled={savingNote}
                  className={`flex-1 py-3 rounded-lg transition font-semibold ${
                    savingNote 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-teal-600 hover:bg-teal-700'
                  } text-white`}
                >
                  {savingNote ? 'Saving...' : '💾 Save Doctor Note'}
                </button>
                <button
                  onClick={() => {
                    setDetailedEncounter(null);
                    setPatientInfo(null);
                    setPatientEhr(null);
                    setEncounterNote('');
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 font-semibold"
                >
                  Close
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
