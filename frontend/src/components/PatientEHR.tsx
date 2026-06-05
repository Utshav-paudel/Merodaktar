import React, { useState, useEffect } from 'react';
import {
  HeartIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  PlusIcon,
  UserIcon,
  SparklesIcon,
  CpuChipIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import {
  Button,
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

interface PatientEHRProps {
  token: string;
  user: any;
  onLogout: () => void;
}

type TabKey = 'overview' | 'vitals' | 'medications' | 'allergies' | 'history' | 'encounters';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'vitals', label: 'Vital Signs' },
  { key: 'medications', label: 'Medications' },
  { key: 'allergies', label: 'Allergies' },
  { key: 'history', label: 'Medical History' },
  { key: 'encounters', label: 'Encounter Reports' },
];

const PatientEHR: React.FC<PatientEHRProps> = ({ token, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'medications' | 'allergies' | 'history' | 'encounters'>('overview');
  const [ehrData, setEhrData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [vitalsTrend, setVitalsTrend] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [formData, setFormData] = useState<any>({});
  const [encounters, setEncounters] = useState<any[]>([]);

  useEffect(() => {
    fetchEHRData();
  }, []);

  const fetchEHRData = async () => {
    try {
      // Fetch complete EHR
      const ehrRes = await fetch('http://localhost:8000/api/v1/ehr/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (ehrRes.ok) {
        const data = await ehrRes.json();
        setEhrData(data);

        // Compute summary from EHR data
        const summaryData = {
          active_medications_count: data.medications?.length || 0,
          allergies_count: data.allergies?.length || 0,
          chronic_conditions_count: data.chronic_conditions?.length || 0,
          latest_vitals: data.vital_signs?.[data.vital_signs.length - 1] || null
        };
        setSummary(summaryData);

        // Compute vitals trend from vital signs
        if (data.vital_signs && data.vital_signs.length > 0) {
          const recentVitals = data.vital_signs.slice(-30); // Last 30 records
          setVitalsTrend({
            dates: recentVitals.map((v: any) => v.recorded_at),
            values: recentVitals
          });
        } else {
          setVitalsTrend({ dates: [], values: [] });
        }
      }

      // Fetch encounters
      const encountersRes = await fetch('http://localhost:8000/api/v1/ehr/me/encounters', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (encountersRes.ok) {
        const encountersData = await encountersRes.json();
        setEncounters(encountersData || []);
      }
    } catch (error) {
      console.error('Error fetching EHR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = (type: string) => {
    setModalType(type);
    setFormData({});
    setShowAddModal(true);
  };

  const handleAddRecord = async () => {
    try {
      let endpoint = '';
      let body = formData;

      switch (modalType) {
        case 'vitals':
          endpoint = 'http://localhost:8000/api/v1/ehr/me/vital-signs';
          break;
        case 'medication':
          endpoint = 'http://localhost:8000/api/v1/ehr/me/medication';
          break;
        case 'allergy':
          endpoint = 'http://localhost:8000/api/v1/ehr/me/allergy';
          break;
        case 'history':
          endpoint = 'http://localhost:8000/api/v1/ehr/me';
          // Format history data as chronic_conditions array
          body = {
            chronic_conditions: [
              {
                condition: formData.condition,
                diagnosed_date: formData.diagnosed_date,
                status: formData.status || 'active',
                notes: formData.notes || ''
              }
            ]
          };
          break;
        default:
          return;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowAddModal(false);
        fetchEHRData();
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        alert(`Failed to add record: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding record:', error);
      alert('Failed to add record. Please try again.');
    }
  };

  const allergyTone = (severity?: string) =>
    severity === 'severe' ? 'rose' : severity === 'moderate' ? 'amber' : 'emerald';

  const medicationTone = (status?: string) =>
    status === 'active' ? 'emerald' : status === 'completed' ? 'slate' : 'rose';

  const historyTone = (status?: string) =>
    status === 'chronic' ? 'brand' : status === 'active' ? 'blue' : 'slate';

  const encounterTone = (type?: string) =>
    type === 'ai_consultation' ? 'blue' :
    type === 'ai_symptom_assessment' ? 'brand' :
    type === 'in_person' ? 'emerald' : 'slate';

  if (loading) {
    return (
      <AppLayout role="patient" user={user} onLogout={onLogout} title="Health Records">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <Spinner className="h-10 w-10 text-brand-400" />
          <p className="text-sm text-slate-400">Loading your health records…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="patient" user={user} onLogout={onLogout} title="Health Records">
      <div className="animate-fade-in-up space-y-8">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-500/15 via-ink-900/40 to-accent-500/10 p-6 sm:p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-accent-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-glow-sm">
                <ClipboardDocumentListIcon className="h-7 w-7" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                  Electronic Health Record
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  {user?.full_name || user?.email || 'Your complete medical profile'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur-xl">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition',
                activeTab === tab.key
                  ? 'bg-gradient-brand text-white shadow-glow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="Active Medications"
                value={summary?.active_medications_count || 0}
                tone="cyan"
                icon={<BeakerIcon className="h-6 w-6" />}
              />
              <StatCard
                label="Known Allergies"
                value={summary?.allergies_count || 0}
                tone="rose"
                icon={<ExclamationTriangleIcon className="h-6 w-6" />}
              />
              <StatCard
                label="Chronic Conditions"
                value={summary?.chronic_conditions_count || 0}
                tone="brand"
                icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
              />
            </div>

            {/* Latest Vitals */}
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
                <HeartIcon className="h-5 w-5 text-rose-300" />
                Latest Vital Signs
              </h3>
              {summary?.latest_vitals ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {summary.latest_vitals.blood_pressure_systolic && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs font-medium text-slate-400">Blood Pressure</p>
                      <p className="mt-1 text-xl font-bold text-white">
                        {summary.latest_vitals.blood_pressure_systolic}/{summary.latest_vitals.blood_pressure_diastolic}
                      </p>
                    </div>
                  )}
                  {summary.latest_vitals.heart_rate && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs font-medium text-slate-400">Heart Rate</p>
                      <p className="mt-1 text-xl font-bold text-white">{summary.latest_vitals.heart_rate} bpm</p>
                    </div>
                  )}
                  {summary.latest_vitals.weight && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs font-medium text-slate-400">Weight</p>
                      <p className="mt-1 text-xl font-bold text-white">{summary.latest_vitals.weight} kg</p>
                    </div>
                  )}
                  {summary.latest_vitals.bmi && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs font-medium text-slate-400">BMI</p>
                      <p className="mt-1 text-xl font-bold text-white">{summary.latest_vitals.bmi}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-slate-500">No vital signs recorded yet</p>
              )}
            </Card>

            {/* Vitals Trend */}
            {vitalsTrend && vitalsTrend.dates && vitalsTrend.dates.length > 0 && (
              <Card className="p-6">
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
                  <SparklesIcon className="h-5 w-5 text-accent-300" />
                  Vital Signs Trend (Last 30 Days)
                </h3>
                <p className="text-sm text-slate-400">
                  {vitalsTrend.dates.length} records found
                </p>
              </Card>
            )}

            {/* Welcome / empty state */}
            {(!summary || (summary.active_medications_count === 0 && summary.allergies_count === 0 && summary.chronic_conditions_count === 0)) && (
              <Card className="border-brand-400/20 bg-brand-500/[0.06] p-6 text-center">
                <p className="font-display text-base font-semibold text-white">
                  Welcome to Your Electronic Health Record
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Start by adding your vital signs, medications, allergies, or medical history using the tabs above.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Vitals */}
        {activeTab === 'vitals' && ehrData && (
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
                <HeartIcon className="h-5 w-5 text-rose-300" />
                Vital Signs History
              </h3>
              <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => openAddModal('vitals')}>
                Add Vitals
              </Button>
            </div>
            <div className="space-y-3">
              {ehrData.vital_signs && ehrData.vital_signs.length > 0 ? (
                ehrData.vital_signs.map((vital: any, index: number) => (
                  <div key={index} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]">
                    <p className="mb-2 text-xs text-slate-500">
                      {new Date(vital.recorded_at || Date.now()).toLocaleString()}
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-sm text-slate-300 md:grid-cols-4">
                      {vital.blood_pressure_systolic && (
                        <div>BP: <span className="font-semibold text-white">{vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic}</span> mmHg</div>
                      )}
                      {vital.heart_rate && <div>HR: <span className="font-semibold text-white">{vital.heart_rate}</span> bpm</div>}
                      {vital.temperature && <div>Temp: <span className="font-semibold text-white">{vital.temperature}°C</span></div>}
                      {vital.weight && <div>Weight: <span className="font-semibold text-white">{vital.weight}</span> kg</div>}
                      {vital.bmi && <div>BMI: <span className="font-semibold text-white">{vital.bmi}</span></div>}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<HeartIcon className="h-7 w-7" />}
                  title="No vital signs recorded"
                  description="Track your blood pressure, heart rate, weight and more over time."
                  action={
                    <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => openAddModal('vitals')}>
                      Add Vitals
                    </Button>
                  }
                />
              )}
            </div>
          </Card>
        )}

        {/* Medications */}
        {activeTab === 'medications' && ehrData && (
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
                <BeakerIcon className="h-5 w-5 text-accent-300" />
                Current Medications
              </h3>
              <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => openAddModal('medication')}>
                Add Medication
              </Button>
            </div>
            <div className="space-y-3">
              {ehrData.medications && ehrData.medications.length > 0 ? (
                ehrData.medications.map((med: any, index: number) => (
                  <div key={med.id || index} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-white">{med.name || 'Medication'}</h4>
                        <p className="text-sm text-slate-400">{med.dosage} {med.frequency && `- ${med.frequency}`}</p>
                        {med.start_date && (
                          <p className="mt-1 text-xs text-slate-500">
                            Started: {new Date(med.start_date).toLocaleDateString()}
                          </p>
                        )}
                        {med.prescribed_by && (
                          <p className="text-xs text-slate-500">Prescribed by: {med.prescribed_by}</p>
                        )}
                      </div>
                      <Badge tone={medicationTone(med.status)}>{med.status || 'active'}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<BeakerIcon className="h-7 w-7" />}
                  title="No medications recorded"
                  description="Keep a list of your current medications and dosages."
                  action={
                    <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => openAddModal('medication')}>
                      Add Medication
                    </Button>
                  }
                />
              )}
            </div>
          </Card>
        )}

        {/* Allergies */}
        {activeTab === 'allergies' && ehrData && (
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
                <ExclamationTriangleIcon className="h-5 w-5 text-rose-300" />
                Known Allergies
              </h3>
              <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => openAddModal('allergy')}>
                Add Allergy
              </Button>
            </div>
            <div className="space-y-3">
              {ehrData.allergies && ehrData.allergies.length > 0 ? (
                ehrData.allergies.map((allergy: any, index: number) => (
                  <div key={allergy.id || index} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-white">{allergy.allergen || allergy.name || 'Allergen'}</h4>
                        <p className="text-sm text-slate-400">Reaction: {allergy.reaction || 'Not specified'}</p>
                        {allergy.date_identified && (
                          <p className="mt-1 text-xs text-slate-500">
                            Identified: {new Date(allergy.date_identified).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge tone={allergyTone(allergy.severity)}>{allergy.severity || 'mild'}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<ExclamationTriangleIcon className="h-7 w-7" />}
                  title="No allergies recorded"
                  description="Record allergens and reactions to keep your care team informed."
                  action={
                    <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => openAddModal('allergy')}>
                      Add Allergy
                    </Button>
                  }
                />
              )}
            </div>
          </Card>
        )}

        {/* Medical History */}
        {activeTab === 'history' && ehrData && (
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
                <ClipboardDocumentListIcon className="h-5 w-5 text-brand-300" />
                Medical History &amp; Chronic Conditions
              </h3>
              <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => openAddModal('history')}>
                Add Condition
              </Button>
            </div>
            <div className="space-y-3">
              {ehrData.chronic_conditions && ehrData.chronic_conditions.map((history: any, index: number) => (
                <div key={index} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-white">{history.condition || history.name || 'Condition'}</h4>
                      <p className="text-sm text-slate-400">
                        {history.diagnosed_date ? `Diagnosed: ${new Date(history.diagnosed_date).toLocaleDateString()}` :
                         history.date ? `Date: ${new Date(history.date).toLocaleDateString()}` : ''}
                      </p>
                      {history.notes && (
                        <p className="mt-1 text-sm text-slate-500">{history.notes}</p>
                      )}
                    </div>
                    <Badge tone={historyTone(history.status)}>{history.status || 'active'}</Badge>
                  </div>
                </div>
              ))}
              {(!ehrData.chronic_conditions || ehrData.chronic_conditions.length === 0) && (
                <EmptyState
                  icon={<ClipboardDocumentListIcon className="h-7 w-7" />}
                  title="No medical history recorded"
                  description="Add chronic conditions and past diagnoses to build your history."
                  action={
                    <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => openAddModal('history')}>
                      Add Condition
                    </Button>
                  }
                />
              )}
            </div>
          </Card>
        )}

        {/* Encounters timeline */}
        {activeTab === 'encounters' && (
          <Card className="p-6">
            <h3 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold text-white">
              <ClockIcon className="h-5 w-5 text-accent-300" />
              Encounter Timeline
            </h3>
            {encounters.length === 0 ? (
              <EmptyState
                icon={<ClockIcon className="h-7 w-7" />}
                title="No encounters recorded"
                description="Your consultations and visits will appear here as a timeline."
              />
            ) : (
              <div className="relative space-y-6 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-white/10">
                {encounters.map((encounter: any) => (
                  <div key={encounter.id} className="relative">
                    <span className="absolute -left-[1.45rem] top-1.5 h-3 w-3 rounded-full bg-gradient-brand ring-4 ring-ink-900" />
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {/* Encounter Date as Header */}
                          <div className="mb-2 flex flex-wrap items-center gap-3">
                            <h4 className="flex items-center gap-2 font-display text-lg font-bold text-white">
                              <CalendarDaysIcon className="h-5 w-5 text-brand-300" />
                              {new Date(encounter.encounter_date || encounter.created_at).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'long', day: 'numeric'
                              })}
                            </h4>
                            <Badge tone={encounterTone(encounter.encounter_type)}>
                              {encounter.encounter_type?.replace(/_/g, ' ').toUpperCase() || 'GENERAL'}
                            </Badge>
                          </div>
                          <p className="text-lg font-semibold text-slate-100">{encounter.chief_complaint}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                            <ClockIcon className="h-4 w-4" />
                            {new Date(encounter.encounter_date || encounter.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Patient Summary */}
                      {encounter.patient_summary && (
                        <div className="mt-4 rounded-xl border border-sky-400/20 bg-sky-500/[0.07] p-4">
                          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-sky-200">
                            <UserIcon className="h-4 w-4" /> Patient Summary
                          </p>
                          <div className="space-y-2 text-sm text-slate-300">
                            {typeof encounter.patient_summary === 'object' ? (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <p><strong className="text-slate-200">Name:</strong> {encounter.patient_summary.patient_name}</p>
                                  <p><strong className="text-slate-200">Age:</strong> {encounter.patient_summary.age}</p>
                                  <p><strong className="text-slate-200">Gender:</strong> {encounter.patient_summary.gender}</p>
                                  <p><strong className="text-slate-200">Blood Type:</strong> {encounter.patient_summary.blood_type || 'Unknown'}</p>
                                  <p><strong className="text-slate-200">Phone:</strong> {encounter.patient_summary.phone}</p>
                                  <p><strong className="text-slate-200">Address:</strong> {encounter.patient_summary.address}</p>
                                </div>

                                {/* Vital Signs */}
                                {encounter.patient_summary.vital_signs && Object.keys(encounter.patient_summary.vital_signs).length > 0 && (
                                  <div className="mt-3 border-t border-white/10 pt-3">
                                    <p className="mb-2 flex items-center gap-1.5 font-semibold text-slate-200">
                                      <HeartIcon className="h-4 w-4 text-rose-300" /> Latest Vital Signs
                                    </p>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                      {encounter.patient_summary.vital_signs.blood_pressure && encounter.patient_summary.vital_signs.blood_pressure !== 'Not recorded' && (
                                        <p><strong className="text-slate-200">BP:</strong> {encounter.patient_summary.vital_signs.blood_pressure}</p>
                                      )}
                                      {encounter.patient_summary.vital_signs.heart_rate && encounter.patient_summary.vital_signs.heart_rate !== 'Not recorded' && (
                                        <p><strong className="text-slate-200">HR:</strong> {encounter.patient_summary.vital_signs.heart_rate}</p>
                                      )}
                                      {encounter.patient_summary.vital_signs.temperature && encounter.patient_summary.vital_signs.temperature !== 'Not recorded' && (
                                        <p><strong className="text-slate-200">Temp:</strong> {encounter.patient_summary.vital_signs.temperature}</p>
                                      )}
                                      {encounter.patient_summary.vital_signs.weight && encounter.patient_summary.vital_signs.weight !== 'Not recorded' && (
                                        <p><strong className="text-slate-200">Weight:</strong> {encounter.patient_summary.vital_signs.weight}</p>
                                      )}
                                      {encounter.patient_summary.vital_signs.height && encounter.patient_summary.vital_signs.height !== 'Not recorded' && (
                                        <p><strong className="text-slate-200">Height:</strong> {encounter.patient_summary.vital_signs.height}</p>
                                      )}
                                      {encounter.patient_summary.vital_signs.bmi && encounter.patient_summary.vital_signs.bmi !== 'Not calculated' && (
                                        <p><strong className="text-slate-200">BMI:</strong> {encounter.patient_summary.vital_signs.bmi}</p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Current Medications */}
                                {encounter.patient_summary.current_medications && encounter.patient_summary.current_medications.length > 0 && (
                                  <div className="mt-3 border-t border-white/10 pt-3">
                                    <p className="mb-2 flex items-center gap-1.5 font-semibold text-slate-200">
                                      <BeakerIcon className="h-4 w-4 text-accent-300" /> Current Medications
                                    </p>
                                    <ul className="list-inside list-disc space-y-1 text-xs">
                                      {encounter.patient_summary.current_medications.map((med: any, idx: number) => (
                                        <li key={idx}>
                                          <strong className="text-slate-200">{med.name}</strong> - {med.dosage} ({med.frequency})
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Allergies */}
                                {encounter.patient_summary.allergies && encounter.patient_summary.allergies.length > 0 && (
                                  <div className="mt-3 border-t border-white/10 pt-3">
                                    <p className="mb-2 flex items-center gap-1.5 font-semibold text-slate-200">
                                      <ExclamationTriangleIcon className="h-4 w-4 text-rose-300" /> Allergies
                                    </p>
                                    <ul className="list-inside list-disc space-y-1 text-xs">
                                      {encounter.patient_summary.allergies.map((allergy: any, idx: number) => (
                                        <li key={idx} className="text-rose-300">
                                          <strong>{allergy.allergen}</strong> - {allergy.reaction} ({allergy.severity})
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Medical History */}
                                {encounter.patient_summary.medical_history && encounter.patient_summary.medical_history.length > 0 && (
                                  <div className="mt-3 border-t border-white/10 pt-3">
                                    <p className="mb-2 flex items-center gap-1.5 font-semibold text-slate-200">
                                      <ClipboardDocumentListIcon className="h-4 w-4 text-brand-300" /> Medical History
                                    </p>
                                    <ul className="list-inside list-disc space-y-1 text-xs">
                                      {encounter.patient_summary.medical_history.map((condition: any, idx: number) => (
                                        <li key={idx}>
                                          <strong className="text-slate-200">{condition.condition}</strong> - Diagnosed: {condition.diagnosed_date} ({condition.status})
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="whitespace-pre-line">{encounter.patient_summary}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* AI Preliminary Report */}
                      {encounter.ai_preliminary_report && (
                        <div className="mt-3 rounded-xl border border-brand-400/20 bg-brand-500/[0.07] p-4">
                          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-200">
                            <CpuChipIcon className="h-4 w-4" /> AI Preliminary Report
                          </p>
                          <p className="whitespace-pre-line text-sm text-slate-300">{encounter.ai_preliminary_report}</p>
                        </div>
                      )}

                      {encounter.symptoms && encounter.symptoms.length > 0 && (
                        <div className="mt-3">
                          <p className="mb-2 text-sm font-semibold text-slate-300">Symptoms</p>
                          <div className="flex flex-wrap gap-2">
                            {encounter.symptoms.map((symptom: any, idx: number) => (
                              <Badge key={idx} tone="rose">
                                {typeof symptom === 'object' ? (symptom.symptom || symptom.name || JSON.stringify(symptom)) : symptom}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {encounter.assessment && (
                        <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.07] p-4">
                          <p className="mb-2 text-sm font-semibold text-amber-200">Assessment</p>
                          <p className="text-sm text-slate-300">{encounter.assessment}</p>
                        </div>
                      )}

                      {/* Doctor Notes - Always show with placeholder if empty */}
                      <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] p-4">
                        <p className="mb-2 text-sm font-semibold text-emerald-200">Doctor Notes</p>
                        {encounter.doctor_notes && encounter.doctor_notes.trim() !== '' ? (
                          <p className="whitespace-pre-line text-sm text-slate-300">{encounter.doctor_notes}</p>
                        ) : encounter.appointment_id ? (
                          <p className="text-sm italic text-slate-500">Doctor notes will be added after your appointment.</p>
                        ) : (
                          <p className="text-sm italic text-slate-500">No appointment booked yet. Book an appointment to consult with a doctor.</p>
                        )}
                      </div>

                      {encounter.vital_signs && (
                        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
                            <HeartIcon className="h-4 w-4 text-rose-300" /> Vital Signs
                          </p>
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {encounter.vital_signs.blood_pressure_systolic && (
                              <div className="text-sm">
                                <span className="font-medium text-slate-400">BP:</span>
                                <span className="ml-1 font-semibold text-white">{encounter.vital_signs.blood_pressure_systolic}/{encounter.vital_signs.blood_pressure_diastolic}</span>
                              </div>
                            )}
                            {encounter.vital_signs.heart_rate && (
                              <div className="text-sm">
                                <span className="font-medium text-slate-400">HR:</span>
                                <span className="ml-1 font-semibold text-white">{encounter.vital_signs.heart_rate} bpm</span>
                              </div>
                            )}
                            {encounter.vital_signs.temperature && (
                              <div className="text-sm">
                                <span className="font-medium text-slate-400">Temp:</span>
                                <span className="ml-1 font-semibold text-white">{encounter.vital_signs.temperature}°C</span>
                              </div>
                            )}
                            {encounter.vital_signs.respiratory_rate && (
                              <div className="text-sm">
                                <span className="font-medium text-slate-400">RR:</span>
                                <span className="ml-1 font-semibold text-white">{encounter.vital_signs.respiratory_rate}/min</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="mb-5 font-display text-xl font-semibold text-white">
              Add {modalType === 'vitals' ? 'Vital Signs' : modalType === 'medication' ? 'Medication' : modalType === 'allergy' ? 'Allergy' : 'Medical History'}
            </h3>

            <div className="space-y-4">
              {modalType === 'vitals' && (
                <>
                  <Field label="Systolic BP">
                    <Input
                      type="number"
                      placeholder="Systolic BP"
                      onChange={(e) => setFormData({ ...formData, blood_pressure_systolic: parseInt(e.target.value) })}
                    />
                  </Field>
                  <Field label="Diastolic BP">
                    <Input
                      type="number"
                      placeholder="Diastolic BP"
                      onChange={(e) => setFormData({ ...formData, blood_pressure_diastolic: parseInt(e.target.value) })}
                    />
                  </Field>
                  <Field label="Heart Rate (bpm)">
                    <Input
                      type="number"
                      placeholder="Heart Rate (bpm)"
                      onChange={(e) => setFormData({ ...formData, heart_rate: parseInt(e.target.value) })}
                    />
                  </Field>
                  <Field label="Temperature (°C)">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Temperature (°C)"
                      onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                    />
                  </Field>
                  <Field label="Weight (kg)">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Weight (kg)"
                      onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                    />
                  </Field>
                  <Field label="Height (cm)">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Height (cm)"
                      onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) })}
                    />
                  </Field>
                </>
              )}

              {modalType === 'medication' && (
                <>
                  <Field label="Medication Name">
                    <Input
                      type="text"
                      placeholder="Medication Name"
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </Field>
                  <Field label="Dosage">
                    <Input
                      type="text"
                      placeholder="Dosage (e.g., 500mg)"
                      onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    />
                  </Field>
                  <Field label="Frequency">
                    <Input
                      type="text"
                      placeholder="Frequency (e.g., Twice daily)"
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    />
                  </Field>
                  <Field label="Start Date">
                    <Input
                      type="date"
                      placeholder="Start Date"
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </Field>
                  <Field label="Prescribed By">
                    <Input
                      type="text"
                      placeholder="Prescribed By"
                      onChange={(e) => setFormData({ ...formData, prescribed_by: e.target.value })}
                    />
                  </Field>
                </>
              )}

              {modalType === 'allergy' && (
                <>
                  <Field label="Allergen">
                    <Input
                      type="text"
                      placeholder="Allergen"
                      onChange={(e) => setFormData({ ...formData, allergen: e.target.value })}
                    />
                  </Field>
                  <Field label="Reaction">
                    <Input
                      type="text"
                      placeholder="Reaction"
                      onChange={(e) => setFormData({ ...formData, reaction: e.target.value })}
                    />
                  </Field>
                  <Field label="Severity">
                    <Select onChange={(e) => setFormData({ ...formData, severity: e.target.value })}>
                      <option value="">Select Severity</option>
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </Select>
                  </Field>
                  <Field label="Date Identified">
                    <Input
                      type="date"
                      placeholder="Date Identified"
                      onChange={(e) => setFormData({ ...formData, date_identified: e.target.value })}
                    />
                  </Field>
                </>
              )}

              {modalType === 'history' && (
                <>
                  <Field label="Condition">
                    <Input
                      type="text"
                      placeholder="Condition"
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    />
                  </Field>
                  <Field label="Diagnosed Date">
                    <Input
                      type="date"
                      placeholder="Diagnosed Date"
                      onChange={(e) => setFormData({ ...formData, diagnosed_date: e.target.value })}
                    />
                  </Field>
                  <Field label="Status">
                    <Select onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                      <option value="">Select Status</option>
                      <option value="active">Active</option>
                      <option value="resolved">Resolved</option>
                      <option value="chronic">Chronic</option>
                    </Select>
                  </Field>
                  <Field label="Notes">
                    <Textarea
                      placeholder="Notes"
                      rows={3}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </Field>
                </>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <Button fullWidth onClick={handleAddRecord}>
                Add Record
              </Button>
              <Button variant="secondary" fullWidth onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AppLayout>
  );
};

export default PatientEHR;
