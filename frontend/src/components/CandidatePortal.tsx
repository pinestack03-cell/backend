import { useCallback, useEffect, useState } from 'react';
import {
  ArrowSquareOut,
  Check,
  CircleNotch,
  FilePdf,
  FileText,
  UploadSimple,
} from '@phosphor-icons/react';
import { Button, Field, Input, Panel, PageHeader, StatusBadge, Toaster, TopNav } from './index';
import { API_URL, apiFetch } from '../utils/api';
import { getToken } from '../utils/auth';
import { toast } from '../utils/toast';

interface CandidateRecord {
  slNo: number;
  entryNo: string;
  datez: string;
  phone1: string;
  phone2: string;
  name: string;
  post: string;
  department: string;
  location: string;
  docPath?: string;
  experience?: number;
  currentSalary?: number;
  expectedSalary?: number;
  status?: string;
  email?: string;
}

const MAX_LENGTHS = {
  phone1: 10,
  phone2: 10,
  name: 30,
  post: 50,
  department: 30,
  location: 30,
};

function FormSection({
  title,
  hint,
  children,
  gridClass = 'grid grid-cols-2 gap-4',
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  gridClass?: string;
}) {
  return (
    <section className="mt-6 border-t border-slate-100 pt-5 first:mt-0 first:border-t-0 first:pt-0 dark:border-slate-800">
      <h2 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      <div className={`${gridClass} mt-3`}>{children}</div>
    </section>
  );
}

const fileNameFromPath = (path: string) => path.split('/').pop() || path;

interface CandidatePortalProps {
  dark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
}

