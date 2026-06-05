import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  MicrophoneIcon,
  ArrowRightIcon,
  ClockIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, Badge, StatCard, EmptyState, cn } from '../lib/ui';
import AppLayout from './layout/AppLayout';

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
      const summaryResponse = await fetch('http://localhost:8000/api/v1/dashboard/patient/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (summaryResponse.ok) {
        await summaryResponse.json(); // Summary data loaded
      }

      // Fetch consultation history
      const recordsResponse = await fetch('http://localhost:8000/api/v1/chat/my-consultations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (recordsResponse.ok) {
        const data = await recordsResponse.json();
        setRecords(data || []);
      }

      // Fetch appointments
      const appointmentsResponse = await fetch('http://localhost:8000/api/v1/appointments/my-appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (appointmentsResponse.ok) {
        const data = await appointmentsResponse.json();
        setAppointments(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    const token = localStorage.getItem('token');
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/v1/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (response.ok) {
        fetchData(); // Refresh data
        alert('Appointment cancelled successfully!');
      } else {
        const error = await response.json();
        alert('Error cancelling appointment: ' + (error.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Error cancelling appointment. Please try again.');
    }
  };

  const deleteConsultation = async (consultationId: string) => {
    const token = localStorage.getItem('token');
    if (!confirm('Are you sure you want to delete this consultation? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/v1/chat/consultations/${consultationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchData(); // Refresh data
        alert('Consultation deleted successfully!');
      } else {
        const error = await response.json();
        alert('Error deleting consultation: ' + (error.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting consultation:', error);
      alert('Error deleting consultation. Please try again.');
    }
  };

  const urgencyTone = (level: string): 'rose' | 'amber' | 'emerald' => {
    if (level === 'emergency') return 'rose';
    if (level === 'moderate') return 'amber';
    return 'emerald';
  };

  const statusTone = (status: string): 'emerald' | 'amber' | 'rose' | 'blue' | 'slate' => {
    if (status === 'confirmed') return 'emerald';
    if (status === 'pending') return 'amber';
    if (status === 'cancelled') return 'rose';
    if (status === 'completed') return 'blue';
    return 'slate';
  };

  const quickActions = [
    {
      title: 'AI Medical Chat',
      description: 'Get instant health advice & symptom assessment.',
      icon: ChatBubbleLeftRightIcon,
      to: '/chat',
      accent: 'from-brand-500/30 to-brand-400/10 text-brand-200',
      glow: 'group-hover:shadow-glow-sm',
    },
    {
      title: 'Book Appointment',
      description: 'Schedule a consultation with a doctor.',
      icon: CalendarDaysIcon,
      to: '/appointments',
      accent: 'from-emerald-500/30 to-emerald-400/10 text-emerald-200',
      glow: '',
    },
    {
      title: 'Health Records (EHR)',
      description: 'View your complete medical history & vitals.',
      icon: ClipboardDocumentListIcon,
      to: '/ehr',
      accent: 'from-accent-500/30 to-accent-400/10 text-accent-200',
      glow: '',
    },
    {
      title: 'Voice AI Chat',
      description: 'AI consultation with hands-free voice support.',
      icon: MicrophoneIcon,
      to: '/chat',
      accent: 'from-amber-500/30 to-amber-400/10 text-amber-200',
      glow: '',
    },
  ];

  return (
    <AppLayout role="patient" user={user} onLogout={onLogout} title="Dashboard">
      <div className="animate-fade-in-up space-y-8">
        {/* Welcome hero banner */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-600/30 via-ink-850 to-accent-600/20 p-8 shadow-glass backdrop-blur-xl sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-500/30 blur-3xl animate-float-slow" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-accent-500/20 blur-3xl animate-float" />
          <div className="relative">
            <Badge tone="brand">
              <SparklesIcon className="h-3.5 w-3.5" />
              Your health hub
            </Badge>
            <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
              Welcome back,{' '}
              <span className="gradient-text">{user?.full_name || 'Patient'}</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300 sm:text-base">
              Your health journey starts here. How can we help you today?
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant="primary"
                leftIcon={<ChatBubbleLeftRightIcon className="h-4 w-4" />}
                onClick={() => navigate('/chat')}
              >
                Start AI Consultation
              </Button>
              <Button
                variant="secondary"
                leftIcon={<CalendarDaysIcon className="h-4 w-4" />}
                onClick={() => navigate('/appointments')}
              >
                Book Appointment
              </Button>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <StatCard
            label="Recent Consultations"
            value={records.length}
            tone="brand"
            icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
            sub="AI symptom assessments on record"
          />
          <StatCard
            label="Upcoming Appointments"
            value={appointments.length}
            tone="emerald"
            icon={<CalendarDaysIcon className="h-5 w-5" />}
            sub="Scheduled with your care team"
          />
        </div>

        {/* Quick actions */}
        <div>
          <h3 className="mb-4 font-display text-lg font-semibold text-white">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card
                  key={action.title}
                  hover
                  as="button"
                  onClick={() => navigate(action.to)}
                  className={cn('group p-6 text-left', action.glow)}
                >
                  <span
                    className={cn(
                      'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-inset ring-white/10 transition group-hover:scale-105',
                      action.accent
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <h4 className="mt-4 font-display text-base font-semibold text-white">
                    {action.title}
                  </h4>
                  <p className="mt-1 text-sm text-slate-400">{action.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-300 transition group-hover:gap-2">
                    Open
                    <ArrowRightIcon className="h-4 w-4" />
                  </span>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Consultations */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 className="font-display text-lg font-semibold text-white">Recent Consultations</h3>
              <Badge tone="brand">{records.length}</Badge>
            </div>
            <div className="p-6">
              {records.length > 0 ? (
                <div className="space-y-3">
                  {records.slice(0, 5).map((record, index) => (
                    <div
                      key={index}
                      className="group relative rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-100">{record.symptoms}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <ClockIcon className="h-3.5 w-3.5" />
                              {new Date(record.consultation_date).toLocaleDateString()}
                            </span>
                            <Badge tone={urgencyTone(record.urgency_level)}>
                              {record.urgency_level}
                            </Badge>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteConsultation(record.id)}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-300"
                          title="Delete Consultation"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<ChatBubbleLeftRightIcon className="h-7 w-7" />}
                  title="No consultations yet"
                  description="Start a chat to get instant health advice and symptom assessment."
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<ChatBubbleLeftRightIcon className="h-4 w-4" />}
                      onClick={() => navigate('/chat')}
                    >
                      Start a consultation
                    </Button>
                  }
                />
              )}
            </div>
          </Card>

          {/* Upcoming Appointments */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 className="font-display text-lg font-semibold text-white">Upcoming Appointments</h3>
              <Badge tone="emerald">{appointments.length}</Badge>
            </div>
            <div className="p-6">
              {appointments.length > 0 ? (
                <div className="space-y-3">
                  {appointments.map((apt, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-100">Dr. {apt.doctor_name}</p>
                          <p className="mt-0.5 truncate text-sm text-slate-400">{apt.reason}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-300">
                              <CalendarDaysIcon className="h-3.5 w-3.5" />
                              {apt.appointment_date} at {apt.appointment_time}
                            </span>
                            <Badge tone={statusTone(apt.status)}>
                              {apt.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => cancelAppointment(apt.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<CalendarDaysIcon className="h-7 w-7" />}
                  title="No upcoming appointments"
                  description="Book a consultation with a doctor to see it appear here."
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<CalendarDaysIcon className="h-4 w-4" />}
                      onClick={() => navigate('/appointments')}
                    >
                      Book appointment
                    </Button>
                  }
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
