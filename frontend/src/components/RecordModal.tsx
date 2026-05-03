import { useState, useEffect, useRef } from 'react';
import { DocumentViewer } from './DocumentViewer';
import { API_URL } from '../utils/api';

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
        alert('❌ Only PDF, DOC, and DOCX files are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('❌ File size must be less than 5MB');
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
        alert('✅ CV uploaded successfully!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      alert('❌ Failed to upload CV');
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
        alert('✅ Record updated successfully!');
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error('❌ Error updating record:', error);
      alert('❌ Failed to update record');
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        
        <div
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)' }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl rounded-t-3xl">
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEditing ? 'Edit Record' : 'Record Details'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Sl No: {formData.slNo} | Entry No: {formData.entryNo}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-medium shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-300 transform hover:scale-[1.02]"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-400 text-white font-medium shadow-lg shadow-green-500/20 hover:shadow-green-500/30 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Changes
                      </span>
                    )}
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white/60 hover:text-white transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">CV / Document</h3>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
                      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium">{displayFileName}</p>
                      {selectedFile && (
                        <p className="text-xs text-cyan-400">New file selected</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {docPath && !selectedFile && (
                      <button
                        onClick={() => setIsViewerOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 text-sm font-medium transition-all duration-200"
                      >
                        View
                      </button>
                    )}
                    {isEditing && selectedFile && (
                      <>
                        <button
                          onClick={handleUpload}
                          disabled={uploading}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 text-sm font-medium transition-all duration-200 disabled:opacity-50"
                        >
                          {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFile(null);
                            setFileName(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <svg className="w-12 h-12 mx-auto text-white/20 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-white/40 text-sm mb-3">No CV uploaded</p>
                  {isEditing && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-sm font-medium shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-300"
                    >
                      Upload CV
                    </button>
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

          <div className="sticky bottom-0 p-6 border-t border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl rounded-b-3xl">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-all duration-300"
              >
                Close
              </button>
            </div>
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