export function CandidatePortal({ dark, onToggleDark, onLogout }: CandidatePortalProps) {
  const [record, setRecord] = useState<CandidateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [phone1Error, setPhone1Error] = useState<string | null>(null);
  const [phone2Error, setPhone2Error] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    post: '',
    department: '',
    location: '',
    phone1: '',
    phone2: '',
    experience: 0,
    currentSalary: 0,
    expectedSalary: 0,
  });

  const loadRecord = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch(API_URL.candidateMe);
      if (response.status === 404) {
        setLoadError('No candidate record is linked to this account.');
        return;
      }
      if (!response.ok) {
        setLoadError('Failed to load your profile.');
        return;
      }
      const data: CandidateRecord = await response.json();
      setRecord(data);
      setFormData({
        name: data.name || '',
        post: data.post || '',
        department: data.department || '',
        location: data.location || '',
        phone1: data.phone1 || '',
        phone2: data.phone2 || '',
        experience: data.experience || 0,
        currentSalary: data.currentSalary || 0,
        expectedSalary: data.expectedSalary || 0,
      });
      setUploadedFilePath(data.docPath || null);
      if (data.docPath) {
        setPreviewUrl(API_URL.docUrl(data.docPath, getToken()));
      }
    } catch {
      setLoadError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const maxLen = MAX_LENGTHS[name as keyof typeof MAX_LENGTHS];
    const trimmedValue = maxLen ? value.slice(0, maxLen) : value;
    setFormData({ ...formData, [name]: trimmedValue });
  };

  const handlePhone1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, phone1: value });
    setPhone1Error(value.length > 0 && value.length !== 10 ? 'Phone number must be exactly 10 digits' : null);
  };

  const handlePhone2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, phone2: value });
    setPhone2Error(value.length > 0 && value.length !== 10 ? 'Phone number must be exactly 10 digits' : null);
  };

  const isFormValid = () => {
    if (!formData.phone1 || formData.phone1.length !== 10) return false;
    if (phone1Error) return false;
    if (formData.phone2 && (formData.phone2.length !== 10 || phone2Error)) return false;
    return true;
  };

  const handleSave = async () => {
    if (!isFormValid()) {
      toast.error('Please fix the phone number errors');
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch(API_URL.candidateMe, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Profile updated successfully!');
        loadRecord();
      } else {
        toast.error(result.error || 'Update failed');
      }
    } catch {
      toast.error('Server error');
    } finally {
      setSaving(false);
    }
  };

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const response = await apiFetch(API_URL.candidateCv, {
        method: 'POST',
        body: fd,
      });
      const data = await response.json();
      if (data.success) {
        setUploadedFilePath(data.docPath);
        setPreviewUrl(API_URL.docUrl(data.docPath, getToken()));
        toast.success('CV uploaded successfully!');
      } else {
        setPreviewUrl(null);
        toast.error(data.error || 'Failed to upload CV');
      }
    } catch {
      setPreviewUrl(null);
      toast.error('Failed to upload CV');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        <TopNav
          tabs={[]}
          activeTab=""
          onTabChange={() => undefined}
          dark={dark}
          onToggleDark={onToggleDark}
          role="candidate"
          onLogout={onLogout}
        />
        <main className="flex min-h-0 flex-1 items-center justify-center">
          <div className="flex items-center gap-3">
            <CircleNotch size={20} className="animate-spin text-blue-600 dark:text-slate-300" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading your profile…</p>
          </div>
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        <TopNav
          tabs={[]}
          activeTab=""
          onTabChange={() => undefined}
          dark={dark}
          onToggleDark={onToggleDark}
          role="candidate"
          onLogout={onLogout}
        />
        <main className="flex min-h-0 flex-1 items-center justify-center px-6">
          <Panel className="w-full max-w-md p-6 text-center">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Profile unavailable</p>
            <p className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400">{loadError}</p>
          </Panel>
        </main>
      </div>
    );
  }

  const attachedFileName = uploadedFilePath ? fileNameFromPath(uploadedFilePath) : null;
  const serverDocUrl = uploadedFilePath ? API_URL.docUrl(uploadedFilePath, getToken()) : null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <TopNav
        tabs={[]}
        activeTab=""
        onTabChange={() => undefined}
        dark={dark}
        onToggleDark={onToggleDark}
        role="candidate"
        onLogout={onLogout}
      />

      <main className="flex min-h-0 flex-1 flex-col gap-4 px-6 pb-5 pt-5">
        <PageHeader
          title="My Profile"
          subtitle="View and update your details. Entry number and status are managed by the admin."
          actions={
            <Button size="sm" icon={<Check size={14} weight="bold" />} onClick={handleSave} disabled={saving || !isFormValid()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          }
        />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          {/* FORM PANEL */}
          <Panel className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <h2 className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                Candidate Details
              </h2>
              {record?.status && (
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <StatusBadge status={record.status} />
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name" htmlFor="name">
                  <Input
                    id="name"
                    name="name"
                    placeholder="Candidate name"
                    value={formData.name}
                    onChange={handleChange}
                    maxLength={30}
                  />
                </Field>
                <Field label="Post" htmlFor="post">
                  <Input
                    id="post"
                    name="post"
                    placeholder="Enter post"
                    value={formData.post}
                    onChange={handleChange}
                    maxLength={50}
                  />
                </Field>
                <Field label="Department" htmlFor="department">
                  <Input
                    id="department"
                    name="department"
                    placeholder="Enter department"
                    value={formData.department}
                    onChange={handleChange}
                    maxLength={30}
                  />
                </Field>
                <Field label="Location" htmlFor="location">
                  <Input
                    id="location"
                    name="location"
                    placeholder="Enter location"
                    value={formData.location}
                    onChange={handleChange}
                    maxLength={30}
                  />
                </Field>
              </div>

              <FormSection title="Contact" hint="Phone 1 is required">
                <Field label="Phone 1" htmlFor="phone1" required error={phone1Error}>
                  <Input
                    id="phone1"
                    name="phone1"
                    placeholder="10-digit number"
                    value={formData.phone1}
                    onChange={handlePhone1Change}
                    maxLength={10}
                    inputMode="numeric"
                    autoComplete="off"
                    className="font-mono"
                    error={!!phone1Error}
                  />
                </Field>
                <Field label="Phone 2 (Optional)" htmlFor="phone2" error={phone2Error}>
                  <Input
                    id="phone2"
                    name="phone2"
                    placeholder="10-digit number (optional)"
                    value={formData.phone2}
                    onChange={handlePhone2Change}
                    maxLength={10}
                    inputMode="numeric"
                    autoComplete="off"
                    className="font-mono"
                    error={!!phone2Error}
                  />
                </Field>
              </FormSection>

              <FormSection title="Experience & Salary" gridClass="grid grid-cols-3 gap-4">
                <Field label="Experience" htmlFor="experience">
                  <Input
                    id="experience"
                    type="number"
                    name="experience"
                    placeholder="0"
                    value={formData.experience}
                    onChange={handleChange}
                    trailing="yrs"
                    className="no-spinner"
                  />
                </Field>
                <Field label="Current Salary" htmlFor="currentSalary">
                  <Input
                    id="currentSalary"
                    type="number"
                    name="currentSalary"
                    placeholder="0"
                    value={formData.currentSalary}
                    onChange={handleChange}
                    leading="₹"
                    className="no-spinner"
                  />
                </Field>
                <Field label="Expected Salary" htmlFor="expectedSalary">
                  <Input
                    id="expectedSalary"
                    type="number"
                    name="expectedSalary"
                    placeholder="0"
                    value={formData.expectedSalary}
                    onChange={handleChange}
                    leading="₹"
                    className="no-spinner"
                  />
                </Field>
              </FormSection>

              <FormSection title="Tracking" hint="Managed by the admin — read-only">
                <Field label="Email" htmlFor="email">
                  <Input
                    id="email"
                    name="email"
                    value={record?.email || ''}
                    disabled
                    className="col-span-2"
                  />
                </Field>
                <Field label="Entry No" htmlFor="entryNo">
                  <Input
                    id="entryNo"
                    name="entryNo"
                    value={record?.entryNo || ''}
                    disabled
                    className="font-mono"
                  />
                </Field>
                <Field label="Entry Date" htmlFor="entryDate">
                  <Input
                    id="entryDate"
                    type="date"
                    name="entryDate"
                    value={record?.datez || ''}
                    disabled
                  />
                </Field>
                <Field label="Current Status" htmlFor="status">
                  <Input
                    id="status"
                    name="status"
                    value={record?.status || ''}
                    disabled
                  />
                </Field>
              </FormSection>

              <FormSection
                title="Document"
                hint="Upload your CV (PDF, DOC, DOCX)"
                gridClass="grid grid-cols-1 gap-4"
              >
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      id="candidate-cv-upload"
                      accept=".pdf,.doc,.docx"
                      onChange={handleCvUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="candidate-cv-upload"
                      className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-400/60"
                    >
                      <UploadSimple size={14} weight="bold" />
                      Upload CV
                    </label>
                    {uploading && (
                      <span className="flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-400">
                        <CircleNotch size={14} className="animate-spin text-blue-600 dark:text-slate-300" />
                        Uploading…
                      </span>
                    )}
                  </div>
                  {attachedFileName && (
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                      <FilePdf size={15} className="shrink-0 text-emerald-600" />
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700 dark:text-slate-200">
                        {attachedFileName}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        <Check size={12} weight="bold" />
                        Saved
                      </span>
                    </div>
                  )}
                </div>
              </FormSection>
            </div>
          </Panel>

          {/* PREVIEW PANEL */}
          <Panel className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-slate-200">
                <FileText size={16} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">My CV</h2>
                <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">
                  {attachedFileName ?? 'No CV uploaded yet'}
                </p>
              </div>
              {serverDocUrl && (
                <a
                  className="ml-auto shrink-0"
                  href={serverDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm" icon={<ArrowSquareOut size={14} weight="bold" />}>
                    Open
                  </Button>
                </a>
              )}
            </div>
            <div className="min-h-0 flex-1 bg-slate-100 p-4 dark:bg-slate-950">
              {previewUrl ? (
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  title="My CV preview"
                  className="preview-fade h-full w-full rounded-lg border border-slate-200 bg-white shadow-panel dark:border-slate-800"
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-500">
                      <FileText size={22} />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No CV uploaded</p>
                    <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                      Upload a PDF or DOC to preview it here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </main>

      <Toaster />
    </div>
  );
}
