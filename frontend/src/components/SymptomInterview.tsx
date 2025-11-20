import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SymptomInterviewProps {
  onComplete?: (reportId: string) => void;
}

const SymptomInterview: React.FC<SymptomInterviewProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [reportId, setReportId] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [questionNumber, setQuestionNumber] = useState<number>(0);
  const [answer, setAnswer] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const token = localStorage.getItem('token');

  const startInterview = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/reports/symptom-interview/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }

      const data = await response.json();
      setReportId(data.report_id);
      setCurrentQuestion(data.question);
      setQuestionNumber(data.question_number);
      setIsActive(true);
    } catch (err: any) {
      setError(err.message || 'Failed to start interview');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) {
      setError('Please provide an answer');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/reports/symptom-interview/${reportId}/answer`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ answer })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      const data = await response.json();
      
      if (data.is_complete) {
        setIsComplete(true);
        setFinalReport(data.report);
        setIsActive(false);
        if (onComplete) {
          onComplete(reportId);
        }
      } else {
        setCurrentQuestion(data.question);
        setQuestionNumber(data.question_number);
        setAnswer('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  };

  const viewReport = () => {
    navigate(`/reports/${reportId}`);
  };

  const startNew = () => {
    setIsActive(false);
    setIsComplete(false);
    setReportId('');
    setCurrentQuestion('');
    setAnswer('');
    setQuestionNumber(0);
    setFinalReport(null);
    setError('');
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-teal-600">Symptom Interview</h2>
          {isActive && (
            <span className="text-sm text-gray-600">
              Question {questionNumber}
            </span>
          )}
        </div>

        {!isActive && !isComplete && (
          <div className="text-center py-12">
            <div className="mb-6">
              <svg className="w-24 h-24 mx-auto text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-4">AI-Powered Symptom Assessment</h3>
            <p className="text-gray-600 mb-8">
              I'll ask you a series of questions about your symptoms to create a preliminary medical report.
              This will help your doctor prepare for your appointment.
            </p>
            <button
              onClick={startInterview}
              disabled={loading}
              className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 transition-colors text-lg font-semibold"
            >
              {loading ? 'Starting...' : 'Start Interview'}
            </button>
          </div>
        )}

        {isActive && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                    Q
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-lg text-gray-800">{currentQuestion}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Answer
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer here..."
                className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                rows={4}
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-2">
                Press Enter to submit, or Shift+Enter for new line
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={submitAnswer}
                disabled={loading || !answer.trim()}
                className="flex-1 bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 transition-colors font-semibold"
              >
                {loading ? 'Submitting...' : 'Submit Answer'}
              </button>
              <button
                onClick={startNew}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>

            <div className="flex justify-center">
              <div className="flex space-x-2">
                {[...Array(15)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < questionNumber ? 'bg-teal-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {isComplete && finalReport && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Interview Complete!</h3>
              <p className="text-gray-600">Your preliminary report has been generated.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Chief Complaint</h4>
                <p className="text-gray-700">{finalReport.chief_complaint}</p>
              </div>

              {finalReport.symptoms && finalReport.symptoms.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Symptoms</h4>
                  <div className="flex flex-wrap gap-2">
                    {finalReport.symptoms.map((symptom: any, index: number) => (
                      <span
                        key={index}
                        className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm"
                      >
                        {symptom.symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {finalReport.severity && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Severity Level</h4>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    finalReport.severity === 'severe' ? 'bg-red-100 text-red-800' :
                    finalReport.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {finalReport.severity.toUpperCase()}
                  </span>
                </div>
              )}

              {finalReport.assessment && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Assessment</h4>
                  <p className="text-gray-700 whitespace-pre-line">{finalReport.assessment}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={viewReport}
                className="flex-1 bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition-colors font-semibold"
              >
                View Full Report
              </button>
              <button
                onClick={startNew}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Start New Interview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SymptomInterview;
