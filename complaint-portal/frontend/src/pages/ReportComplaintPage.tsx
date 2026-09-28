/**
 * Premium Report Complaint Page
 * Step progress bar, visual severity chips, drag-drop photo, GPS indicator
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { TextArea } from '../components/ui/TextArea';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useGeolocation } from '../hooks/useGeolocation';
import { useToast } from '../hooks/useToast';
import { complaintApi } from '../services/api';
import { ToastContainer } from '../components/ui/Toast';

const phoneRegex = /^\+?[0-9]{10,15}$/;

type ParsedLocation = { latitude: number; longitude: number; label: string };

const parseCoordinates = (value: string): ParsedLocation | null => {
  const text = value.trim();
  if (!text) return null;
  const candidates = [
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /[?&](?:q|ll|query)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/,
  ];
  for (const pattern of candidates) {
    const match = text.match(pattern);
    if (!match) continue;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude, label: text.startsWith('http') ? 'Pasted Google Maps location' : 'Pasted coordinates' };
    }
  }
  return null;
};

const SEVERITY_OPTIONS = [
  { value: 'Low',      label: 'Low',      color: '#38bdf8', bg: 'rgba(14,165,233,0.1)',  border: 'rgba(14,165,233,0.3)',  emoji: '🟢' },
  { value: 'Medium',   label: 'Medium',   color: '#fbbf24', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  emoji: '🟡' },
  { value: 'High',     label: 'High',     color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.3)',  emoji: '🟠' },
  { value: 'Critical', label: 'Critical', color: '#fb7185', bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.3)',   emoji: '🔴' },
];

/* Phone icon */
const PhoneIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.79 19.79 19.79 0 01.01 1.18C.01.67.22.18.57-.18A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

const PersonIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const MailIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);

