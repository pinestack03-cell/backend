import { useEffect, useRef, useState } from 'react';
import {
  ArrowSquareOut,
  Check,
  CircleNotch,
  FilePdf,
  FileText,
  Plus,
  Sparkle,
  UploadSimple,
} from '@phosphor-icons/react';
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  Panel,
  PageHeader,
  SearchView,
  Textarea,
  Toaster,
  TopNav,
} from './components';
import { API_URL } from './utils/api';
import { toast } from './utils/toast';

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
    <section className="mt-6 border-t border-slate-100 pt-5 first:mt-0 first:border-t-0 first:pt-0">
      <h2 className="text-[13px] font-semibold text-slate-900">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      <div className={`${gridClass} mt-3`}>{children}</div>
    </section>
  );
}

const fileNameFromPath = (path: string) => path.split('/').pop() || path;

function App() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setFileType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('entry');
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [recordId, setRecordId] = useState<number | null>(null);
  const [pendingTab, setPendingTab] = useState<TabType | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        toast.error("Failed to parse CV: " + data.error);
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
        toast.success("CV uploaded successfully!");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload CV");
    }
  };

  const handleSubmit = async () => {
    if (!formData.phone1 || formData.phone1.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      phone1Ref.current?.focus();
      return;
    }

    if (phoneErrors.phone1.error) {
      toast.error("Please fix phone number errors");
      phone1Ref.current?.focus();
      return;
    }

    if (formData.phone2 && (phoneErrors.phone2.error || formData.phone2.length !== 10)) {
      toast.error("Please fix alternate phone number errors");
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
          toast.success("Record updated successfully!");
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
          toast.error("Update failed: " + result.error);
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
          toast.success(`Record saved successfully! Entry No: ${result.record.entryNo}`);
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
          toast.error("Insert failed: " + result.error);
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Server error");
    }
  };

  const handleCancelEdit = () => {
    loadLatestRecord();
  };

  const handleTabChange = (newTab: TabType) => {
    if (activeTab === 'entry' && isEdit && newTab === 'search') {
      setPendingTab(newTab);
      return;
    }
    setActiveTab(newTab);
  };

  const confirmLeaveEdit = () => {
    if (pendingTab) {
      handleCancelEdit();
      setActiveTab(pendingTab);
    }
    setPendingTab(null);
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

  const phone1Error = phoneErrors.phone1.error || null;
  const phone2Error = phoneErrors.phone2.error || null;
  const attachedFileName = uploadedFilePath ? fileNameFromPath(uploadedFilePath) : null;
  const serverDocUrl = uploadedFilePath ? API_URL.docPath(uploadedFilePath) : null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50">
      <TopNav
        tabs={[
          { id: 'entry', label: 'Entry' },
          { id: 'search', label: 'Search' },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => handleTabChange(id as TabType)}
      />

      <main className="flex min-h-0 flex-1 flex-col gap-4 px-6 pb-5 pt-5">
        {activeTab === 'entry' ? (
          <>
            <PageHeader
              title={isEdit ? 'Edit Entry' : 'New Entry'}
              subtitle={
                isEdit
                  ? `Entry ${formData.entryNo || '—'} · ${formData.entryDate || '—'}`
                  : 'Register a new candidate'
              }
              actions={
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus size={14} weight="bold" />}
                    onClick={handleNewRecord}
                  >
                    New
                  </Button>
                  {isEdit && (
                    <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  )}
                  <Button
                    size="sm"
                    icon={<Check size={14} weight="bold" />}
                    onClick={handleSubmit}
                    disabled={saveDisabled || !isFormValid()}
                  >
                    {isEdit ? 'Update' : 'Save'}
                  </Button>
                </>
              }
            />

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
              {/* FORM PANEL */}
              <Panel className="flex min-h-0 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
                  <FormSection title="Candidate Details">
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
                  </FormSection>

                  <FormSection title="Contact" hint="Phone 1 is required and checked for duplicates">
                    <Field
                      label="Phone 1"
                      htmlFor="phone1"
                      required
                      error={phone1Error}
                      hint={
                        phoneErrors.phone1.isChecking
                          ? 'Checking…'
                          : phoneErrors.phone1.touched && phoneErrors.phone1.isValid
                            ? 'Valid phone number'
                            : undefined
                      }
                    >
                      <Input
                        ref={phone1Ref}
                        id="phone1"
                        name="phone1"
                        placeholder="10-digit number"
                        value={formData.phone1}
                        onChange={handlePhone1Change}
                        onBlur={handlePhone1Blur}
                        maxLength={10}
                        inputMode="numeric"
                        autoComplete="off"
                        className="font-mono"
                        error={!!phone1Error}
                      />
                    </Field>
                    <Field
                      label="Phone 2 (Optional)"
                      htmlFor="phone2"
                      error={phone2Error}
                      hint={
                        phoneErrors.phone2.isChecking
                          ? 'Checking…'
                          : phoneErrors.phone2.touched && phoneErrors.phone2.isValid
                            ? 'Valid phone number'
                            : undefined
                      }
                    >
                      <Input
                        ref={phone2Ref}
                        id="phone2"
                        name="phone2"
                        placeholder="10-digit number (optional)"
                        value={formData.phone2}
                        onChange={handlePhone2Change}
                        onBlur={handlePhone2Blur}
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

                  <FormSection title="Tracking">
                    <Field label="Entry No" htmlFor="entryNo">
                      <Input
                        id="entryNo"
                        name="entryNo"
                        value={formData.entryNo}
                        onChange={handleChange}
                        disabled
                        className="font-mono"
                      />
                    </Field>
                    <Field label="Entry Date" htmlFor="entryDate">
                      <Input
                        id="entryDate"
                        type="date"
                        name="entryDate"
                        value={formData.entryDate}
                        onChange={handleChange}
                      />
                    </Field>
                    <Field label="Current Status" htmlFor="status">
                      <Input
                        id="status"
                        name="status"
                        placeholder="Enter status"
                        value={formData.status || ""}
                        onChange={handleChange}
                      />
                    </Field>
                    <Field label="Assigned To" htmlFor="assignTo">
                      <Input
                        id="assignTo"
                        name="assignTo"
                        placeholder="Assign to"
                        value={formData.assignTo || ""}
                        onChange={handleChange}
                        maxLength={30}
                      />
                    </Field>
                  </FormSection>

                  <FormSection title="Notes" gridClass="grid grid-cols-1 gap-4">
                    <Field label="Remark" htmlFor="remark">
                      <Textarea
                        id="remark"
                        name="remark"
                        rows={2}
                        placeholder="Add remarks…"
                        value={formData.remark}
                        onChange={handleChange}
                        maxLength={30}
                      />
                    </Field>
                  </FormSection>

                  <FormSection
                    title="Document"
                    hint="Upload a resume — AI Extract auto-fills the form"
                    gridClass="grid grid-cols-1 gap-4"
                  >
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="file"
                          id="file-upload"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="file-upload"
                          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                        >
                          <Sparkle size={14} weight="bold" className="text-blue-600" />
                          AI Extract
                        </label>
                        <input
                          type="file"
                          id="manual-upload"
                          accept=".pdf,.doc,.docx"
                          onChange={handleManualUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="manual-upload"
                          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                        >
                          <UploadSimple size={14} weight="bold" />
                          Browse CV
                        </label>
                        {loading && (
                          <span className="flex items-center gap-1.5 text-[13px] text-slate-500">
                            <CircleNotch size={14} className="animate-spin text-blue-600" />
                            Extracting details…
                          </span>
                        )}
                      </div>
                      {attachedFileName && (
                        <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                          <FilePdf size={15} className="shrink-0 text-emerald-600" />
                          <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">
                            {attachedFileName}
                          </span>
                          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700">
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
                <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-900">Resume Preview</h2>
                    <p className="truncate text-[13px] text-slate-500">
                      {attachedFileName ?? 'No document attached'}
                    </p>
                  </div>
                  {serverDocUrl && previewUrl && !previewUrl.startsWith('data:') && (
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
                <div className="min-h-0 flex-1 bg-slate-100 p-4">
                  {previewUrl ? (
                    <iframe
                      key={previewUrl}
                      src={previewUrl}
                      title="Resume preview"
                      className="preview-fade h-full w-full rounded-lg border border-slate-200 bg-white shadow-panel"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                          <FileText size={22} />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">No document uploaded</p>
                        <p className="mt-1 text-[13px] text-slate-500">
                          Upload a PDF or DOC to preview it here.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </>
        ) : (
          <SearchView
            onRecordDoubleClick={handleRecordSelect}
            onBack={() => handleTabChange('entry')}
          />
        )}
      </main>

      <Toaster />

      <ConfirmDialog
        open={pendingTab !== null}
        title="Discard changes?"
        message="You have unsaved changes in the entry form. Switching to Search will discard them."
        confirmLabel="Discard"
        onConfirm={confirmLeaveEdit}
        onCancel={() => setPendingTab(null)}
      />

      {loading && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-popover">
            <div className="flex items-center gap-3">
              <CircleNotch size={20} className="shrink-0 animate-spin text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Analyzing resume…</p>
                <p className="text-[13px] text-slate-500">Extracting candidate details</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
