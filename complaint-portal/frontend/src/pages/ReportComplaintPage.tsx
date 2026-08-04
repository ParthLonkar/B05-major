/**
 * Report Complaint Page
 * User sees only the complaint form with live GPS or pasted Google Maps coordinates.
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { TextArea } from '../components/ui/TextArea';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useGeolocation } from '../hooks/useGeolocation';
import { useToast } from '../hooks/useToast';
import { complaintApi } from '../services/api';
import { ToastContainer } from '../components/ui/Toast';

const phoneRegex = /^\+?[0-9]{10,15}$/;

type ParsedLocation = {
  latitude: number;
  longitude: number;
  label: string;
};

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
      return {
        latitude,
        longitude,
        label: text.startsWith('http') ? 'Pasted Google Maps location' : 'Pasted coordinates',
      };
    }
  }

  return null;
};

export const ReportComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const { toasts, addToast, removeToast } = useToast();
  const { location, loading: locationLoading, error: locationError, requestLocation } = useGeolocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    category: 'Pothole' as const,
    description: '',
    severity: 'Medium' as const,
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.name || prev.fullName,
        email: user.email || prev.email,
      }));
    }
  }, [user]);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submittedComplaintId, setSubmittedComplaintId] = useState<string | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState<boolean | null>(null);
  const [locationInput, setLocationInput] = useState('');
  const [overrideLocation, setOverrideLocation] = useState<ParsedLocation | null>(null);

  const liveLocation = useMemo(() => {
    if (!location) return null;
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      label: 'Live GPS location',
    } satisfies ParsedLocation;
  }, [location]);

  const chosenLocation = overrideLocation || liveLocation;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const applyPastedLocation = () => {
    const parsed = parseCoordinates(locationInput);
    if (!parsed) {
      addToast('Paste a valid Google Maps link or latitude,longitude pair', 'error');
      return;
    }

    setOverrideLocation(parsed);
    addToast('Location coordinates applied', 'success');
  };

  const clearPastedLocation = () => {
    setOverrideLocation(null);
    setLocationInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.mobileNumber.trim() || !formData.description.trim()) {
      addToast('Please fill all required fields', 'error');
      return;
    }

    if (!phoneRegex.test(formData.mobileNumber.trim())) {
      addToast('Enter a valid phone number with 10 to 15 digits', 'error');
      return;
    }

    if (!chosenLocation) {
      addToast('Please use live location or paste a Google Maps link with coordinates', 'warning');
      return;
    }

    setLoading(true);

    try {
      const response = await complaintApi.create({
        fullName: formData.fullName.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        email: formData.email.trim() || undefined,
        category: formData.category,
        description: formData.description.trim(),
        latitude: chosenLocation.latitude,
        longitude: chosenLocation.longitude,
        address: overrideLocation ? overrideLocation.label : 'Current Location',
        severity: formData.severity,
        imagePreview: imagePreview || undefined,
      });

      if (response.success && response.data) {
        setSubmittedComplaintId(response.data.complaintId);
        setEmailConfirmed(response.emailSent ?? false);
        addToast('Complaint registered successfully!', 'success');
      } else {
        addToast(response.error || 'Failed to submit complaint', 'error');
      }
    } catch (error) {
      console.error('Error submitting complaint:', error);
      addToast('Error submitting complaint', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-950 text-white">
      <main className="px-4 py-6 pb-28">
        <div className="mb-6 rounded-[32px] bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 p-[1px] shadow-2xl shadow-blue-500/20">
          <div className="rounded-[31px] bg-slate-950/95 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">User complaint form</p>
            <h1 className="mt-2 text-3xl font-black text-white">Report a road issue</h1>
            <p className="mt-2 text-sm text-slate-300">
              Submit your complaint with live GPS or paste a Google Maps link and we will extract the coordinates.
            </p>
          </div>
        </div>

        {submittedComplaintId ? (
          <Card className="border border-emerald-500/20 bg-emerald-500/10 text-center backdrop-blur-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl text-emerald-200">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">Complaint submitted</h2>
            <p className="mt-2 text-sm text-emerald-100">Your complaint ID is {submittedComplaintId}</p>
            {emailConfirmed !== null ? (
              <p className="mt-2 text-sm text-slate-200">
                {emailConfirmed
                  ? 'A confirmation email was sent to your address.'
                  : 'Email notification was not sent; please check your address or backend email settings.'}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button fullWidth variant="primary" onClick={() => navigate('/report')}>
                Submit another
              </Button>
              <Button fullWidth variant="outline" onClick={() => navigate(`/complaint/${submittedComplaintId}`)}>
                Track this complaint
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
              />

              <Input
                label="Mobile Number"
                name="mobileNumber"
                type="tel"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                placeholder="+91 XXXXXXXXXX"
                required
                hint="Use 10 digits. Include country code if possible."
              />

              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
              />

              <Select
                label="Complaint Category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                options={[
                  { value: 'Pothole', label: 'Pothole' },
                  { value: 'Road Damage', label: 'Road Damage' },
                  { value: 'Water Logging', label: 'Water Logging' },
                  { value: 'Other', label: 'Other' },
                ]}
                required
              />

              <TextArea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the issue in detail..."
                rows={4}
                charLimit={500}
                required
              />

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Photo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  capture="environment"
                  className="hidden"
                />
                <Button type="button" variant="outline" fullWidth onClick={() => fileInputRef.current?.click()}>
                  Upload image
                </Button>
                {imagePreview && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                    <img src={imagePreview} alt="Preview" className="h-40 w-full object-cover" />
                  </div>
                )}
              </div>

              <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-blue-100">Location</h4>
                  {chosenLocation && (
                    <button type="button" onClick={clearPastedLocation} className="text-xs text-blue-300 hover:text-blue-200">
                      Clear pasted location
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Paste Google Maps link or coordinates
                    </label>
                    <Input
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="https://maps.google.com/... or 12.9716,77.5946"
                    />
                    <div className="mt-2 flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={applyPastedLocation}>
                        Use pasted location
                      </Button>
                      <Button type="button" variant="secondary" size="sm" onClick={requestLocation} disabled={locationLoading}>
                        Use live location
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                    {locationLoading ? (
                      <LoadingSpinner size="sm" text="Fetching GPS..." />
                    ) : locationError ? (
                      <div className="text-sm text-blue-100">
                        <p className="mb-3">{locationError}</p>
                        <Button type="button" variant="primary" size="sm" onClick={requestLocation}>
                          Retry Location
                        </Button>
                      </div>
                    ) : chosenLocation ? (
                      <div className="space-y-1 text-sm text-blue-100">
                        <p className="font-semibold">{chosenLocation.label}</p>
                        <p>
                          {chosenLocation.latitude.toFixed(6)}, {chosenLocation.longitude.toFixed(6)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-blue-100">No location selected yet.</p>
                    )}
                  </div>
                </div>
              </div>

              <Button type="submit" fullWidth variant="primary" size="lg" loading={loading}>
                {loading ? 'Submitting...' : 'Submit complaint'}
              </Button>
            </form>
          </Card>
        )}
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};