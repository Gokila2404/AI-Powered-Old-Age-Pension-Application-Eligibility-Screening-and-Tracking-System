import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  FileText,
  User,
  Building,
  UploadCloud,
  FileCheck,
  ExternalLink,
  Send,
  HelpCircle
} from 'lucide-react';

import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';

export const AdminApplicationDetail = () => {
  const { id: routeAppId } = useParams();
  const navigate = useNavigate();
  const {
    applications,
    selectedAppIdForDetail,
    reviewApplication,
    fetchApplications,
    currentUser
  } = useApp();

  const targetId = routeAppId || selectedAppIdForDetail;
  const [app, setApp] = useState(() => {
    return applications.find(a => a.id === targetId) || (applications.length > 0 ? applications[0] : null);
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (targetId) {
      const found = applications.find(a => a.id === targetId);
      if (found) {
        setApp(found);
      } else {
        setLoading(true);
        api.get(`/admin/applications/${targetId}`)
          .then(res => setApp(res.data))
          .catch(err => console.error('Failed to load application:', err))
          .finally(() => setLoading(false));
      }
    } else if (applications.length > 0) {
      setApp(applications[0]);
    }
  }, [targetId, applications]);

  const [remarks, setRemarks] = useState('');
  const [sanctionOrderNo, setSanctionOrderNo] = useState(`SAN-TN-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [correctionField, setCorrectionField] = useState('Income Certificate requires clear Tahsildar seal');
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [verificationHistory, setVerificationHistory] = useState(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState('');
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [correctionValue, setCorrectionValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  const loadVerificationHistory = async () => {
    if (!targetId) return;
    setTraceLoading(true);
    setTraceError('');
    try {
      const response = await api.get(`/admin/applications/${encodeURIComponent(targetId)}/verification-history`);
      setVerificationHistory(response.data);
    } catch (error) {
      setTraceError(error.response?.data?.detail || 'Could not load persistent document verification history.');
    } finally {
      setTraceLoading(false);
    }
  };

  useEffect(() => { loadVerificationHistory(); }, [targetId]);

  const openOriginalDocument = async (documentId) => {
    try {
      const response = await api.get(`/documents/${encodeURIComponent(documentId)}/preview`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setTraceError(error.response?.data?.detail || 'Could not open the protected source document.');
    }
  };

  const submitCorrection = async (event) => {
    event.preventDefault();
    if (!correctionTarget || !correctionReason.trim()) return;
    try {
      await api.post(`/admin/applications/${encodeURIComponent(app.id)}/document-corrections`, {
        extractionId: correctionTarget.extractionId,
        fieldName: correctionTarget.field,
        correctedValue: correctionValue,
        reason: correctionReason.trim(),
      });
      setCorrectionTarget(null);
      setCorrectionValue('');
      setCorrectionReason('');
      await loadVerificationHistory();
    } catch (error) {
      setTraceError(error.response?.data?.detail || 'Could not record the correction.');
    }
  };

  const handleDecision = async (decisionStatus) => {
    if (!app) return;
    setIsUpdating(true);
    setFeedbackMsg(null);
    try {
      const actionMap = {
        'APPROVED': 'APPROVE',
        'ACTION REQUIRED': 'REQUEST_CORRECTION',
        'REJECTED': 'REJECT',
        'UNDER REVIEW': 'UNDER_REVIEW'
      };
      const action = actionMap[decisionStatus] || decisionStatus;
      const updated = await reviewApplication(
        app.id,
        action,
        remarks || `Administrative determination issued by ${currentUser?.fullName || 'Tahsildar'}`,
        decisionStatus === 'APPROVED' ? sanctionOrderNo : null,
        decisionStatus === 'ACTION REQUIRED' ? correctionField : null
      );
      setApp(updated);
      setFeedbackMsg(`Application ${app.id} successfully updated to: ${decisionStatus}`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const applicantFullName = app.personalInfo?.fullName || app.applicantName;
  const appDistrict = app.addressInfo?.district || app.district || 'District not provided';

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn pb-12 font-sans text-left">
      <AdminSidebar />

      <main className="flex-1 min-w-0 space-y-6">
        
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            to="/admin/applications"
            className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Review Queue</span>
          </Link>
          
          <div className="text-xs font-mono font-bold text-slate-500">
            Dossier File: <span className="text-blue-700 font-black">{app.id}</span>
          </div>
        </div>

        {feedbackMsg && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl font-bold text-xs shadow-md text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Top Summary Banner */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Administrative Audit Dossier
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">{app.id}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {applicantFullName}
            </h1>
            <p className="text-xs text-slate-600">
              Applying for: <strong>{app.schemeName}</strong> • {appDistrict}, Tamil Nadu
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-bold uppercase">AI Screener Score</div>
              <div className="text-2xl font-black text-blue-700 font-mono">
                {app.aiScore}/100
              </div>
            </div>

            <span className={`px-3 py-1.5 rounded-xl font-bold text-xs border ${
              app.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
              app.status === 'REJECTED' ? 'bg-red-50 text-red-800 border-red-300' :
              app.status === 'ACTION REQUIRED' ? 'bg-amber-50 text-amber-800 border-amber-300' :
              'bg-blue-50 text-blue-800 border-blue-300'
            }`}>
              {app.status}
            </span>
          </div>
        </div>

        {/* Side-by-Side Verification Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (7 cols): Detailed Applicant Profile & Documents */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Applicant Profile Information */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2">
                Declared Applicant Information
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-700">
                <div>• Full Name: <strong>{applicantFullName}</strong></div>
                <div>• Date of Birth: <strong>{app.personalInfo?.dob || 'Not provided'}</strong></div>
                <div>• Gender: <strong>{app.personalInfo?.gender || 'Not provided'}</strong></div>
                <div>• Mobile: <strong>+91 {app.personalInfo?.mobile || app.mobile}</strong></div>
                <div>• Annual Income: <strong>₹{(app.incomeInfo?.annualIncome ?? 'Not provided').toLocaleString()}/yr</strong></div>
                <div>• Income Cert No: <strong>{app.incomeInfo?.incomeCertificateNo || 'Not provided'}</strong></div>
                <div>• Bank DBT: <strong>{app.bankInfo?.bankName || 'Not provided'} (•••• {app.bankInfo?.accountNumber?.slice(-4) || '?'})</strong></div>
                <div>• IFSC Code: <strong>{app.bankInfo?.ifscCode || 'Not provided'}</strong></div>
                <div className="col-span-2">• Address: <strong>{app.addressInfo ? `${app.addressInfo.doorNo}, ${app.addressInfo.street}, ${app.addressInfo.villageTown}, ${app.addressInfo.district} - ${app.addressInfo.pinCode}` : 'Not provided'}</strong></div>
              </div>
            </div>

            {/* Document Quality & OCR Inspection (Sections 18-20) */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Uploaded Documents & OCR Pre-Screening</span>
                <span className="text-xs font-normal text-slate-500">OpenCV Quality Check</span>
              </h3>

              <div className="space-y-3">
                {(app.uploadedDocs || []).map((doc, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900">{doc.docType}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {doc.qualityStatus || 'Not evaluated'}
                      </span>
                    </div>
                    <div className="font-mono text-slate-500 text-[11px] truncate">
                      File: {doc.fileName}
                    </div>

                    {doc.extractedFields && (
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-700 font-mono space-y-0.5">
                        <div className="text-slate-400 font-bold uppercase text-[9px]">Extracted NLP Entities:</div>
                        {Object.entries(doc.extractedFields).map(([k, v]) => (
                          <div key={k}>{k}: <strong>{String(v)}</strong></div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {(!app.uploadedDocs || app.uploadedDocs.length === 0) && (
                  <p className="rounded-xl bg-amber-50 p-4 text-xs text-amber-800">No uploaded document records are linked to this application.</p>
                )}
              </div>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Document Verification History</h3>
                  <p className="mt-1 text-xs text-slate-500">Persistent source-to-decision records. Each extraction retry remains separately available.</p>
                </div>
                <button onClick={loadVerificationHistory} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">Refresh history</button>
              </div>
              {traceError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{traceError}</p>}
              {traceLoading && <p className="text-xs text-slate-500">Loading verification records…</p>}
              {!traceLoading && verificationHistory && (
                <div className="space-y-4">
                  {verificationHistory.documents?.length ? verificationHistory.documents.map((doc) => (
                    <article key={doc.documentId} className="rounded-2xl border border-slate-200 p-4 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">{doc.documentType}: {doc.originalName}</h4>
                          <p className="mt-1 break-all font-mono text-[10px] text-slate-500">ID {doc.documentId} · SHA-256 {doc.sha256}</p>
                          <p className="text-[10px] text-slate-400">Uploaded {new Date(doc.uploadedAt).toLocaleString()} by {doc.uploaderId}; {doc.sizeBytes} bytes</p>
                        </div>
                        <button onClick={() => openOriginalDocument(doc.documentId)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Open original</button>
                      </div>
                      {doc.extractions?.map((extraction) => (
                        <div key={extraction.extractionId} className="rounded-xl bg-slate-50 p-4 space-y-3">
                          <div className="flex flex-wrap justify-between gap-2 text-xs">
                            <strong className="text-slate-800">Attempt {extraction.attempt} · {extraction.ocrEngine} {extraction.ocrVersion || ''}</strong>
                            <span className="text-slate-500">{new Date(extraction.processedAt).toLocaleString()} · {extraction.pipelineVersion}</span>
                          </div>
                          {extraction.processingErrors?.length > 0 && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{extraction.processingErrors.join(' ')}</p>}
                          <div className="rounded-lg border border-slate-200 bg-white p-3 text-[11px] text-slate-700"><strong>Source image quality: {extraction.quality?.overallQuality || 'Not evaluated'}</strong><div>Blur: {extraction.quality?.blurScore ?? '?'} ? Brightness: {extraction.quality?.brightness ?? '?'} ? Contrast: {extraction.quality?.contrast ?? '?'} ? Resolution: {extraction.quality?.resolution || '?'}</div>{(extraction.quality?.guidanceNotes || []).map((note, noteIndex) => <p key={noteIndex}>{note}</p>)}</div>
                          <details>
                            <summary className="cursor-pointer text-xs font-bold text-blue-700">Raw OCR / extracted output</summary>
                            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[10px] text-slate-700">{extraction.rawOcrText || '(No text extracted)'}</pre>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              {Object.entries(extraction.extractedFields || {}).filter(([, value]) => value !== null && value !== '' && !(Array.isArray(value) && !value.length)).map(([field, value]) => {
                                const evidence = extraction.fieldEvidence?.[field] || {};
                                return <div key={field} className="rounded-lg border border-slate-200 bg-white p-2 text-[11px]">
                                  <strong>{field}:</strong> {Array.isArray(value) ? value.join(', ') : String(value)}
                                  <div className="mt-1 text-[10px] text-slate-500">Confidence: {evidence.confidence ?? 'not provided by engine'} · Page: {evidence.page ?? 'not available'} · Region: {evidence.boundingBox ? `${evidence.boundingBox.join(', ')} ${evidence.boundingBoxUnit || ''}` : 'not available'}</div>
                                  {evidence.sourceText && <div className="mt-1 text-[10px] text-slate-500">Source text: {evidence.sourceText}</div>}
                                </div>;
                              })}
                            </div>
                          </details>
                          {extraction.validations?.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="text-xs font-extrabold text-slate-800">Field validation</h5>
                              {extraction.validations.map((validation) => (
                                <div key={validation.validationId} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                                  <div className="text-[11px]">
                                    <strong>{validation.field}</strong> · <span className="font-black">{validation.result}</span>
                                    <p className="mt-1 text-slate-600">Extracted: {validation.extractedValue ?? '—'} · Declared: {validation.declaredValue ?? '—'}</p>
                                    <p className="text-[10px] text-slate-500">Rule {validation.rule} v{validation.ruleVersion} · {validation.explanation}</p>
                                  </div>
                                  {validation.result !== 'MATCH' && <button onClick={() => {
                                    setCorrectionTarget({ extractionId: extraction.extractionId, field: validation.field });
                                    setCorrectionValue(validation.declaredValue ?? '');
                                  }} className="rounded-lg border border-amber-300 px-3 py-2 text-[10px] font-bold text-amber-800">Record correction</button>}
                                </div>
                              ))}
                            </div>
                          )}
                          {correctionTarget?.extractionId === extraction.extractionId && (
                            <form onSubmit={submitCorrection} className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                              <p className="text-xs font-extrabold text-amber-900">Correction for {correctionTarget.field}</p>
                              <input value={correctionValue} onChange={(event) => setCorrectionValue(event.target.value)} className="w-full rounded-lg border border-amber-200 bg-white p-2 text-xs" placeholder="Corrected value" required />
                              <textarea value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} className="w-full rounded-lg border border-amber-200 bg-white p-2 text-xs" placeholder="Reason for correction" required />
                              <div className="flex gap-2"><button className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white">Save attributed correction</button><button type="button" onClick={() => setCorrectionTarget(null)} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold">Cancel</button></div>
                            </form>
                          )}
                        </div>
                      ))}
                      {!doc.extractions?.length && <p className="text-xs text-slate-500">No extraction attempt was persisted for this source.</p>}
                    </article>
                  )) : <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No source documents have persistent trace records for this application.</p>}

                  {verificationHistory.eligibilityEvaluations?.map((evaluation) => <article key={evaluation.evaluationId} className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-xs">
                    <h4 className="font-extrabold text-indigo-950">Eligibility evaluation {evaluation.evaluationId}</h4>
                    <p className="mt-1 text-indigo-900">Rule: {evaluation.schemeRuleVersion} · Score: {evaluation.result?.score ?? '—'} · {evaluation.result?.status ?? '—'}</p>
                    <p className="mt-1 text-indigo-800">{evaluation.explanation}</p>
                    <details className="mt-2"><summary className="cursor-pointer font-bold text-indigo-800">Inputs and value sources</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[10px]">{JSON.stringify({ inputs: evaluation.inputs, sources: evaluation.inputSources }, null, 2)}</pre></details>
                  </article>)}

                  {verificationHistory.routingDecisions?.map((decision) => <article key={decision.routingId} className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs">
                    <h4 className="font-extrabold text-blue-950">Routing: {decision.route}</h4><p className="mt-1 text-blue-900">{decision.reason}</p><p className="mt-1 text-[10px] text-blue-700">Decision {decision.routingId} · Evaluation {decision.evaluationId} · Validation records: {decision.validationIds?.join(', ') || 'none'}</p>
                  </article>)}

                  {verificationHistory.manualCorrections?.map((correction) => <article key={correction.correctionId} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs">
                    <h4 className="font-extrabold text-amber-950">Manual correction · {correction.field}</h4><p className="mt-1">{correction.originalValue ?? '—'} → {correction.correctedValue ?? '—'}</p><p className="mt-1 text-amber-800">{correction.reason} · {correction.actorId} ({correction.actorRole}) · {new Date(correction.createdAt).toLocaleString()}</p>
                  </article>)}

                  {verificationHistory.auditEvents?.map((event) => <article key={event.eventId} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[10px]">
                    <div className="flex flex-wrap justify-between gap-2"><strong>{event.action} · {event.actorId} ({event.actorRole})</strong><time>{new Date(event.occurredAt).toLocaleString()}</time></div><p className="mt-1">{event.reason} · Request {event.requestId}</p><p className="mt-1 break-all font-mono text-slate-500">Tamper-evident event hash: {event.eventHash} · previous: {event.previousHash}</p>
                  </article>)}
                </div>
              )}
            </section>

            {app.identityVerification && <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
                  RapidFuzz String Similarity & Identity Consistency
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  {app.identityVerification.identityStatus || 'Not evaluated'} {app.identityVerification.overallMatchPercentage != null ? `(${app.identityVerification.overallMatchPercentage}%)` : ''}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                <div className="bg-slate-800 p-2 rounded-xl">
                  <div className="text-[10px] text-slate-400">Name Match</div>
                  <div className="font-bold text-emerald-400">{app.identityVerification.nameMatchPercentage ?? '—'}{app.identityVerification.nameMatchPercentage != null ? '%' : ''}</div>
                </div>
                <div className="bg-slate-800 p-2 rounded-xl">
                  <div className="text-[10px] text-slate-400">DOB Match</div>
                  <div className="font-bold text-emerald-400">{app.identityVerification.dobMatchPercentage ?? '—'}{app.identityVerification.dobMatchPercentage != null ? '%' : ''}</div>
                </div>
                <div className="bg-slate-800 p-2 rounded-xl">
                  <div className="text-[10px] text-slate-400">Income Match</div>
                  <div className="font-bold text-emerald-400">{app.identityVerification.incomeMatchPercentage ?? '—'}{app.identityVerification.incomeMatchPercentage != null ? '%' : ''}</div>
                </div>
                <div className="bg-slate-800 p-2 rounded-xl">
                  <div className="text-[10px] text-slate-400">Cert ID Match</div>
                  <div className="font-bold text-emerald-400">{app.identityVerification.certNumberMatchPercentage ?? '—'}{app.identityVerification.certNumberMatchPercentage != null ? '%' : ''}</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                Evaluated strictly on textual string similarity. No biometrics or facial recognition used.
              </p>
            </div>}

          </div>

          {/* Right Column (5 cols): Official Administrative Action Controls */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 space-y-5">
              <div className="space-y-1 border-b border-slate-100 pb-3">
                <span className="text-[10px] uppercase font-black tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  Authority Workstation
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Official Administrative Determination
                </h3>
                <p className="text-xs text-slate-500">
                  Reviewer: <strong>{currentUser?.fullName || 'Thiru. S. Arumugam, Tahsildar'}</strong>
                </p>
              </div>

              {/* Remarks Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Official Officer Remarks & Audit Log</label>
                <textarea
                  rows="3"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter administrative inquiry findings or reasons..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Sanction Order Number (for approval) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Sanction Order Reference</label>
                <input
                  type="text"
                  value={sanctionOrderNo}
                  onChange={(e) => setSanctionOrderNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300"
                />
              </div>

              {/* Action Buttons: Approve, Correction, Reject */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleDecision('APPROVED')}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sanction & Approve Application</span>
                </button>

                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleDecision('ACTION REQUIRED')}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Request Applicant Correction</span>
                </button>

                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleDecision('REJECTED')}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Application (Formal Notice)</span>
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
                <div>• Decision status is instantly dispatched to citizen's dashboard.</div>
                <div>• Sanction orders activate Direct Benefit Transfer processing.</div>
              </div>

            </div>

            {/* Audit Trail Timeline Snapshot */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-3">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Audit Trail Log
              </h4>

              <div className="space-y-2 text-xs">
                {app.timeline?.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-slate-900">{t.title}</strong>: {t.description} ({t.date})
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
};