export const ReportComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAppContext();
  const { toasts, addToast, removeToast } = useToast();
  const { location, loading: locationLoading, error: locationError, requestLocation } = useGeolocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    category: 'Pothole' as const,
    description: '',
    severity: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.name || prev.fullName,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submittedComplaintId, setSubmittedComplaintId] = useState<string | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState<boolean | null>(null);
  const [locationInput, setLocationInput] = useState('');
  const [overrideLocation, setOverrideLocation] = useState<ParsedLocation | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const liveLocation = useMemo(() => {
    if (!location) return null;
    return { latitude: location.latitude, longitude: location.longitude, label: 'Live GPS location' } satisfies ParsedLocation;
  }, [location]);

  const chosenLocation = overrideLocation || liveLocation;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleImageFile(file);
  };

  const applyPastedLocation = () => {
    const parsed = parseCoordinates(locationInput);
    if (!parsed) { addToast('Paste a valid Google Maps link or lat,lng pair', 'error'); return; }
    setOverrideLocation(parsed);
    addToast('Location coordinates applied ✓', 'success');
  };

  const clearPastedLocation = () => { setOverrideLocation(null); setLocationInput(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.mobileNumber.trim() || !formData.description.trim()) {
      addToast('Please fill all required fields', 'error'); return;
    }
    if (!phoneRegex.test(formData.mobileNumber.trim())) {
      addToast('Enter a valid phone number (10-15 digits)', 'error'); return;
    }
    if (!chosenLocation) {
      addToast('Please use live GPS or paste a Google Maps link', 'warning'); return;
    }
    setLoading(true);
    try {
      const response = await complaintApi.create({
        fullName: formData.fullName.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        email: formData.email.trim(),
        category: formData.category,
        description: formData.description.trim(),
        latitude: chosenLocation.latitude,
        longitude: chosenLocation.longitude,
        address: overrideLocation ? overrideLocation.label : 'Current Location',
        severity: formData.severity,
        imageFile: selectedFile || undefined,
        imagePreview: imagePreview || undefined,
      });
      if (response.success && response.data) {
        setSubmittedComplaintId(response.data.complaintId);
        setEmailConfirmed(response.emailSent ?? false);
        addToast('Complaint registered successfully!', 'success');
      } else {
        addToast(response.error || 'Failed to submit', 'error');
      }
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Error submitting complaint', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Success state ── */
  if (submittedComplaintId) {
    return (
      <div className="min-h-full bg-[#080d1a] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm text-center animate-scale-in">
          {/* Success icon */}
          <div
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full"
            style={{
              background: 'rgba(16,185,129,0.12)',
              border: '2px solid rgba(16,185,129,0.3)',
              boxShadow: '0 0 40px rgba(16,185,129,0.25)',
            }}
          >
            <svg className="h-12 w-12 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 className="text-2xl font-black text-white">Complaint Submitted!</h2>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">Your complaint has been registered successfully</p>

          <div
            className="mt-5 rounded-2xl p-4"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">Complaint ID</p>
            <p className="text-lg font-black text-white font-mono">{submittedComplaintId}</p>
            {emailConfirmed !== null && (
              <p className="mt-2 text-xs text-slate-400">
                {emailConfirmed ? '📧 Confirmation email sent' : '⚠️ Email not sent — check backend settings'}
              </p>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <Button
              fullWidth variant="primary" size="lg"
              onClick={() => navigate(`/complaint/${submittedComplaintId}`)}
            >
              Track this Complaint
            </Button>
            <Button
              fullWidth variant="secondary" size="md"
              onClick={() => { setSubmittedComplaintId(null); setEmailConfirmed(null); setImagePreview(null); setSelectedFile(null); }}
            >
              Submit Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#080d1a] text-white">
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 py-4"
        style={{ background: 'rgba(8,13,26,0.92)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400">Pothole Guard</p>
            <h1 className="text-lg font-black text-white mt-0.5">Report Issue</h1>
          </div>
          <button
            onClick={logout}
            className="flex h-9 w-9 items-center justify-center rounded-full shrink-0 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      <main className="px-4 py-5 pb-6 space-y-5">
        {/* Hero banner */}
        <div
          className="rounded-2xl p-5 animate-fade-up"
          style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(6,182,212,0.08))',
            border: '1px solid rgba(14,165,233,0.2)',
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 mb-1">Citizen Form</p>
          <h2 className="text-xl font-black text-white">Report a Road Issue</h2>
          <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
            Submit with live GPS or paste a Google Maps link — we'll extract the coordinates automatically.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal info */}
          <div
            className="rounded-2xl p-4 space-y-4 animate-fade-up"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', animationDelay: '0.05s' }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Personal Info</p>
            <Input label="Full Name" name="fullName" value={formData.fullName} onChange={handleInputChange}
              placeholder="Your full name" required icon={<PersonIcon />} />
            <Input label="Mobile Number" name="mobileNumber" type="tel" value={formData.mobileNumber}
              onChange={handleInputChange} placeholder="+91 XXXXXXXXXX" required icon={<PhoneIcon />}
              hint="10-15 digits, include country code" />
            <Input label="Email" name="email" type="email" value={formData.email}
              onChange={handleInputChange} placeholder="you@email.com" required icon={<MailIcon />} />
          </div>

          {/* Issue details */}
          <div
            className="rounded-2xl p-4 space-y-4 animate-fade-up"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', animationDelay: '0.1s' }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Issue Details</p>

            <Select
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              options={[
                { value: 'Pothole',       label: '🕳️  Pothole' },
                { value: 'Road Damage',   label: '🛣️  Road Damage' },
                { value: 'Water Logging', label: '🌊  Water Logging' },
                { value: 'Other',         label: '📋  Other' },
              ]}
              required
            />

            <TextArea
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the issue — location details, severity, when you noticed it…"
              rows={4}
              charLimit={500}
              required
            />

            {/* Severity chips */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Severity</label>
              <div className="grid grid-cols-4 gap-2">
                {SEVERITY_OPTIONS.map((opt) => {
                  const active = formData.severity === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, severity: opt.value as any }))}
                      className="rounded-xl py-2.5 text-center transition-all active:scale-95"
                      style={{
                        background: active ? opt.bg : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${active ? opt.border : 'rgba(255,255,255,0.08)'}`,
                        color: active ? opt.color : '#64748b',
                        boxShadow: active ? `0 0 12px ${opt.bg}` : 'none',
                      }}
                    >
                      <div className="text-base mb-0.5">{opt.emoji}</div>
                      <div className="text-[10px] font-bold">{opt.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Photo upload */}
          <div
            className="rounded-2xl p-4 animate-fade-up"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', animationDelay: '0.15s' }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Photo Evidence</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} capture="environment" className="hidden" />

            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden">
                <img src={imagePreview} alt="Preview" className="w-full h-44 object-cover" />
                <button
                  type="button"
                  onClick={() => { setSelectedFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full text-white"
                  style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed py-8 text-center transition-all"
                style={{
                  borderColor: isDragging ? 'rgba(14,165,233,0.6)' : 'rgba(255,255,255,0.1)',
                  background: isDragging ? 'rgba(14,165,233,0.05)' : 'transparent',
                }}
              >
                <div className="text-3xl mb-2">📸</div>
                <p className="text-sm font-semibold text-slate-400">Tap to upload or drag & drop</p>
                <p className="text-xs text-slate-600 mt-1">JPG, PNG, WEBP supported</p>
              </div>
            )}
          </div>

          {/* Location */}
          <div
            className="rounded-2xl p-4 animate-fade-up"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', animationDelay: '0.2s' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Location</p>
              {overrideLocation && (
                <button type="button" onClick={clearPastedLocation} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Clear pasted
                </button>
              )}
            </div>

            {/* Paste input */}
            <div className="space-y-2 mb-4">
              <Input
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Paste Google Maps link or 12.9716,77.5946"
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={applyPastedLocation} className="flex-1">
                  📍 Use Pasted
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={requestLocation} disabled={locationLoading} className="flex-1">
                  🛰️ {locationLoading ? 'Fetching…' : 'Use GPS'}
                </Button>
              </div>
            </div>

            {/* Location status */}
            <div
              className="rounded-xl p-3"
              style={{
                background: chosenLocation ? 'rgba(14,165,233,0.08)' : 'rgba(255,255,255,0.03)',
                border: chosenLocation ? '1px solid rgba(14,165,233,0.2)' : '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {locationLoading ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-xs text-blue-300">Fetching GPS coordinates…</span>
                </div>
              ) : locationError ? (
                <div>
                  <p className="text-xs text-rose-400 mb-2">{locationError}</p>
                  <Button type="button" variant="outline" size="sm" onClick={requestLocation}>Retry</Button>
                </div>
              ) : chosenLocation ? (
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <div>
                    <p className="text-xs font-bold text-blue-300">{chosenLocation.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      {chosenLocation.latitude.toFixed(6)}, {chosenLocation.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No location selected yet — use GPS or paste a link above</p>
              )}
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" fullWidth variant="primary" size="lg" loading={loading} className="animate-fade-up" style={{ animationDelay: '0.25s' } as any}>
            {loading ? 'Submitting…' : '🚀 Submit Complaint'}
          </Button>
        </form>
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};