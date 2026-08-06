import { useEffect, useRef, useState } from 'react';
import { FileText, PencilSimple, X } from '@phosphor-icons/react';
import { Button, DocumentViewer, IconButton } from './index';
import { API_URL } from '../utils/api';
import { toast } from '../utils/toast';

interface RecordData {
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
  assignTo?: string;
}

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: RecordData | null;
  onUpdate: (updatedRecord: RecordData) => void;
}

export function RecordModal({ isOpen, onClose, record, onUpdate }: RecordModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<RecordData | null>(record);
  const [departments, setDepartments] = useState<string[]>([]);
  const [docPath, setDocPath] = useState<string | null>(record?.docPath || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (record) {
      setFormData(record);
      setDocPath(record.docPath || null);
      setIsEditing(false);
      setSelectedFile(null);
      setFileName(null);
    }
  }, [record]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch(API_URL.departments);
        const data = await response.json();
        setDepartments(data.map((d: { name: string }) => d.name));
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (formData) {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF, DOC, and DOCX files are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !formData) return;

    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', selectedFile);

      const response = await fetch(API_URL.resourcesUpload, {
        method: 'POST',
        body: uploadData,
      });

      if (response.ok) {
        const data = await response.json();
        setDocPath(data.docPath);
        setSelectedFile(null);
        toast.success('CV uploaded successfully!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload CV');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!formData) return;

    setLoading(true);
    try {
      const updateData = {
        ...formData,
        docPath: docPath,
      };

      const response = await fetch(API_URL.resourcesById(formData.slNo), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        onUpdate({ ...formData, docPath: docPath || undefined });
        onClose();
        toast.success('Record updated successfully!');
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error('Error updating record:', error);
      toast.error('Failed to update record');
    }
    setLoading(false);
  };

  const handleCancel = () => {
    setFormData(record);
    setDocPath(record?.docPath || null);
    setIsEditing(false);
    setSelectedFile(null);
    setFileName(null);
  };

  if (!isOpen || !formData) return null;

  const displayFileName = fileName || (docPath ? docPath.split('/').pop() : null);

  return (
    <>
      <div
        className="fixed inset-0 z-modal flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-slate-900/40" />

        <div
          className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-popover"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                {isEditing ? 'Edit Record' : 'Record Details'}
              </h2>
              <p className="mt-0.5 truncate text-[13px] text-slate-500">
                Sl No: {formData.slNo} · Entry No: {formData.entryNo}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!isEditing ? (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<PencilSimple size={14} />}
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="ghost" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? 'Saving…' : 'Save Changes'}
                  </Button>
                </>
              )}
              <IconButton label="Close" onClick={onClose}>
                <X size={15} />
              </IconButton>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-slate-900">CV / Document</h3>
                {isEditing && (
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                )}
              </div>

              {docPath || selectedFile ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{displayFileName}</p>
                      {selectedFile && (
                        <p className="text-xs text-blue-600">New file selected</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {docPath && !selectedFile && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setIsViewerOpen(true)}
                      >
                        View
                      </Button>
                    )}
                    {isEditing && selectedFile && (
                      <>
                        <Button size="sm" onClick={handleUpload} disabled={uploading}>
                          {uploading ? 'Uploading…' : 'Upload'}
                        </Button>
                        <button
                          onClick={() => {
                            setSelectedFile(null);
                            setFileName(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          aria-label="Remove file"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="mb-3 text-sm text-slate-500">No CV uploaded</p>
                  {isEditing && (
                    <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                      Upload CV
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="entry-form-grid">
              <div className="form-row row-1">
                <div className="form-field">
                  <label>Phone 1</label>
                  {isEditing ? (
                    <input type="text" name="phone1" value={formData.phone1} onChange={handleChange} maxLength={10} className="no-spinner" />
                  ) : (
                    <p className="field-value">{formData.phone1 || '-'}</p>
                  )}
                </div>
                <div className="form-field">
                  <label>Phone 2</label>
                  {isEditing ? (
                    <input type="text" name="phone2" value={formData.phone2} onChange={handleChange} maxLength={10} className="no-spinner" />
                  ) : (
                    <p className="field-value">{formData.phone2 || '-'}</p>
                  )}
                </div>
              </div>

              <div className="form-row row-2">
                <div className="form-field name-field">
                  <label>Name</label>
                  {isEditing ? (
                    <input type="text" name="name" value={formData.name} onChange={handleChange} maxLength={30} />
                  ) : (
                    <p className="field-value">{formData.name || '-'}</p>
                  )}
                </div>
                <div className="form-field experience-field">
                  <label>Experience</label>
                  {isEditing ? (
                    <input type="number" name="experience" value={formData.experience ?? ''} onChange={handleChange} className="no-spinner" />
                  ) : (
                    <p className="field-value">{formData.experience ?? 0} yrs</p>
                  )}
                </div>
              </div>

              <div className="form-row row-3">
                <div className="form-field">
                  <label>Location</label>
                  {isEditing ? (
                    <input type="text" name="location" value={formData.location} onChange={handleChange} maxLength={30} />
                  ) : (
                    <p className="field-value">{formData.location || '-'}</p>
                  )}
                </div>
                <div className="form-field">
                  <label>Department</label>
                  {isEditing ? (
                    <select name="department" value={formData.department} onChange={handleChange}>
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="field-value badge">{formData.department || '-'}</p>
                  )}
                </div>
              </div>

              <div className="form-row row-4">
                <div className="form-field post-field">
                  <label>Post</label>
                  {isEditing ? (
                    <input type="text" name="post" value={formData.post} onChange={handleChange} maxLength={50} />
                  ) : (
                    <p className="field-value">{formData.post || '-'}</p>
                  )}
                </div>
              </div>

              <div className="form-row row-5">
                <div className="form-field">
                  <label>Current Salary</label>
                  {isEditing ? (
                    <input type="number" name="currentSalary" value={formData.currentSalary ?? ''} onChange={handleChange} className="no-spinner" />
                  ) : (
                    <p className="field-value">₹{formData.currentSalary ? new Intl.NumberFormat('en-IN').format(formData.currentSalary) : '-'}</p>
                  )}
                </div>
                <div className="form-field">
                  <label>Expected Salary</label>
                  {isEditing ? (
                    <input type="number" name="expectedSalary" value={formData.expectedSalary ?? ''} onChange={handleChange} className="no-spinner" />
                  ) : (
                    <p className="field-value">₹{formData.expectedSalary ? new Intl.NumberFormat('en-IN').format(formData.expectedSalary) : '-'}</p>
                  )}
                </div>
              </div>

              <div className="form-row row-6">
                <div className="form-field">
                  <label>Current Status</label>
                  {isEditing ? (
                    <input type="text" name="status" value={formData.status || ''} onChange={handleChange} maxLength={30} />
                  ) : (
                    <p className="field-value">{formData.status || '-'}</p>
                  )}
                </div>
                <div className="form-field">
                  <label>Assign To</label>
                  {isEditing ? (
                    <input type="text" name="assignTo" value={formData.assignTo || ''} onChange={handleChange} maxLength={30} />
                  ) : (
                    <p className="field-value">{formData.assignTo || '-'}</p>
                  )}
                </div>
              </div>

              <div className="form-row meta-row">
                <div className="form-field">
                  <label>Entry No</label>
                  {isEditing ? (
                    <input type="text" name="entryNo" value={formData.entryNo} onChange={handleChange} />
                  ) : (
                    <p className="field-value mono">{formData.entryNo || '-'}</p>
                  )}
                </div>
                <div className="form-field">
                  <label>Sl No</label>
                  <p className="field-value mono">{formData.slNo || '-'}</p>
                </div>
                <div className="form-field">
                  <label>Date</label>
                  <p className="field-value">{formData.datez || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 justify-end border-t border-slate-200 px-5 py-3.5">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>

      <DocumentViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        docPath={docPath || ''}
        fileName={displayFileName || undefined}
      />
    </>
  );
}
