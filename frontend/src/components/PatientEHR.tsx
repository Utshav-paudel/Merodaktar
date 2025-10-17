import React, { useState, useEffect } from 'react';

interface PatientEHRProps {
  token: string;
  user: any;
  onLogout: () => void;
}

const PatientEHR: React.FC<PatientEHRProps> = ({ token, user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'medications' | 'allergies' | 'history'>('overview');
  const [ehrData, setEhrData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [vitalsTrend, setVitalsTrend] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchEHRData();
  }, []);

  const fetchEHRData = async () => {
    try {
      // Fetch complete EHR
      const ehrRes = await fetch('/api/patient/ehr/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (ehrRes.ok) {
        setEhrData(await ehrRes.json());
      }

      // Fetch summary
      const summaryRes = await fetch('/api/patient/ehr/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }

      // Fetch vitals trend
      const trendRes = await fetch('/api/patient/ehr/vitals-trend?days=30', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (trendRes.ok) {
        setVitalsTrend(await trendRes.json());
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
      switch (modalType) {
        case 'vitals':
          endpoint = '/api/patient/ehr/vital-signs';
          break;
        case 'medication':
          endpoint = '/api/patient/ehr/medications';
          break;
        case 'allergy':
          endpoint = '/api/patient/ehr/allergies';
          break;
        case 'history':
          endpoint = '/api/patient/ehr/medical-history';
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
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowAddModal(false);
        fetchEHRData();
      }
    } catch (error) {
      console.error('Error adding record:', error);
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
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'overview' && summary && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Active Medications</p>
                    <p className="text-3xl font-bold text-blue-600">{summary.active_medications_count}</p>
                  </div>
                  <div className="text-4xl">💊</div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Known Allergies</p>
                    <p className="text-3xl font-bold text-red-600">{summary.allergies_count}</p>
                  </div>
                  <div className="text-4xl">⚠️</div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Chronic Conditions</p>
                    <p className="text-3xl font-bold text-purple-600">{summary.chronic_conditions_count}</p>
                  </div>
                  <div className="text-4xl">📋</div>
                </div>
              </div>
            </div>

            {/* Latest Vitals */}
            {summary.latest_vitals && (
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
            )}

            {/* Vitals Trend */}
            {vitalsTrend && vitalsTrend.dates.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Vital Signs Trend (Last 30 Days)</h3>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    {vitalsTrend.dates.length} records found
                  </div>
                </div>
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
              {ehrData.vital_signs.map((vital: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">
                    {new Date(vital.recorded_at).toLocaleString()}
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
              ))}
              {ehrData.vital_signs.length === 0 && (
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
              {ehrData.medications.map((med: any) => (
                <div key={med.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{med.name}</h4>
                      <p className="text-sm text-gray-600">{med.dosage} - {med.frequency}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Started: {new Date(med.start_date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">Prescribed by: {med.prescribed_by}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      med.status === 'active' ? 'bg-green-100 text-green-800' :
                      med.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {med.status}
                    </span>
                  </div>
                </div>
              ))}
              {ehrData.medications.length === 0 && (
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
              {ehrData.allergies.map((allergy: any) => (
                <div key={allergy.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{allergy.allergen}</h4>
                      <p className="text-sm text-gray-600">Reaction: {allergy.reaction}</p>
                      <p className="text-sm text-gray-500">
                        Identified: {new Date(allergy.date_identified).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      allergy.severity === 'severe' ? 'bg-red-100 text-red-800' :
                      allergy.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {allergy.severity}
                    </span>
                  </div>
                </div>
              ))}
              {ehrData.allergies.length === 0 && (
                <p className="text-gray-500 text-center py-8">No allergies recorded</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && ehrData && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Medical History</h3>
              <button
                onClick={() => openAddModal('history')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Condition
              </button>
            </div>
            <div className="space-y-3">
              {ehrData.medical_history.map((history: any) => (
                <div key={history.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{history.condition}</h4>
                      <p className="text-sm text-gray-600">
                        Diagnosed: {new Date(history.diagnosed_date).toLocaleDateString()}
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
                      {history.status}
                    </span>
                  </div>
                </div>
              ))}
              {ehrData.medical_history.length === 0 && (
                <p className="text-gray-500 text-center py-8">No medical history recorded</p>
              )}
            </div>
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
