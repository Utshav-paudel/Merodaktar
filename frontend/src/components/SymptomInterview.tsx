import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, Textarea, Badge, Spinner, cn } from '../lib/ui';

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

  const progress = Math.min(Math.round((questionNumber / 15) * 100), 100);

  return (
    <div className="app-bg relative min-h-screen overflow-hidden bg-grid">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-accent-500/10 blur-3xl animate-float" />

      <div className="relative mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-16">
        <div className="animate-fade-in-up space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-glow-sm">
                <SparklesIcon className="h-6 w-6" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
                  Symptom <span className="gradient-text">Assessment</span>
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">AI-guided pre-visit interview</p>
              </div>
            </div>
            {isActive && (
              <Badge tone="cyan">
                <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
                Question {questionNumber}
              </Badge>
            )}
          </div>

          {/* Intro / start state */}
          {!isActive && !isComplete && (
            <Card className="overflow-hidden p-0">
              <div className="relative px-6 py-12 text-center sm:px-12 sm:py-16">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/40 to-transparent" />
                <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-brand text-white shadow-glow animate-pulse-glow">
                  <SparklesIcon className="h-12 w-12" />
                </div>
                <h2 className="font-display text-2xl font-semibold text-slate-900">
                  AI-Powered Symptom Assessment
                </h2>
                <p className="mx-auto mt-4 max-w-md text-balance text-sm leading-relaxed text-slate-600">
                  I'll ask you a series of questions about your symptoms to create a preliminary
                  medical report. This will help your doctor prepare for your appointment.
                </p>

                {error && (
                  <div className="mx-auto mt-6 flex max-w-md items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="mt-8 flex justify-center">
                  <Button
                    onClick={startInterview}
                    disabled={loading}
                    loading={loading}
                    size="lg"
                    rightIcon={!loading ? <ArrowRightIcon className="h-5 w-5" /> : undefined}
                  >
                    {loading ? 'Starting...' : 'Start Interview'}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Active interview state */}
          {isActive && (
            <div className="space-y-6">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-50 ring-1 ring-inset ring-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-brand transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Question card */}
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-base font-bold text-white shadow-glow-sm">
                    Q
                  </span>
                  <div className="flex-1 pt-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-700">
                      AI Assistant
                    </p>
                    <p className="mt-1 text-lg leading-relaxed text-slate-900">{currentQuestion}</p>
                  </div>
                </div>
              </Card>

              {/* Answer input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-600">Your Answer</label>
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your answer here..."
                  rows={4}
                  disabled={loading}
                />
                <p className="text-xs text-slate-400">
                  Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">Enter</kbd> to submit, or{' '}
                  <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">Shift+Enter</kbd> for a new line
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={submitAnswer}
                  disabled={loading || !answer.trim()}
                  loading={loading}
                  fullWidth
                  rightIcon={!loading ? <PaperAirplaneIcon className="h-4 w-4" /> : undefined}
                  className="sm:flex-1"
                >
                  {loading ? 'Submitting...' : 'Submit Answer'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={startNew}
                  disabled={loading}
                  className="sm:w-auto"
                >
                  Cancel
                </Button>
              </div>

              {/* Step dots */}
              <div className="flex justify-center pt-2">
                <div className="flex flex-wrap justify-center gap-2">
                  {[...Array(15)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-2 w-2 rounded-full transition-all duration-300',
                        i < questionNumber
                          ? 'bg-gradient-brand shadow-glow-sm'
                          : 'bg-slate-200'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Complete state */}
          {isComplete && finalReport && (
            <div className="space-y-6">
              <Card className="overflow-hidden p-0">
                <div className="relative px-6 py-10 text-center sm:px-10">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    <CheckCircleIcon className="h-9 w-9" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-slate-900">Interview Complete!</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Your preliminary report has been generated.
                  </p>
                </div>

                <div className="space-y-5 border-t border-slate-200 px-6 py-6 sm:px-10">
                  <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Chief Complaint
                    </h3>
                    <p className="mt-1.5 text-slate-700">{finalReport.chief_complaint}</p>
                  </div>

                  {finalReport.symptoms && finalReport.symptoms.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                        Symptoms
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {finalReport.symptoms.map((symptom: any, index: number) => (
                          <Badge key={index} tone="cyan">
                            {symptom.symptom}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {finalReport.severity && (
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                        Severity Level
                      </h3>
                      <div className="mt-2">
                        <Badge
                          tone={
                            finalReport.severity === 'severe'
                              ? 'rose'
                              : finalReport.severity === 'moderate'
                              ? 'amber'
                              : 'emerald'
                          }
                        >
                          {finalReport.severity.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {finalReport.assessment && (
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                        Assessment
                      </h3>
                      <p className="mt-1.5 whitespace-pre-line leading-relaxed text-slate-600">
                        {finalReport.assessment}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={viewReport}
                  fullWidth
                  leftIcon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                  className="sm:flex-1"
                >
                  View Full Report
                </Button>
                <Button
                  variant="secondary"
                  onClick={startNew}
                  leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                  className="sm:w-auto"
                >
                  Start New Interview
                </Button>
              </div>
            </div>
          )}

          {/* Subtle loading shimmer hint while a request is in flight on the active screen */}
          {loading && isActive && (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Spinner className="h-4 w-4" />
              Processing your response...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SymptomInterview;
