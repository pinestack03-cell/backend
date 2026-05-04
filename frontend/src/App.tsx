import { useState, useEffect, useRef } from "react";
import { GlassCard, SearchView } from "./components";
import { API_URL } from "./utils/api";

type TabType = 'entry' | 'search';

interface EditingRecord {
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
  remark?: string;
}

function App() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setFileType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('entry');
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [recordId, setRecordId] = useState<number | null>(null);
  const [phoneErrors, setPhoneErrors] = useState({
    phone1: { error: "", isValid: false, isChecking: false, touched: false },
    phone2: { error: "", isValid: false, isChecking: false, touched: false }
  });
  const [saveDisabled, setSaveDisabled] = useState(false);
  const phone1Ref = useRef<HTMLInputElement>(null);
  const phone2Ref = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    entryNo: "",
    entryDate: new Date().toISOString().split('T')[0],
    name: "",
    post: "",
    department: "",
    location: "",
    status: "notice_period",
    assignTo: "hr_team",
    phone1: "",
    phone2: "",
    experience: 0,
    currentSalary: 0,
    expectedSalary: 0,
    remark: "",
  });

  useEffect(() => {
    loadLatestRecord();
  }, []);

  const loadLatestRecord = async () => {
    try {
      const response = await fetch(API_URL.resourcesLatest);
      const data = await response.json();
      if (data.empty) {
        handleNewRecord();
      } else {
        setFormData({
          entryNo: String(data.entryNo || ""),
          entryDate: data.datez ? data.datez.split('T')[0] : new Date().toISOString().split('T')[0],
          name: data.name || "",
          post: data.post || "",
          department: data.department || "",
          location: data.location || "",
          status: "notice_period",
          assignTo: "hr_team",
          phone1: data.phone1 || "",
          phone2: data.phone2 || "",
          experience: data.experience || 0,
          currentSalary: data.currentSalary || 0,
          expectedSalary: data.expectedSalary || 0,
          remark: data.remark || "",
        });
        setUploadedFilePath(data.docPath || null);
        if (data.docPath) {
          setPreviewUrl(API_URL.docPath(data.docPath));
          setFileType("application/pdf");
        }
        setIsEdit(true);
        setRecordId(data.slNo);
      }
    } catch (error) {
      console.error("Load latest error:", error);
      handleNewRecord();
    }
  };

  const handleNewRecord = async () => {
    setFormData({
      entryNo: "",
      entryDate: new Date().toISOString().split('T')[0],
      name: "",
      post: "",
      department: "",
      location: "",
      status: "notice_period",
      assignTo: "hr_team",
      phone1: "",
      phone2: "",
      experience: 0,
      currentSalary: 0,
      expectedSalary: 0,
      remark: "",
    });
    setUploadedFilePath(null);
    setPreviewUrl(null);
    setFileType(null);
    setIsEdit(false);
    setRecordId(null);
    setPhoneErrors({
      phone1: { error: "", isValid: false, isChecking: false, touched: false },
      phone2: { error: "", isValid: false, isChecking: false, touched: false }
    });
    setSaveDisabled(false);

    try {
      const response = await fetch(API_URL.resourcesNextEntry);
      const data = await response.json();
      setFormData(prev => ({ ...prev, entryNo: String(data.nextEntryNo) }));
    } catch (error) {
      console.error("Get next entry error:", error);
    }
  };

  const MAX_LENGTHS = {
    phone1: 10,
    phone2: 10,
    name: 30,
    post: 50,
    department: 30,
    location: 30,
    assignTo: 30,
    remark: 30,
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const maxLen = MAX_LENGTHS[name as keyof typeof MAX_LENGTHS];
    const trimmedValue = maxLen ? value.slice(0, maxLen) : value;
    setFormData({ ...formData, [name]: trimmedValue });
  };

  const checkPhoneDuplicate = async (phone: string, slNo?: number) => {
    try {
      const params = new URLSearchParams({ phone });
      if (slNo) params.append("slNo", slNo.toString());
      const response = await fetch(API_URL.checkPhone(phone, slNo));
      return await response.json();
    } catch (error) {
      console.error("Phone check error:", error);
      return { exists: false, valid: true };
    }
  };

  const handlePhone1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setFormData({ ...formData, phone1: value });
    setPhoneErrors(prev => ({
      ...prev,
      phone1: {
        ...prev.phone1,
        error: value.length > 0 && value.length !== 10 ? "Phone number must be exactly 10 digits" : "",
        isValid: value.length === 10
      }
    }));
    updateSaveDisabled(value.length === 10 ? (value.length === 10 && !phoneErrors.phone1.error) : false, formData.phone2);
  };

  const handlePhone2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setFormData({ ...formData, phone2: value });
    if (value.length > 0 && value.length !== 10) {
      setPhoneErrors(prev => ({
        ...prev,
        phone2: {
          ...prev.phone2,
          error: "Phone number must be exactly 10 digits",
          isValid: false
        }
      }));
    } else {
      setPhoneErrors(prev => ({
        ...prev,
        phone2: {
          ...prev.phone2,
          error: "",
          isValid: value.length === 10
        }
      }));
    }
    updateSaveDisabled(formData.phone1.length === 10, value);
  };

  const updateSaveDisabled = (phone1Valid: boolean, phone2Value: string) => {
    const phone2Valid = phone2Value === "" || (phone2Value.length === 10 && !phoneErrors.phone2.error);
    const hasPhone1Error = phoneErrors.phone1.error !== "";
    const hasPhone2Error = phoneErrors.phone2.error !== "";
    
    const shouldDisable = !phone1Valid || hasPhone1Error || (phone2Value !== "" && (!phone2Valid || hasPhone2Error));
    setSaveDisabled(shouldDisable);
  };

  const handlePhone1Blur = async () => {
    const phone = formData.phone1;
    if (!phone) return;
    
    if (phone.length !== 10) {
      setPhoneErrors(prev => ({ ...prev, phone1: { ...prev.phone1, error: "Phone number must be exactly 10 digits", touched: true } }));
      setSaveDisabled(true);
      return;
    }
    
    setPhoneErrors(prev => ({ ...prev, phone1: { ...prev.phone1, isChecking: true, touched: true } }));
    
    const result = await checkPhoneDuplicate(phone, isEdit ? recordId || undefined : undefined);
    
    if (result.exists) {
      setPhoneErrors(prev => ({
        ...prev,
        phone1: {
          error: `Phone already exists (Name: ${result.record.NAME})`,
          isValid: false,
          isChecking: false,
          touched: true
        }
      }));
      setSaveDisabled(true);
      setTimeout(() => phone1Ref.current?.focus(), 0);
    } else {
      setPhoneErrors(prev => ({
        ...prev,
        phone1: { error: "", isValid: true, isChecking: false, touched: true }
      }));
      updateSaveDisabled(true, formData.phone2);
    }
  };

  const handlePhone2Blur = async () => {
    const phone = formData.phone2;
    if (!phone) {
      setPhoneErrors(prev => ({ ...prev, phone2: { error: "", isValid: true, isChecking: false, touched: false } }));
      updateSaveDisabled(formData.phone1.length === 10, "");
      return;
    }
    
    if (phone.length !== 10) {
      setPhoneErrors(prev => ({ ...prev, phone2: { ...prev.phone2, error: "Phone number must be exactly 10 digits", touched: true } }));
      setSaveDisabled(true);
      return;
    }
    
    setPhoneErrors(prev => ({ ...prev, phone2: { ...prev.phone2, isChecking: true, touched: true } }));
    
    const result = await checkPhoneDuplicate(phone, isEdit ? recordId || undefined : undefined);
    
    if (result.exists) {
      setPhoneErrors(prev => ({
        ...prev,
        phone2: {
          error: `Phone already exists (Name: ${result.record.NAME})`,
          isValid: false,
          isChecking: false,
          touched: true
        }
      }));
      setSaveDisabled(true);
      setTimeout(() => phone2Ref.current?.focus(), 0);
    } else {
      setPhoneErrors(prev => ({
        ...prev,
        phone2: { error: "", isValid: true, isChecking: false, touched: true }
      }));
      updateSaveDisabled(formData.phone1.length === 10, phone);
    }
  };

  const isFormValid = () => {
    if (!formData.phone1 || formData.phone1.length !== 10) return false;
    if (phoneErrors.phone1.error) return false;
    if (formData.phone2 && (formData.phone2.length !== 10 || phoneErrors.phone2.error)) return false;
    return true;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPreviewUrl(base64String);
      setFileType(file.type);
    };
    reader.readAsDataURL(file);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const response = await fetch(API_URL.resourcesUpload, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();
      if (data.success) {
        setUploadedFilePath(data.docPath);
        console.log("File uploaded to:", data.docPath);
      }
    } catch (error) {
      console.error("Upload error:", error);
    }

    const parseFd = new FormData();
    parseFd.append("cv", file);

    try {
      const parseResponse = await fetch(API_URL.parseCV, {
        method: "POST",
        body: parseFd,
      });
      const data = await parseResponse.json();
      if (data.error) {
        console.error("Parse CV error:", data.error);
        alert("Failed to parse CV: " + data.error);
      } else {
        setFormData((prev) => ({
          ...prev,
          name: data.name || "",
          phone1: data.phone || "",
          post: data.post || "",
          department: data.department || "",
          location: data.location || "",
          remark: data.skills ? data.skills.join(", ") : "",
        }));
      }
    } catch (error) {
      console.error("Parse error:", error);
    }
    setLoading(false);
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      setFileType(file.type);
    };
    reader.readAsDataURL(file);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const response = await fetch(API_URL.resourcesUpload, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();
      if (data.success) {
        setUploadedFilePath(data.docPath);
        alert("CV uploaded successfully!");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload CV");
    }
  };

  const handleSubmit = async () => {
    if (!formData.phone1 || formData.phone1.length !== 10) {
      alert("Please enter a valid 10-digit phone number");
      phone1Ref.current?.focus();
      return;
    }
    
    if (phoneErrors.phone1.error) {
      alert("Please fix phone number errors");
      phone1Ref.current?.focus();
      return;
    }
    
    if (formData.phone2 && (phoneErrors.phone2.error || formData.phone2.length !== 10)) {
      alert("Please fix alternate phone number errors");
      phone2Ref.current?.focus();
      return;
    }
    
    try {
      if (isEdit && recordId) {
        const response = await fetch(API_URL.resourcesById(recordId), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            phone1: formData.phone1,
            phone2: formData.phone2,
            post: formData.post,
            department: formData.department,
            location: formData.location,
            docPath: uploadedFilePath,
            experience: formData.experience,
            currentSalary: formData.currentSalary,
            expectedSalary: formData.expectedSalary,
            remark: formData.remark,
          }),
        });
        const result = await response.json();
        if (result.success) {
          alert("Record updated successfully!");
          const refreshResponse = await fetch(API_URL.resourcesById(recordId));
          const refreshedData = await refreshResponse.json();
          setFormData({
            entryNo: String(refreshedData.entryNo || ""),
            entryDate: refreshedData.datez ? refreshedData.datez.split('T')[0] : new Date().toISOString().split('T')[0],
            name: refreshedData.name || "",
            post: refreshedData.post || "",
            department: refreshedData.department || "",
            location: refreshedData.location || "",
            status: "notice_period",
            assignTo: "hr_team",
            phone1: refreshedData.phone1 || "",
            phone2: refreshedData.phone2 || "",
            experience: refreshedData.experience || 0,
            currentSalary: refreshedData.currentSalary || 0,
            expectedSalary: refreshedData.expectedSalary || 0,
            remark: refreshedData.remark || "",
          });
          setUploadedFilePath(refreshedData.docPath || null);
          if (refreshedData.docPath) {
            setPreviewUrl(API_URL.docPath(refreshedData.docPath));
            setFileType("application/pdf");
          }
        } else {
          alert("Update failed: " + result.error);
        }
      } else {
        const response = await fetch(API_URL.resources, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            entryDate: formData.entryDate,
            docPath: uploadedFilePath,
          }),
        });
        const result = await response.json();
        if (result.success) {
          alert(`Record saved successfully! Entry No: ${result.record.entryNo}`);
          if (result.record) {
            setFormData({
              entryNo: String(result.record.entryNo),
              entryDate: result.record.datez ? result.record.datez.split('T')[0] : new Date().toISOString().split('T')[0],
              name: result.record.name || "",
              post: result.record.post || "",
              department: result.record.department || "",
              location: result.record.location || "",
              status: "notice_period",
              assignTo: "hr_team",
              phone1: result.record.phone1 || "",
              phone2: result.record.phone2 || "",
              experience: result.record.experience || 0,
              currentSalary: result.record.currentSalary || 0,
              expectedSalary: result.record.expectedSalary || 0,
              remark: result.record.remark || "",
            });
            setUploadedFilePath(result.record.docPath || null);
            if (result.record.docPath) {
              setPreviewUrl(API_URL.docPath(result.record.docPath));
              setFileType("application/pdf");
            }
            setIsEdit(true);
            setRecordId(result.record.slNo);
          }
        } else {
          alert("Insert failed: " + result.error);
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("Server error");
    }
  };

  const handleCancelEdit = () => {
    loadLatestRecord();
  };

  const handleTabChange = (newTab: TabType) => {
    if (activeTab === 'entry' && isEdit && newTab === 'search') {
      if (!confirm("Leave edit mode? Unsaved changes will be lost.")) {
        return;
      }
      handleCancelEdit();
    }
    setActiveTab(newTab);
  };

  const handleRecordSelect = async (record: EditingRecord) => {
    try {
      const response = await fetch(API_URL.resourcesById(record.slNo));
      const data = await response.json();
      setFormData({
        entryNo: String(data.entryNo || ""),
        entryDate: data.datez ? data.datez.split('T')[0] : new Date().toISOString().split('T')[0],
        name: data.name || "",
        post: data.post || "",
        department: data.department || "",
        location: data.location || "",
        status: "notice_period",
        assignTo: "hr_team",
        phone1: data.phone1 || "",
        phone2: data.phone2 || "",
        experience: data.experience || 0,
        currentSalary: data.currentSalary || 0,
        expectedSalary: data.expectedSalary || 0,
        remark: data.remark || "",
      });
      setUploadedFilePath(data.docPath || null);
      if (data.docPath) {
        setPreviewUrl(API_URL.docPath(data.docPath));
        setFileType("application/pdf");
      }
      setIsEdit(true);
      setRecordId(data.slNo);
      setActiveTab('entry' as TabType);
      setPhoneErrors({
        phone1: { error: "", isValid: false, isChecking: false, touched: false },
        phone2: { error: "", isValid: false, isChecking: false, touched: false }
      });
    } catch (error) {
      console.error("Error loading record:", error);
    }
  };

  return (
    <div
      className="h-screen w-full relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #020617 0%, #0b1120 50%, #111827 100%)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.6) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl animate-pulse"
          style={{
            background: "radial-gradient(circle, rgba(6,182,212,0.6) 0%, transparent 70%)",
            animationDelay: "1s",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full opacity-15 blur-3xl animate-pulse"
          style={{
            background: "radial-gradient(circle, rgba(20,184,166,0.5) 0%, transparent 70%)",
            animationDelay: "2s",
          }}
        />
      </div>

      <div className="relative z-10 h-screen flex flex-col">
        {/* TOP HEADER - Minimal */}
        <header className="flex-none px-3 py-2 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              
              
            </div>
            {/* <span className="text-base font-semibold text-white">RESUME MANAGEMENT</span> */}
             {/* Spacer */}
          </div>
        </header>

        <main className="flex-1 p-2 overflow-hidden">
          {activeTab === 'entry' && (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 h-full">
              
              {/* LEFT FORM SECTION - 40% */}
              <div className="xl:col-span-2 h-full overflow-hidden">
                <div className="h-full overflow-y-auto custom-scroll pr-2">
                  <GlassCard className="p-3" hover={false}>
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-white">Entry</span>
                        {isEdit && recordId && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            #{recordId}
                          </span>
                        )}
                      </div>
                      <span className="text-base font-semibold text-white">RESUME MANAGEMENT</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleNewRecord}
                          className="px-2 py-1 text-xs rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 transition-all flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          
                          New
                        </button>
                        
                        <button
                onClick={() => handleTabChange('search')}
                className={`px-1 py-1 text-sm font-semibold rounded-lg transition-all ${
String(activeTab) === 'search'
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50'
                    : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                }`}
              >
                Search
              </button>
                        {/* <button
                onClick={() => {
                  if (activeTab === 'search' && isEdit) {
                    if (!confirm("Leave edit mode? Unsaved changes will be lost.")) return;
                  }
                  handleTabChange('entry');
                }}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'entry'
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50'
                    : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                }`}
              >
                + Entry
              </button> */}
                        <button
                          onClick={handleSubmit}
                          disabled={saveDisabled || !isFormValid()}
                          className={`px-2 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1 ${
                            saveDisabled || !isFormValid()
                              ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                              : isEdit
                                ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400'
                                : 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400'
                          }`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save
                        </button>
                        {isEdit && (
                          <button
                            onClick={loadLatestRecord}
                            className="px-2 py-1 text-xs rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Row 1: Entry No + Entry Date */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Entry No</label>
                        <input
                          type="text"
                          name="entryNo"
                          value={formData.entryNo}
                          onChange={handleChange}
                          disabled
                          className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/20 text-cyan-400 outline-none disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Entry Date</label>
                        <input
                          type="date"
                          name="entryDate"
                          value={formData.entryDate}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white outline-none focus:border-cyan-400/60 transition-all"
                        />
                      </div>
                    </div>

                    {/* Row 2: Phone1 + Experience */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Phone 1 <span className="text-red-400">*</span>
                        </label>
                        <input
                          ref={phone1Ref}
                          type="text"
                          name="phone1"
                          placeholder="10 digit phone"
                          value={formData.phone1}
                          onChange={handlePhone1Change}
                          onBlur={handlePhone1Blur}
                          maxLength={10}
                          className={`w-full px-3 py-2 text-sm rounded-lg bg-white/10 border text-white placeholder-white/40 outline-none transition-all ${
                            phoneErrors.phone1.error
                              ? 'border-red-500 focus:border-red-400'
                              : phoneErrors.phone1.touched && phoneErrors.phone1.isValid
                                ? 'border-green-400'
                                : 'border-white/20 focus:border-cyan-400/60'
                          }`}
                        />
                        {phoneErrors.phone1.isChecking && (
                          <span className="text-xs text-gray-400 mt-1">Checking...</span>
                        )}
                        {phoneErrors.phone1.error && (
                          <p className="text-xs text-red-400 mt-1">{phoneErrors.phone1.error}</p>
                        )}
                        {phoneErrors.phone1.touched && phoneErrors.phone1.isValid && !phoneErrors.phone1.error && (
                          <p className="text-xs text-green-400 mt-1">Valid</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Experience</label>
                        <input
                          type="number"
                          name="experience"
                          placeholder="Years"
                          value={formData.experience}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60 transition-all"
                        />
                      </div>
                    </div>

                    {/* Row 3: Phone2 + Current Salary */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Phone 2 (Optional)</label>
                        <input
                          ref={phone2Ref}
                          type="text"
                          name="phone2"
                          placeholder="10 digit phone (optional)"
                          value={formData.phone2}
                          onChange={handlePhone2Change}
                          onBlur={handlePhone2Blur}
                          maxLength={10}
                          className={`w-full px-3 py-2 text-sm rounded-lg bg-white/10 border text-white placeholder-white/40 outline-none transition-all ${
                            phoneErrors.phone2.error
                              ? 'border-red-500 focus:border-red-400'
                              : phoneErrors.phone2.touched && phoneErrors.phone2.isValid
                                ? 'border-green-400'
                                : 'border-white/20 focus:border-cyan-400/60'
                          }`}
                        />
                        {phoneErrors.phone2.isChecking && (
                          <span className="text-xs text-gray-400 mt-1">Checking...</span>
                        )}
                        {phoneErrors.phone2.error && (
                          <p className="text-xs text-red-400 mt-1">{phoneErrors.phone2.error}</p>
                        )}
                        {phoneErrors.phone2.touched && phoneErrors.phone2.isValid && !phoneErrors.phone2.error && (
                          <p className="text-xs text-green-400 mt-1">Valid</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Current Salary</label>
                        <input
                          type="number"
                          name="currentSalary"
                          placeholder="Current"
                          value={formData.currentSalary}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60 transition-all"
                        />
                      </div>
                    </div>

                    {/* Row 4: Name + Expected Salary */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Name</label>
                        <input
                          type="text"
                          name="name"
                          placeholder="Candidate name"
                          value={formData.name}
                          onChange={handleChange}
                          maxLength={30}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Expected Salary</label>
                        <input
                          type="number"
                          name="expectedSalary"
                          placeholder="Expected"
                          value={formData.expectedSalary}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60 transition-all"
                        />
                      </div>
                    </div>

                    {/* Row 5: Post + Department */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Post</label>
                        <input
                          type="text"
                          name="post"
                          placeholder="Enter post"
                          value={formData.post}
                          onChange={handleChange}
                          maxLength={50}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Department</label>
                        <input
                          type="text"
                          name="department"
                          placeholder="Enter department"
                          value={formData.department}
                          onChange={handleChange}
                          maxLength={30}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60 transition-all"
                        />
                      </div>
                    </div>

                    {/* Row 6: Location */}
                    <div className="mb-3">
                      <label className="block text-xs text-gray-400 mb-1">Location</label>
                      <input
                        type="text"
                        name="location"
                        placeholder="Enter location"
                        value={formData.location}
                        onChange={handleChange}
                        maxLength={30}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60 transition-all"
                      />
                    </div>

                    {/* Row 7: Current Status + Assign To */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Current Status</label>
                        <input
                          type="text"
                          name="status"
                          placeholder="Enter status"
                          value={formData.status || ""}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Assign To</label>
                        <input
                          type="text"
                          name="assignTo"
                          placeholder="Assign to"
                          value={formData.assignTo || ""}
                          onChange={handleChange}
                          maxLength={30}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60 transition-all"
                        />
                      </div>
                    </div>

                    {/* Row 8: Remark */}
                    <div className="mb-3">
                      <label className="block text-xs text-gray-400 mb-1">Remark</label>
                      <textarea
                        name="remark"
                        rows={2}
                        placeholder="Add remarks..."
                        value={formData.remark}
                        onChange={handleChange}
                        maxLength={30}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60 transition-all resize-none"
                      />
                    </div>

                    {/* Row 9: Attach Document */}
                    <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                      <label className="block text-xs text-gray-400 mb-2">Attach Document (PDF/DOC)</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <input
                            type="file"
                            id="file-upload"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="file-upload"
                            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 cursor-pointer transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            AI Extract
                          </label>
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            id="manual-upload"
                            accept=".pdf,.doc,.docx"
                            onChange={handleManualUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="manual-upload"
                            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 cursor-pointer transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Browse CV
                          </label>
                        </div>
                        {loading && (
                          <span className="text-xs text-cyan-400 animate-pulse">Processing...</span>
                        )}
                      </div>
                      {uploadedFilePath && (
                        <p className="mt-2 text-xs text-green-400 truncate">
                          ✓ Saved: {uploadedFilePath}
                        </p>
                      )}
                    </div>
                  </GlassCard>
                </div>
              </div>
              <div className="xl:col-span-3">
                <div className="h-full rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 overflow-hidden">
                  {previewUrl ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full"
                      title="PDF Preview"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-gray-500 p-8">
                        <div className="relative mb-6">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full blur-xl" />
                          <svg className="relative w-20 h-20 mx-auto text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium mb-2 text-white/40">No document uploaded</p>
                        <p className="text-sm text-white/30">Upload a PDF or image to see preview</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <SearchView onRecordDoubleClick={handleRecordSelect} />
          )}
        </main>
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <GlassCard className="p-8 max-w-sm mx-4">
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin" />
              </div>
              <p className="text-white font-medium mb-2">AI is analyzing the resume...</p>
              <p className="text-sm text-white/60">Please wait</p>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default App;