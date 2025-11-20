import React, { useState, useEffect } from 'react';

interface PatientEHRProps {
  token: string;
  user: any;
  onLogout: () => void;
}

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b-4 border-purple-500">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img 
              src="/mero-daktar-logo.png" 
              alt="MeroDaktar Logo" 
              className="h-12 w-12"
            />
            <div>
              <h1 className="text-2xl font-bold text-purple-600">MeroDaktar EHR</h1>
              <p className="text-xs text-gray-500">Electronic Health Records</p>
              <p className="text-sm text-gray-600 font-medium">{user?.full_name || user?.email}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              ← Back
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex space-x-4 border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('vitals')}
            className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === 'vitals' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
          >
            Vital Signs
          </button>
          <button
            onClick={() => setActiveTab('medications')}
            className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === 'medications' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
          >
            Medications
          </button>
          <button
            onClick={() => setActiveTab('allergies')}
            className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === 'allergies' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
          >
            Allergies
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
          >
            Medical History
          </button>
          <button
            onClick={() => setActiveTab('encounters')}
            className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === 'encounters' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
          >
            Encounter Reports
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Active Medications</p>
                    <p className="text-3xl font-bold text-blue-600">{summary?.active_medications_count || 0}</p>
                  </div>
                  <div className="text-4xl">💊</div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Known Allergies</p>
                    <p className="text-3xl font-bold text-red-600">{summary?.allergies_count || 0}</p>
                  </div>
                  <div className="text-4xl">⚠️</div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Chronic Conditions</p>
                    <p className="text-3xl font-bold text-purple-600">{summary?.chronic_conditions_count || 0}</p>
                  </div>
                  <div className="text-4xl">📋</div>
                </div>
              </div>
            </div>

            {/* Latest Vitals */}
            {summary?.latest_vitals ? (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Latest Vital Signs</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {summary.latest_vitals.blood_pressure_systolic && (
                    <div className="border rounded p-3">
                      <p className="text-sm text-gray-600">Blood Pressure</p>
                      <p className="text-xl font-semibold">
                        {summary.latest_vitals.blood_pressure_systolic}/{summary.latest_vitals.blood_pressure_diastolic}
                      </p>
                    </div>
                  )}
                  {summary.latest_vitals.heart_rate && (
                    <div className="border rounded p-3">
                      <p className="text-sm text-gray-600">Heart Rate</p>
                      <p className="text-xl font-semibold">{summary.latest_vitals.heart_rate} bpm</p>
                    </div>
                  )}
                  {summary.latest_vitals.weight && (
                    <div className="border rounded p-3">
                      <p className="text-sm text-gray-600">Weight</p>
                      <p className="text-xl font-semibold">{summary.latest_vitals.weight} kg</p>
                    </div>
                  )}
                  {summary.latest_vitals.bmi && (
                    <div className="border rounded p-3">
                      <p className="text-sm text-gray-600">BMI</p>
                      <p className="text-xl font-semibold">{summary.latest_vitals.bmi}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Latest Vital Signs</h3>
                <p className="text-gray-500 text-center py-4">No vital signs recorded yet</p>
              </div>
            )}

            {/* Vitals Trend */}
            {vitalsTrend && vitalsTrend.dates && vitalsTrend.dates.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Vital Signs Trend (Last 30 Days)</h3>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    {vitalsTrend.dates.length} records found
                  </div>
                </div>
              </div>
            )}
            
            {/* Empty state message */}
            {(!summary || (summary.active_medications_count === 0 && summary.allergies_count === 0 && summary.chronic_conditions_count === 0)) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <p className="text-blue-800 font-medium mb-2">Welcome to Your Electronic Health Record</p>
                <p className="text-blue-600 text-sm">Start by adding your vital signs, medications, allergies, or medical history using the tabs above.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'vitals' && ehrData && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Vital Signs History</h3>
              <button
                onClick={() => openAddModal('vitals')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Vitals
              </button>
            </div>
            <div className="space-y-3">
              {ehrData.vital_signs && ehrData.vital_signs.length > 0 ? (
                ehrData.vital_signs.map((vital: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">
                      {new Date(vital.recorded_at || Date.now()).toLocaleString()}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {vital.blood_pressure_systolic && (
                        <div>BP: {vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic} mmHg</div>
                      )}
                      {vital.heart_rate && <div>HR: {vital.heart_rate} bpm</div>}
                      {vital.temperature && <div>Temp: {vital.temperature}°C</div>}
                      {vital.weight && <div>Weight: {vital.weight} kg</div>}
                      {vital.bmi && <div>BMI: {vital.bmi}</div>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No vital signs recorded</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'medications' && ehrData && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Current Medications</h3>
              <button
                onClick={() => openAddModal('medication')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Medication
              </button>
            </div>
            <div className="space-y-3">
              {ehrData.medications && ehrData.medications.length > 0 ? (
                ehrData.medications.map((med: any, index: number) => (
                  <div key={med.id || index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{med.name || 'Medication'}</h4>
                        <p className="text-sm text-gray-600">{med.dosage} {med.frequency && `- ${med.frequency}`}</p>
                        {med.start_date && (
                          <p className="text-sm text-gray-500 mt-1">
                            Started: {new Date(med.start_date).toLocaleDateString()}
                          </p>
                        )}
                        {med.prescribed_by && (
                          <p className="text-xs text-gray-500">Prescribed by: {med.prescribed_by}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        med.status === 'active' ? 'bg-green-100 text-green-800' :
                        med.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {med.status || 'active'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No medications recorded</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'allergies' && ehrData && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Known Allergies</h3>
              <button
                onClick={() => openAddModal('allergy')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Allergy
              </button>
            </div>
            <div className="space-y-3">
              {ehrData.allergies && ehrData.allergies.length > 0 ? (
                ehrData.allergies.map((allergy: any, index: number) => (
                  <div key={allergy.id || index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{allergy.allergen || allergy.name || 'Allergen'}</h4>
                        <p className="text-sm text-gray-600">Reaction: {allergy.reaction || 'Not specified'}</p>
                        {allergy.date_identified && (
                          <p className="text-sm text-gray-500">
                            Identified: {new Date(allergy.date_identified).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        allergy.severity === 'severe' ? 'bg-red-100 text-red-800' :
                        allergy.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {allergy.severity || 'mild'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No allergies recorded</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && ehrData && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Medical History & Chronic Conditions</h3>
              <button
                onClick={() => openAddModal('history')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Condition
              </button>
            </div>
            <div className="space-y-3">
              {ehrData.chronic_conditions && ehrData.chronic_conditions.map((history: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{history.condition || history.name || 'Condition'}</h4>
                      <p className="text-sm text-gray-600">
                        {history.diagnosed_date ? `Diagnosed: ${new Date(history.diagnosed_date).toLocaleDateString()}` : 
                         history.date ? `Date: ${new Date(history.date).toLocaleDateString()}` : ''}
                      </p>
                      {history.notes && (
                        <p className="text-sm text-gray-500 mt-1">{history.notes}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      history.status === 'chronic' ? 'bg-purple-100 text-purple-800' :
                      history.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {history.status || 'active'}
                    </span>
                  </div>
                </div>
              ))}
              {(!ehrData.chronic_conditions || ehrData.chronic_conditions.length === 0) && (
                <p className="text-gray-500 text-center py-8">No medical history recorded</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'encounters' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Encounter Timeline</h3>
            {encounters.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No encounters recorded</p>
            ) : (
              <div className="space-y-4">
                {encounters.map((encounter: any) => (
                  <div key={encounter.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        {/* Encounter Date as Header */}
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-bold text-gray-900">
                            📅 {new Date(encounter.encounter_date || encounter.created_at).toLocaleDateString('en-US', { 
                              year: 'numeric', month: 'long', day: 'numeric' 
                            })}
                          </h4>
                          <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                            encounter.encounter_type === 'ai_consultation' ? 'bg-blue-100 text-blue-800' :
                            encounter.encounter_type === 'ai_symptom_assessment' ? 'bg-purple-100 text-purple-800' :
                            encounter.encounter_type === 'in_person' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {encounter.encounter_type?.replace(/_/g, ' ').toUpperCase() || 'GENERAL'}
                          </span>
                        </div>
                        <p className="font-semibold text-xl text-gray-800">{encounter.chief_complaint}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          🕒 {new Date(encounter.encounter_date || encounter.created_at).toLocaleTimeString('en-US', { 
                            hour: '2-digit', minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                    
                    {/* Patient Summary */}
                    {encounter.patient_summary && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-semibold text-blue-900 mb-3">👤 Patient Summary:</p>
                        <div className="text-sm text-blue-800 space-y-2">
                          {typeof encounter.patient_summary === 'object' ? (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <p><strong>Name:</strong> {encounter.patient_summary.patient_name}</p>
                                <p><strong>Age:</strong> {encounter.patient_summary.age}</p>
                                <p><strong>Gender:</strong> {encounter.patient_summary.gender}</p>
                                <p><strong>Blood Type:</strong> {encounter.patient_summary.blood_type || 'Unknown'}</p>
                                <p><strong>Phone:</strong> {encounter.patient_summary.phone}</p>
                                <p><strong>Address:</strong> {encounter.patient_summary.address}</p>
                              </div>
                              
                              {/* Vital Signs */}
                              {encounter.patient_summary.vital_signs && Object.keys(encounter.patient_summary.vital_signs).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-blue-300">
                                  <p className="font-semibold mb-2">💓 Latest Vital Signs:</p>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    {encounter.patient_summary.vital_signs.blood_pressure && encounter.patient_summary.vital_signs.blood_pressure !== 'Not recorded' && (
                                      <p><strong>BP:</strong> {encounter.patient_summary.vital_signs.blood_pressure}</p>
                                    )}
                                    {encounter.patient_summary.vital_signs.heart_rate && encounter.patient_summary.vital_signs.heart_rate !== 'Not recorded' && (
                                      <p><strong>HR:</strong> {encounter.patient_summary.vital_signs.heart_rate}</p>
                                    )}
                                    {encounter.patient_summary.vital_signs.temperature && encounter.patient_summary.vital_signs.temperature !== 'Not recorded' && (
                                      <p><strong>Temp:</strong> {encounter.patient_summary.vital_signs.temperature}</p>
                                    )}
                                    {encounter.patient_summary.vital_signs.weight && encounter.patient_summary.vital_signs.weight !== 'Not recorded' && (
                                      <p><strong>Weight:</strong> {encounter.patient_summary.vital_signs.weight}</p>
                                    )}
                                    {encounter.patient_summary.vital_signs.height && encounter.patient_summary.vital_signs.height !== 'Not recorded' && (
                                      <p><strong>Height:</strong> {encounter.patient_summary.vital_signs.height}</p>
                                    )}
                                    {encounter.patient_summary.vital_signs.bmi && encounter.patient_summary.vital_signs.bmi !== 'Not calculated' && (
                                      <p><strong>BMI:</strong> {encounter.patient_summary.vital_signs.bmi}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Current Medications */}
                              {encounter.patient_summary.current_medications && encounter.patient_summary.current_medications.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-blue-300">
                                  <p className="font-semibold mb-2">💊 Current Medications:</p>
                                  <ul className="list-disc list-inside space-y-1 text-xs">
                                    {encounter.patient_summary.current_medications.map((med: any, idx: number) => (
                                      <li key={idx}>
                                        <strong>{med.name}</strong> - {med.dosage} ({med.frequency})
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Allergies */}
                              {encounter.patient_summary.allergies && encounter.patient_summary.allergies.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-blue-300">
                                  <p className="font-semibold mb-2">⚠️ Allergies:</p>
                                  <ul className="list-disc list-inside space-y-1 text-xs">
                                    {encounter.patient_summary.allergies.map((allergy: any, idx: number) => (
                                      <li key={idx} className="text-red-700">
                                        <strong>{allergy.allergen}</strong> - {allergy.reaction} ({allergy.severity})
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Medical History */}
                              {encounter.patient_summary.medical_history && encounter.patient_summary.medical_history.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-blue-300">
                                  <p className="font-semibold mb-2">📋 Medical History:</p>
                                  <ul className="list-disc list-inside space-y-1 text-xs">
                                    {encounter.patient_summary.medical_history.map((condition: any, idx: number) => (
                                      <li key={idx}>
                                        <strong>{condition.condition}</strong> - Diagnosed: {condition.diagnosed_date} ({condition.status})
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
                      <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm font-semibold text-purple-900 mb-2">🤖 AI Preliminary Report:</p>
                        <p className="text-sm text-purple-800 whitespace-pre-line">{encounter.ai_preliminary_report}</p>
                      </div>
                    )}
                    
                    {encounter.symptoms && encounter.symptoms.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2">🩺 Symptoms:</p>
                        <div className="flex flex-wrap gap-2">
                          {encounter.symptoms.map((symptom: any, idx: number) => (
                            <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              {typeof symptom === 'object' ? (symptom.symptom || symptom.name || JSON.stringify(symptom)) : symptom}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {encounter.assessment && (
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm font-semibold text-yellow-900 mb-2">📋 Assessment:</p>
                        <p className="text-sm text-yellow-800">{encounter.assessment}</p>
                      </div>
                    )}
                    
                    {/* Doctor Notes - Always show with placeholder if empty */}
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm font-semibold text-green-900 mb-2">👨‍⚕️ Doctor Notes:</p>
                      {encounter.doctor_notes && encounter.doctor_notes.trim() !== '' ? (
                        <p className="text-sm text-green-800 whitespace-pre-line">{encounter.doctor_notes}</p>
                      ) : encounter.appointment_id ? (
                        <p className="text-sm text-gray-500 italic">Doctor notes will be added after your appointment.</p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No appointment booked yet. Book an appointment to consult with a doctor.</p>
                      )}
                    </div>
                    
                    {encounter.vital_signs && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 mb-2">💓 Vital Signs:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {encounter.vital_signs.blood_pressure_systolic && (
                            <div className="text-sm">
                              <span className="text-gray-600 font-medium">BP:</span> 
                              <span className="ml-1 font-semibold">{encounter.vital_signs.blood_pressure_systolic}/{encounter.vital_signs.blood_pressure_diastolic}</span>
                            </div>
                          )}
                          {encounter.vital_signs.heart_rate && (
                            <div className="text-sm">
                              <span className="text-gray-600 font-medium">HR:</span> 
                              <span className="ml-1 font-semibold">{encounter.vital_signs.heart_rate} bpm</span>
                            </div>
                          )}
                          {encounter.vital_signs.temperature && (
                            <div className="text-sm">
                              <span className="text-gray-600 font-medium">Temp:</span> 
                              <span className="ml-1 font-semibold">{encounter.vital_signs.temperature}°C</span>
                            </div>
                          )}
                          {encounter.vital_signs.respiratory_rate && (
                            <div className="text-sm">
                              <span className="text-gray-600 font-medium">RR:</span> 
                              <span className="ml-1 font-semibold">{encounter.vital_signs.respiratory_rate}/min</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">
              Add {modalType === 'vitals' ? 'Vital Signs' : modalType === 'medication' ? 'Medication' : modalType === 'allergy' ? 'Allergy' : 'Medical History'}
            </h3>
            
            <div className="space-y-3">
              {modalType === 'vitals' && (
                <>
                  <input
                    type="number"
                    placeholder="Systolic BP"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, blood_pressure_systolic: parseInt(e.target.value)})}
                  />
                  <input
                    type="number"
                    placeholder="Diastolic BP"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, blood_pressure_diastolic: parseInt(e.target.value)})}
                  />
                  <input
                    type="number"
                    placeholder="Heart Rate (bpm)"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, heart_rate: parseInt(e.target.value)})}
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Temperature (°C)"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Weight (kg)"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value)})}
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Height (cm)"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, height: parseFloat(e.target.value)})}
                  />
                </>
              )}
              
              {modalType === 'medication' && (
                <>
                  <input
                    type="text"
                    placeholder="Medication Name"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Dosage (e.g., 500mg)"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Frequency (e.g., Twice daily)"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                  />
                  <input
                    type="date"
                    placeholder="Start Date"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Prescribed By"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, prescribed_by: e.target.value})}
                  />
                </>
              )}
              
              {modalType === 'allergy' && (
                <>
                  <input
                    type="text"
                    placeholder="Allergen"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, allergen: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Reaction"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, reaction: e.target.value})}
                  />
                  <select
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, severity: e.target.value})}
                  >
                    <option value="">Select Severity</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                  <input
                    type="date"
                    placeholder="Date Identified"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, date_identified: e.target.value})}
                  />
                </>
              )}
              
              {modalType === 'history' && (
                <>
                  <input
                    type="text"
                    placeholder="Condition"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, condition: e.target.value})}
                  />
                  <input
                    type="date"
                    placeholder="Diagnosed Date"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, diagnosed_date: e.target.value})}
                  />
                  <select
                    className="w-full p-2 border rounded"
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="">Select Status</option>
                    <option value="active">Active</option>
                    <option value="resolved">Resolved</option>
                    <option value="chronic">Chronic</option>
                  </select>
                  <textarea
                    placeholder="Notes"
                    className="w-full p-2 border rounded"
                    rows={3}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </>
              )}
            </div>
            
            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleAddRecord}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Add Record
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientEHR;
