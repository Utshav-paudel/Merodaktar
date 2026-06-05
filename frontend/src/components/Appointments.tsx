import React, { useState, useEffect } from 'react';
import {
  CalendarDaysIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon,
  ClipboardDocumentListIcon,
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
  EmptyState,
  PageHeader,
  cn,
} from '../lib/ui';
import AppLayout from './layout/AppLayout';

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

type BadgeTone = 'brand' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'blue';

const statusTone = (status: string): BadgeTone => {
  if (status === 'scheduled' || status === 'pending') return 'blue';
  if (status === 'confirmed') return 'emerald';
  if (status === 'completed') return 'slate';
  if (status === 'cancelled') return 'rose';
  return 'amber';
};

const Appointments: React.FC<AppointmentsProps> = ({ token, user, onLogout }) => {
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
    <AppLayout
      role="patient"
      user={user}
      onLogout={onLogout}
      title="Appointments"
      actions={
        <Button
          size="sm"
          leftIcon={<PlusIcon className="h-4 w-4" />}
          onClick={() => setShowBooking(true)}
        >
          Book New
        </Button>
      }
    >
      <div className="animate-fade-in-up">
        <PageHeader
          icon={<CalendarDaysIcon className="h-6 w-6" />}
          title="Your Appointments"
          subtitle="Book and manage your visits with verified doctors."
          actions={
            <Button
              variant="primary"
              leftIcon={<PlusIcon className="h-4 w-4" />}
              onClick={() => setShowBooking(true)}
            >
              Book New Appointment
            </Button>
          }
        />

        {/* Appointments List */}
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/10 px-6 py-4">
            <ClipboardDocumentListIcon className="h-5 w-5 text-brand-300" />
            <h2 className="font-display text-lg font-semibold text-white">Upcoming &amp; Past Visits</h2>
            {appointments.length > 0 && (
              <Badge tone="brand" className="ml-1">{appointments.length}</Badge>
            )}
          </div>
          <div className="p-6">
            {appointments.length > 0 ? (
              <div className="grid gap-4">
                {appointments.map((apt, index) => (
                  <div
                    key={index}
                    className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-brand-400/40 hover:bg-white/[0.06]"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex flex-1 items-start gap-4">
                        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow-sm">
                          <CalendarDaysIcon className="h-6 w-6" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display text-base font-semibold text-white">
                            Dr. {apt.doctor_name}
                          </h3>
                          {apt.reason && (
                            <p className="mt-1 text-sm text-slate-300">{apt.reason}</p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDaysIcon className="h-4 w-4 text-accent-300" />
                              {new Date(apt.appointment_date).toLocaleDateString()}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <ClockIcon className="h-4 w-4 text-accent-300" />
                              {new Date(apt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {apt.symptoms && (
                            <p className="mt-2 text-xs text-slate-500">
                              <span className="font-medium text-slate-400">Symptoms:</span> {apt.symptoms}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
                        <Badge tone={statusTone(apt.status)} className="capitalize">
                          {apt.status}
                        </Badge>
                        {(apt.status === 'scheduled' || apt.status === 'pending') && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleCancelAppointment(apt.id, apt.status)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<CalendarDaysIcon className="h-7 w-7" />}
                title="No appointments scheduled"
                description='Click "Book New Appointment" to schedule a visit with one of our doctors.'
                action={
                  <Button
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                    onClick={() => setShowBooking(true)}
                  >
                    Book New Appointment
                  </Button>
                }
              />
            )}
          </div>
        </Card>
      </div>

      {/* Booking Form Modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/70 p-4 backdrop-blur-sm sm:items-center">
          <Card className="my-auto w-full max-w-lg animate-fade-in-up overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow-sm">
                  <CalendarDaysIcon className="h-5 w-5" />
                </span>
                <h2 className="font-display text-lg font-bold text-white">Book New Appointment</h2>
              </div>
              <IconButton label="Close" onClick={() => setShowBooking(false)}>
                <XMarkIcon className="h-5 w-5" />
              </IconButton>
            </div>

            <form onSubmit={handleBookAppointment} className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
              <Field
                label="Select Doctor"
                required
                hint={
                  doctors.length === 0
                    ? 'No doctors with active schedules available. Please check back later.'
                    : undefined
                }
              >
                <Select
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
                </Select>
              </Field>

              {formData.doctor_id && (
                <>
                  <Field label="Select Date" required>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setFormData({ ...formData, slot_id: '' });
                      }}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </Field>

                  {selectedDate && (
                    <Field label="Available Time Slots">
                      {loadingSlots ? (
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-6 text-sm text-slate-400">
                          <Spinner className="h-4 w-4" />
                          Loading available slots...
                        </div>
                      ) : availableSlots.length > 0 ? (
                        <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:grid-cols-4">
                          {availableSlots.map((slot) => {
                            const active = formData.slot_id === slot.id;
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, slot_id: slot.id })}
                                className={cn(
                                  'inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-sm font-medium transition',
                                  active
                                    ? 'border-brand-400/60 bg-gradient-brand text-white shadow-glow-sm'
                                    : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-brand-400/40 hover:bg-white/10'
                                )}
                              >
                                {active && <CheckIcon className="h-3.5 w-3.5" />}
                                {slot.time}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-6 text-center text-sm text-slate-400">
                          No available slots for this date. Try another date.
                        </div>
                      )}
                    </Field>
                  )}
                </>
              )}

              <Field label="Appointment Type">
                <Select
                  value={formData.appointment_type}
                  onChange={(e) => setFormData({ ...formData, appointment_type: e.target.value })}
                >
                  <option value="in-person">In-Person Visit</option>
                  <option value="video">Video Consultation</option>
                  <option value="phone">Phone Call</option>
                </Select>
              </Field>

              <Field label="Reason for Visit" required>
                <Textarea
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  placeholder="Describe your main concern..."
                />
              </Field>

              <Field label="Symptoms (Optional)">
                <Textarea
                  rows={2}
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                  placeholder="List any symptoms you're experiencing..."
                />
              </Field>

              <Field
                label="Previous Symptom Report (Optional)"
                hint={
                  encounters.length === 0
                    ? 'No previous reports. Complete a symptom interview in Chat to create one.'
                    : undefined
                }
              >
                <Select
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
                </Select>
              </Field>

              <div className="flex gap-3 pt-1">
                <Button type="submit" fullWidth leftIcon={<CheckIcon className="h-4 w-4" />}>
                  Book Appointment
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => setShowBooking(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </AppLayout>
  );
};

export default Appointments;
