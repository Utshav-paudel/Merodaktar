import React, { useState, useEffect } from 'react';
import {
  CalendarDaysIcon,
  ClockIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  UsersIcon,
  TrashIcon,
  PencilSquareIcon,
  PlusIcon,
  XMarkIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  HeartIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import {
  Button,
  IconButton,
  Card,
  Input,
  Textarea,
  Select,
  Field,
  Badge,
  Spinner,
  StatCard,
  EmptyState,
  cn,
} from '../lib/ui';
import AppLayout from './layout/AppLayout';
import type { BadgeTone } from '../lib/ui';

interface DoctorDashboardProps {
  token: string;
  onLogout: () => void;
}

const statusTone = (status: string): BadgeTone => {
  switch (status) {
    case 'confirmed':
      return 'blue';
    case 'completed':
      return 'emerald';
    case 'cancelled':
      return 'rose';
    default:
      return 'amber';
  }
};

const severityTone = (severity: string): BadgeTone => {
  switch (severity) {
    case 'emergency':
      return 'rose';
    case 'severe':
      return 'amber';
    case 'moderate':
      return 'amber';
    default:
      return 'emerald';
  }
};

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
      <AppLayout role="doctor" onLogout={onLogout} title="Dashboard">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-slate-500">
            <Spinner className="h-10 w-10 text-brand-600" />
            <p className="text-sm">Loading your dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const tabs: { key: typeof activeTab; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
    { key: 'overview', label: 'Overview', icon: ClipboardDocumentListIcon },
    { key: 'appointments', label: 'Appointments', icon: CalendarDaysIcon },
    { key: 'patients', label: 'Patients', icon: UsersIcon },
    { key: 'schedule', label: 'Schedule', icon: ClockIcon },
  ];

  const subtitle = profile
    ? `Dr. ${profile.full_name}${profile.specialization ? ` · ${profile.specialization}` : ''}`
    : undefined;

  return (
    <AppLayout role="doctor" onLogout={onLogout} title="Dashboard" subtitle={subtitle}>
      <div className="animate-fade-in-up space-y-8">
        {/* Welcome / header */}
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-3xl font-bold text-slate-900">
            Welcome back{profile ? `, Dr. ${profile.full_name}` : ''}
          </h2>
          <p className="text-sm text-slate-500">
            {profile?.specialization
              ? `${profile.specialization} — here is what's happening today.`
              : "Here is what's happening today."}
          </p>
        </div>

        {/* Tabs */}
        <Card className="p-1.5">
          <div className="flex flex-wrap gap-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
                  activeTab === key
                    ? 'bg-gradient-brand text-white shadow-glow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </Card>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard
                  label="Total Appointments"
                  value={stats.total_appointments}
                  icon={<CalendarDaysIcon className="h-6 w-6" />}
                  tone="brand"
                />
                <StatCard
                  label="Today's Appointments"
                  value={stats.today_appointments}
                  icon={<ClockIcon className="h-6 w-6" />}
                  tone="blue"
                />
                <StatCard
                  label="Pending"
                  value={stats.pending_appointments}
                  icon={<ClipboardDocumentCheckIcon className="h-6 w-6" />}
                  tone="amber"
                />
                <StatCard
                  label="Completed"
                  value={stats.completed_appointments}
                  icon={<CheckCircleIcon className="h-6 w-6" />}
                  tone="emerald"
                />
                <StatCard
                  label="Total Patients"
                  value={stats.total_patients}
                  icon={<UsersIcon className="h-6 w-6" />}
                  tone="blue"
                />
              </div>
            )}

            {/* Today's Appointments */}
            <Card className="p-6">
              <div className="mb-5 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-brand-700" />
                <h3 className="font-display text-lg font-semibold text-slate-900">Today's Appointments</h3>
              </div>
              {todayAppointments.length > 0 ? (
                <div className="space-y-3">
                  {todayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{apt.patient_name}</p>
                          <p className="mt-0.5 text-sm text-slate-500">{apt.appointment_time}</p>
                          <p className="mt-1 text-sm text-slate-400">Reason: {apt.reason}</p>
                          <div className="mt-2">
                            <Badge tone={statusTone(apt.status)}>{apt.status.toUpperCase()}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={apt.status}
                            onChange={(e) => updateAppointmentStatus(apt.id, e.target.value)}
                            className="w-auto py-2 text-sm"
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no-show">No Show</option>
                          </Select>
                          <IconButton
                            label="Delete Appointment"
                            onClick={() => deleteAppointment(apt.id)}
                            className="hover:bg-rose-50 hover:text-rose-600"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </IconButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<CalendarDaysIcon className="h-7 w-7" />}
                  title="No appointments today"
                  description="You have a clear schedule for the day."
                />
              )}
            </Card>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <Card className="p-6">
            <div className="mb-5 flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-brand-700" />
              <h3 className="font-display text-lg font-semibold text-slate-900">All Appointments</h3>
            </div>
            {appointments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm text-slate-600">
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="transition hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-900">{apt.patient_name}</td>
                        <td className="whitespace-nowrap px-4 py-4">{new Date(apt.appointment_date).toLocaleDateString()}</td>
                        <td className="whitespace-nowrap px-4 py-4">{apt.appointment_time}</td>
                        <td className="px-4 py-4 text-slate-500">{apt.reason}</td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <Select
                            value={apt.status}
                            onChange={(e) => updateAppointmentStatus(apt.id, e.target.value)}
                            className="w-auto py-2 text-sm"
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no-show">No Show</option>
                          </Select>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<PencilSquareIcon className="h-4 w-4" />}
                              onClick={() => handleSelectAppointment(apt)}
                            >
                              Add Notes
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              leftIcon={<TrashIcon className="h-4 w-4" />}
                              onClick={() => deleteAppointment(apt.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<CalendarDaysIcon className="h-7 w-7" />}
                title="No appointments yet"
                description="Appointments booked by patients will appear here."
              />
            )}
          </Card>
        )}

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <Card className="p-6">
            <div className="mb-5 flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-brand-700" />
              <h3 className="font-display text-lg font-semibold text-slate-900">My Patients</h3>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Patient List */}
              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Patient List</h4>
                {patients.length > 0 ? (
                  <div className="space-y-3">
                    {patients.map((patient) => (
                      <button
                        key={patient.id || patient.email}
                        type="button"
                        className={cn(
                          'w-full rounded-xl border p-4 text-left transition',
                          selectedPatient === patient.id
                            ? 'border-brand-300 bg-brand-50 shadow-glow-sm'
                            : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                        )}
                        onClick={() => fetchPatientEncounters(patient.id)}
                      >
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-white">
                            {(patient.name || '?').charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <h4 className="truncate font-semibold text-slate-900">{patient.name}</h4>
                            <p className="truncate text-sm text-slate-500">{patient.email}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <Badge tone="slate">{patient.total_appointments} appointment(s)</Badge>
                              {patient.last_visit && (
                                <span>Last visit: {new Date(patient.last_visit).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<UsersIcon className="h-7 w-7" />}
                    title="No patients yet"
                    description="Patients you treat will appear here."
                  />
                )}
              </div>

              {/* Patient Encounters */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Medical History</h4>
                  {patientEncounters.length > 0 && (
                    <button
                      onClick={selectAllEncounters}
                      className="text-sm font-medium text-brand-700 transition hover:text-brand-800"
                    >
                      {selectedEncounters.length === patientEncounters.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {selectedPatient === null && (
                  <EmptyState
                    icon={<ClipboardDocumentListIcon className="h-7 w-7" />}
                    title="Select a patient"
                    description="Choose a patient to view their medical history."
                  />
                )}

                {selectedPatient !== null && loadingEncounters && (
                  <div className="flex items-center justify-center py-12">
                    <Spinner className="h-8 w-8 text-brand-600" />
                  </div>
                )}

                {selectedPatient !== null && !loadingEncounters && patientEncounters.length === 0 && (
                  <EmptyState
                    icon={<DocumentTextIcon className="h-7 w-7" />}
                    title="No medical history"
                    description="No encounters found for this patient."
                  />
                )}

                {selectedPatient !== null && !loadingEncounters && patientEncounters.length > 0 && (
                  <div className="max-h-[600px] space-y-4 overflow-y-auto pr-1">
                    {patientEncounters.map((encounter) => (
                      <div
                        key={encounter.id}
                        className={cn(
                          'rounded-xl border p-4 transition',
                          selectedEncounters.includes(encounter.id)
                            ? 'border-brand-300 bg-brand-50'
                            : 'border-slate-200 bg-slate-50'
                        )}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedEncounters.includes(encounter.id)}
                              onChange={() => toggleEncounterSelection(encounter.id)}
                              className="mt-1 h-4 w-4 rounded border-slate-300 bg-white text-brand-600 focus:ring-brand-500/40"
                            />
                            <div>
                              <h5 className="font-semibold text-slate-900">{encounter.chief_complaint}</h5>
                              <p className="text-sm text-slate-500">
                                {new Date(encounter.encounter_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone={severityTone(encounter.severity)}>{encounter.severity}</Badge>
                            <Button size="sm" variant="primary" onClick={() => viewEncounterDetails(encounter.id)}>
                              View Details
                            </Button>
                          </div>
                        </div>

                        {/* Symptoms */}
                        {encounter.symptoms && encounter.symptoms.length > 0 && (
                          <div className="mb-3">
                            <h6 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Symptoms</h6>
                            <div className="flex flex-wrap gap-1.5">
                              {encounter.symptoms.map((symptom: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600"
                                >
                                  {typeof symptom === 'string' ? symptom : symptom.symptom || symptom.name || JSON.stringify(symptom)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Assessment Report - Truncated */}
                        {encounter.assessment_report && (
                          <div className="mb-3">
                            <h6 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Assessment</h6>
                            <div className="rounded-lg bg-white p-2 text-sm text-slate-600">
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
                            <h6 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Doctor's Note</h6>
                            <p className="text-sm text-slate-600">
                              {encounter.doctor_notes.length > 150
                                ? `${encounter.doctor_notes.substring(0, 150)}...`
                                : encounter.doctor_notes
                              }
                            </p>
                          </div>
                        )}

                        {/* Recommended Specialization */}
                        {encounter.recommended_specialization && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold">Recommended:</span>
                            <Badge tone="blue">
                              {encounter.recommended_specialization.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedEncounters.length > 0 && (
                  <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-3">
                    <p className="text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">{selectedEncounters.length}</span> encounter(s) selected
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-brand-700" />
                <h3 className="font-display text-lg font-semibold text-slate-900">My Schedule</h3>
              </div>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="h-4 w-4" />}
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
              >
                Add Schedule
              </Button>
            </div>
            {scheduleLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-8 w-8 text-brand-600" />
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {schedule.length === 0 && (
                    <div className="md:col-span-2">
                      <EmptyState
                        icon={<ClockIcon className="h-7 w-7" />}
                        title="No schedule found"
                        description="Please add your availability to start accepting appointments."
                      />
                    </div>
                  )}
                  {schedule.map((day) => (
                    <div
                      key={day.id}
                      className="flex flex-col items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 sm:flex-row"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{getDayName(day.day_of_week)}</p>
                          {day.is_available ? (
                            <Badge tone="emerald">Available</Badge>
                          ) : (
                            <Badge tone="slate">Off</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{day.start_time} - {day.end_time}</p>
                        <p className="text-sm text-slate-400">Slot Duration: {day.slot_duration_minutes} mins</p>
                      </div>
                      <div className="mt-3 flex flex-shrink-0 items-center gap-2 sm:mt-0 sm:ml-4">
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<PencilSquareIcon className="h-4 w-4" />}
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
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={<TrashIcon className="h-4 w-4" />}
                          onClick={() => deleteScheduleDay(day.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add/Edit Schedule Form */}
                {editingDay !== null && (
                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <h4 className="mb-4 font-display text-base font-semibold text-slate-900">
                      {editingDay === -1 ? 'Add New Schedule' : 'Edit Schedule'}
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <Field label="Day of Week">
                        <Select
                          value={scheduleForm.day_of_week}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: Number(e.target.value) })}
                        >
                          <option value={0}>Sunday</option>
                          <option value={1}>Monday</option>
                          <option value={2}>Tuesday</option>
                          <option value={3}>Wednesday</option>
                          <option value={4}>Thursday</option>
                          <option value={5}>Friday</option>
                          <option value={6}>Saturday</option>
                        </Select>
                      </Field>
                      <Field label="Start Time">
                        <Input
                          type="time"
                          value={scheduleForm.start_time}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                        />
                      </Field>
                      <Field label="End Time">
                        <Input
                          type="time"
                          value={scheduleForm.end_time}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                        />
                      </Field>
                      <Field label="Slot Duration (minutes)">
                        <Input
                          type="number"
                          value={scheduleForm.slot_duration_minutes}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, slot_duration_minutes: Number(e.target.value) })}
                        />
                      </Field>
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={scheduleForm.is_available}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, is_available: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 bg-white text-brand-600 focus:ring-brand-500/40"
                        />
                        Available
                      </label>
                    </div>
                    <div className="mt-5 flex gap-3">
                      <Button variant="primary" fullWidth onClick={saveScheduleDay}>
                        Save
                      </Button>
                      <Button variant="secondary" fullWidth onClick={() => setEditingDay(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Notes Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6 animate-fade-in-up">
            <div className="mb-5 flex items-center gap-2">
              <PencilSquareIcon className="h-5 w-5 text-brand-700" />
              <h3 className="font-display text-xl font-semibold text-slate-900">
                Add Medical Notes &mdash; {selectedAppointment.patient_name}
              </h3>
            </div>

            {/* Show Comprehensive EHR Report if encounter is linked */}
            {encounterDetails && (
              <div className="mb-6 space-y-4">
                {/* Patient Summary */}
                {encounterDetails.patient_summary && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-sky-700">
                      <UserCircleIcon className="h-5 w-5" /> Patient Information
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 md:grid-cols-3">
                      <div><strong className="text-slate-900">Name:</strong> {encounterDetails.patient_summary.patient_name}</div>
                      <div><strong className="text-slate-900">Age:</strong> {encounterDetails.patient_summary.age}</div>
                      <div><strong className="text-slate-900">Gender:</strong> {encounterDetails.patient_summary.gender}</div>
                      <div><strong className="text-slate-900">Blood Type:</strong> {encounterDetails.patient_summary.blood_type}</div>
                      <div><strong className="text-slate-900">Height:</strong> {encounterDetails.patient_summary.height}</div>
                      <div><strong className="text-slate-900">Weight:</strong> {encounterDetails.patient_summary.weight}</div>
                    </div>
                  </div>
                )}

                {/* Allergies - CRITICAL */}
                {encounterDetails.patient_summary?.known_allergies && encounterDetails.patient_summary.known_allergies.length > 0 && (
                  <div className="rounded-xl border-2 border-rose-300 bg-rose-50 p-4">
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-rose-700">
                      <ExclamationTriangleIcon className="h-5 w-5" /> ALLERGIES - CRITICAL
                    </h4>
                    <div className="space-y-2">
                      {encounterDetails.patient_summary.known_allergies.map((allergy: any, idx: number) => (
                        <div key={idx} className="rounded-lg bg-rose-100 p-2 text-sm text-slate-700">
                          <strong className="text-rose-700">{allergy.allergen || allergy.name}:</strong> {allergy.reaction}
                          <span className="ml-2 text-rose-600">(Severity: {allergy.severity})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Medications */}
                {encounterDetails.patient_summary?.current_medications && encounterDetails.patient_summary.current_medications.length > 0 && (
                  <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-brand-700">
                      <BeakerIcon className="h-5 w-5" /> Current Medications
                    </h4>
                    <div className="space-y-2">
                      {encounterDetails.patient_summary.current_medications.map((med: any, idx: number) => (
                        <div key={idx} className="rounded-lg bg-brand-100 p-2 text-sm text-slate-700">
                          <strong className="text-slate-900">{med.medication || med.name}:</strong> {med.dosage} ({med.frequency})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chronic Conditions / Medical History */}
                {encounterDetails.patient_summary?.chronic_conditions && encounterDetails.patient_summary.chronic_conditions.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-amber-700">
                      <ClipboardDocumentListIcon className="h-5 w-5" /> Medical History / Chronic Conditions
                    </h4>
                    <div className="space-y-2">
                      {encounterDetails.patient_summary.chronic_conditions.map((condition: any, idx: number) => (
                        <div key={idx} className="rounded-lg bg-amber-100 p-2 text-sm text-slate-700">
                          <strong className="text-slate-900">{condition.condition || condition.name}:</strong> {condition.status}
                          <span className="ml-2 text-slate-500">(Diagnosed: {condition.diagnosed_date})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Vital Signs */}
                {encounterDetails.patient_summary?.vital_signs_history && encounterDetails.patient_summary.vital_signs_history.length > 0 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-emerald-700">
                      <HeartIcon className="h-5 w-5" /> Recent Vital Signs
                    </h4>
                    <div className="space-y-3">
                      {encounterDetails.patient_summary.vital_signs_history.slice(-3).map((vitals: any, idx: number) => (
                        <div key={idx} className="rounded-lg bg-emerald-100 p-2 text-sm text-slate-700">
                          <div className="mb-1 font-medium text-slate-900">Record {idx + 1} - {vitals.recorded_at}</div>
                          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                            {vitals.blood_pressure_systolic && (
                              <div>BP: {vitals.blood_pressure_systolic}/{vitals.blood_pressure_diastolic}</div>
                            )}
                            {vitals.heart_rate && <div>HR: {vitals.heart_rate} bpm</div>}
                            {vitals.temperature && <div>Temp: {vitals.temperature}&deg;F</div>}
                            {vitals.weight && <div>Weight: {vitals.weight} kg</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chief Complaint & AI Report */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                    <DocumentTextIcon className="h-5 w-5 text-slate-500" /> Chief Complaint
                  </h4>
                  <p className="text-sm text-slate-600">{encounterDetails.chief_complaint}</p>

                  {encounterDetails.ai_preliminary_report && (
                    <div className="mt-3">
                      <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                        <SparklesIcon className="h-5 w-5 text-brand-700" /> AI Preliminary Assessment
                      </h4>
                      <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">{encounterDetails.ai_preliminary_report}</pre>
                    </div>
                  )}

                  {encounterDetails.assessment && (
                    <div className="mt-3">
                      <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                        <ClipboardDocumentListIcon className="h-5 w-5 text-slate-500" /> Clinical Assessment
                      </h4>
                      <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">{encounterDetails.assessment}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes Input Form */}
            <div className="space-y-4">
              <Field label="Clinical Notes">
                <Textarea
                  rows={4}
                  value={notes.note}
                  onChange={(e) => setNotes({ ...notes, note: e.target.value })}
                  placeholder="Enter clinical observations and notes..."
                />
              </Field>
              <Field label="Diagnosis">
                <Input
                  type="text"
                  value={notes.diagnosis}
                  onChange={(e) => setNotes({ ...notes, diagnosis: e.target.value })}
                  placeholder="Enter diagnosis..."
                />
              </Field>
              <Field label="Prescription">
                <Textarea
                  rows={3}
                  value={notes.prescription}
                  onChange={(e) => setNotes({ ...notes, prescription: e.target.value })}
                  placeholder="Enter prescription details..."
                />
              </Field>
              <Field label="Follow-up Date">
                <Input
                  type="date"
                  value={notes.follow_up_date}
                  onChange={(e) => setNotes({ ...notes, follow_up_date: e.target.value })}
                />
              </Field>
              <div className="flex gap-3">
                <Button variant="primary" fullWidth onClick={() => addAppointmentNotes(selectedAppointment.id)}>
                  Save Notes
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setSelectedAppointment(null);
                    setNotes({ note: '', diagnosis: '', prescription: '', follow_up_date: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Detailed Encounter Modal */}
      {detailedEncounter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <Card className="max-h-[95vh] w-full max-w-6xl overflow-y-auto p-6 animate-fade-in-up">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-2xl font-bold text-slate-900">Encounter Details</h3>
              <IconButton
                label="Close"
                onClick={() => {
                  setDetailedEncounter(null);
                  setPatientInfo(null);
                  setPatientEhr(null);
                  setEncounterNote('');
                }}
              >
                <XMarkIcon className="h-6 w-6" />
              </IconButton>
            </div>

            {/* Patient Summary Section */}
            {patientInfo && (
              <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-5">
                <h4 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-sky-700">
                  <UserCircleIcon className="h-6 w-6" /> Patient Summary
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Name</p>
                    <p className="text-sm font-bold text-slate-900">{patientInfo.name}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Age</p>
                    <p className="text-sm font-bold text-slate-900">{patientInfo.age} years</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Gender</p>
                    <p className="text-sm font-bold text-slate-900">{patientInfo.gender}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Blood Type</p>
                    <p className="text-sm font-bold text-slate-900">{patientEhr?.blood_type || 'Unknown'}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Phone</p>
                    <p className="text-sm font-bold text-slate-900">{patientInfo.phone}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Address</p>
                    <p className="text-sm font-bold text-slate-900">{patientInfo.address}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Latest Vital Signs */}
            {patientEhr && patientEhr.vital_signs && patientEhr.vital_signs.length > 0 && (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h4 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-emerald-700">
                  <HeartIcon className="h-5 w-5" /> Latest Vital Signs
                </h4>
                {(() => {
                  const latestVitals = patientEhr.vital_signs[patientEhr.vital_signs.length - 1];
                  return (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                      {latestVitals.blood_pressure_systolic && (
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="mb-1 text-xs font-semibold uppercase text-slate-400">BP</p>
                          <p className="text-sm font-bold text-slate-900">
                            {latestVitals.blood_pressure_systolic}/{latestVitals.blood_pressure_diastolic}
                          </p>
                        </div>
                      )}
                      {latestVitals.heart_rate && (
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="mb-1 text-xs font-semibold uppercase text-slate-400">HR</p>
                          <p className="text-sm font-bold text-slate-900">{latestVitals.heart_rate} bpm</p>
                        </div>
                      )}
                      {latestVitals.temperature && (
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Temp</p>
                          <p className="text-sm font-bold text-slate-900">{latestVitals.temperature}&deg;F</p>
                        </div>
                      )}
                      {latestVitals.weight && (
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Weight</p>
                          <p className="text-sm font-bold text-slate-900">{latestVitals.weight} kg</p>
                        </div>
                      )}
                      {patientEhr.height && (
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Height</p>
                          <p className="text-sm font-bold text-slate-900">{patientEhr.height}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Medical Information */}
            {patientEhr && (
              <div className="mb-6 space-y-4">

                {/* Current Medications */}
                {patientEhr.medications && patientEhr.medications.length > 0 && (
                  <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                    <h4 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-brand-700">
                      <BeakerIcon className="h-5 w-5" /> Current Medications
                    </h4>
                    <div className="space-y-2">
                      {patientEhr.medications.map((med: any, idx: number) => (
                        <div key={idx} className="rounded-lg bg-brand-100 p-2 text-sm text-slate-700">
                          <strong className="text-slate-900">{med.medication || med.name || 'Unknown'}:</strong>{' '}
                          {med.dosage || 'N/A'} ({med.frequency || 'N/A'})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ALLERGIES - CRITICAL */}
                {patientEhr.allergies && patientEhr.allergies.length > 0 && (
                  <div className="rounded-xl border-2 border-rose-300 bg-rose-50 p-4">
                    <h4 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-rose-700">
                      <ExclamationTriangleIcon className="h-5 w-5" /> ALLERGIES - CRITICAL
                    </h4>
                    <div className="space-y-2">
                      {patientEhr.allergies.map((allergy: any, idx: number) => (
                        <div key={idx} className="rounded-lg border border-rose-200 bg-rose-100 p-3 text-sm text-slate-700">
                          <strong className="text-rose-700">{allergy.allergen || allergy.name || 'Unknown'}:</strong>{' '}
                          <span className="text-rose-700">{allergy.reaction || 'N/A'}</span>
                          {allergy.severity && (
                            <span className="ml-2 rounded bg-rose-200 px-2 py-0.5 text-xs font-bold text-rose-700">
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
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <h4 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-amber-700">
                      <ClipboardDocumentListIcon className="h-5 w-5" /> Medical History / Chronic Conditions
                    </h4>
                    <div className="space-y-2">
                      {patientEhr.chronic_conditions.map((condition: any, idx: number) => (
                        <div key={idx} className="rounded-lg bg-amber-100 p-2 text-sm text-slate-700">
                          <strong className="text-slate-900">{condition.condition || condition.name || 'Unknown'}:</strong>{' '}
                          {condition.status || 'Active'}
                          {condition.diagnosed_date && (
                            <span className="ml-2 text-slate-500">(Diagnosed: {condition.diagnosed_date})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Current Encounter Details */}
            <div className="mb-6 space-y-4 border-t border-brand-200 pt-6">
              <h3 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-slate-900">
                <DocumentTextIcon className="h-6 w-6 text-brand-700" /> Current Encounter
              </h3>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-display text-lg font-semibold text-slate-900">Chief Complaint</h4>
                    <p className="mt-1 text-slate-600">{detailedEncounter.chief_complaint}</p>
                  </div>
                  <Badge tone={severityTone(detailedEncounter.severity)}>
                    {detailedEncounter.severity?.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">
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
                <div className="rounded-xl border border-accent-200 bg-accent-50 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-accent-700">
                    <HeartIcon className="h-5 w-5" /> Symptoms
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {detailedEncounter.symptoms.map((symptom: any, idx: number) => (
                      <span key={idx} className="rounded-full bg-accent-100 px-3 py-1 text-sm font-medium text-accent-700">
                        {typeof symptom === 'string' ? symptom : symptom.symptom || symptom.name || JSON.stringify(symptom)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Encounter Vital Signs */}
              {detailedEncounter.vital_signs && Object.keys(detailedEncounter.vital_signs).length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-amber-700">
                    <HeartIcon className="h-5 w-5" /> Encounter Vital Signs
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 md:grid-cols-4">
                    {detailedEncounter.vital_signs.blood_pressure_systolic && (
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <span className="font-semibold text-slate-900">BP:</span> {detailedEncounter.vital_signs.blood_pressure_systolic}/{detailedEncounter.vital_signs.blood_pressure_diastolic} mmHg
                      </div>
                    )}
                    {detailedEncounter.vital_signs.heart_rate && (
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <span className="font-semibold text-slate-900">Heart Rate:</span> {detailedEncounter.vital_signs.heart_rate} bpm
                      </div>
                    )}
                    {detailedEncounter.vital_signs.temperature && (
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <span className="font-semibold text-slate-900">Temperature:</span> {detailedEncounter.vital_signs.temperature}&deg;F
                      </div>
                    )}
                    {detailedEncounter.vital_signs.respiratory_rate && (
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <span className="font-semibold text-slate-900">Respiratory:</span> {detailedEncounter.vital_signs.respiratory_rate} /min
                      </div>
                    )}
                    {detailedEncounter.vital_signs.oxygen_saturation && (
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <span className="font-semibold text-slate-900">SpO2:</span> {detailedEncounter.vital_signs.oxygen_saturation}%
                      </div>
                    )}
                    {detailedEncounter.vital_signs.weight && (
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <span className="font-semibold text-slate-900">Weight:</span> {detailedEncounter.vital_signs.weight} kg
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Preliminary Report */}
              {detailedEncounter.ai_preliminary_report && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-display text-lg font-bold text-sky-700">
                    <SparklesIcon className="h-5 w-5" /> AI Preliminary Assessment
                  </h4>
                  <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 font-sans text-sm text-slate-600">
                    {detailedEncounter.ai_preliminary_report}
                  </pre>
                </div>
              )}

              {/* Assessment */}
              {detailedEncounter.assessment && (
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-display text-lg font-bold text-brand-700">
                    <ClipboardDocumentListIcon className="h-5 w-5" /> Clinical Assessment
                  </h4>
                  <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 font-sans text-sm text-slate-600">
                    {detailedEncounter.assessment}
                  </pre>
                </div>
              )}

              {/* Recommended Specialization */}
              {detailedEncounter.recommended_specialization && (
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                  <h4 className="mb-2 font-semibold text-brand-700">Recommended Specialization</h4>
                  <Badge tone="brand">
                    {detailedEncounter.recommended_specialization.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              )}
            </div>

            {/* Doctor's Note Section */}
            <div className="border-t border-brand-200 pt-6">
              <h4 className="mb-3 flex items-center gap-2 font-display text-xl font-bold text-slate-900">
                <PencilSquareIcon className="h-6 w-6 text-brand-700" /> Doctor's Note
              </h4>

              {/* Show existing diagnosis and treatment plan if available */}
              {(detailedEncounter.diagnosis || detailedEncounter.treatment_plan || detailedEncounter.doctor_notes) && (
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h5 className="mb-2 font-semibold text-slate-600">Previous Documentation:</h5>
                  {detailedEncounter.diagnosis && (
                    <div className="mb-2">
                      <span className="font-semibold text-slate-700">Diagnosis:</span>
                      <p className="mt-1 text-slate-600">{detailedEncounter.diagnosis}</p>
                    </div>
                  )}
                  {detailedEncounter.treatment_plan && (
                    <div className="mb-2">
                      <span className="font-semibold text-slate-700">Treatment Plan:</span>
                      <p className="mt-1 text-slate-600">{detailedEncounter.treatment_plan}</p>
                    </div>
                  )}
                  {detailedEncounter.doctor_notes && (
                    <div className="mb-2">
                      <span className="font-semibold text-slate-700">Doctor's Notes:</span>
                      <p className="mt-1 text-slate-600">{detailedEncounter.doctor_notes}</p>
                    </div>
                  )}
                </div>
              )}

              <Field label="Add/Update Doctor's Note:">
                <Textarea
                  rows={6}
                  value={encounterNote}
                  onChange={(e) => setEncounterNote(e.target.value)}
                  placeholder="Add your clinical observations, diagnosis, treatment plan, and recommendations here..."
                />
              </Field>
              <div className="mt-4 flex gap-3">
                <Button
                  variant="primary"
                  fullWidth
                  loading={savingNote}
                  disabled={savingNote}
                  leftIcon={savingNote ? undefined : <CheckIcon className="h-4 w-4" />}
                  onClick={saveEncounterNote}
                >
                  {savingNote ? 'Saving...' : 'Save Doctor Note'}
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setDetailedEncounter(null);
                    setPatientInfo(null);
                    setPatientEhr(null);
                    setEncounterNote('');
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </AppLayout>
  );
};

export default DoctorDashboard;
