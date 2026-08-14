import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  FileText,
  MagnifyingGlass,
  PencilSimple,
} from '@phosphor-icons/react';
import { Button, EmptyState, Field, Input, PageHeader, Panel, Select, Skeleton, StatusBadge } from './index';
import { API_URL, apiFetch } from '../utils/api';
import { getToken } from '../utils/auth';

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
  remark?: string;
  status?: string;
}

interface SearchViewProps {
  onRecordDoubleClick?: (record: CandidateRecord) => void;
  onBack?: () => void;
}

const EMPTY_FILTERS = {
  name: '',
  phone1: '',
  phone2: '',
  post: '',
  department: '',
  location: '',
  status: '',
};

const LIST_MIN_WIDTH = 280;
const LIST_MAX_WIDTH = 640;
const LIST_DEFAULT_WIDTH = 384;
const LIST_WIDTH_KEY = 'search-list-width';

const formatSalary = (value?: number) => {
  if (!value || value === 0) return '';
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export function SearchView({ onRecordDoubleClick, onBack }: SearchViewProps) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [records, setRecords] = useState<CandidateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CandidateRecord | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [listWidth, setListWidth] = useState<number>(() => {
    const saved = Number(window.localStorage.getItem(LIST_WIDTH_KEY));
    return saved >= LIST_MIN_WIDTH && saved <= LIST_MAX_WIDTH ? saved : LIST_DEFAULT_WIDTH;
  });
  const [isXl, setIsXl] = useState(() => window.matchMedia('(min-width: 1280px)').matches);

  const listScrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const onChange = (e: MediaQueryListEvent) => setIsXl(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LIST_WIDTH_KEY, String(listWidth));
  }, [listWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing.current || !gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      setListWidth(Math.min(LIST_MAX_WIDTH, Math.max(LIST_MIN_WIDTH, e.clientX - rect.left)));
    };
    const onUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startResize = (e: React.MouseEvent) => {
    if (!isXl) return;
    isResizing.current = true;
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const resetListWidth = () => setListWidth(LIST_DEFAULT_WIDTH);

  useEffect(() => {
    fetchDepartments();
    fetchRecords(1, { resetSelection: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await apiFetch(API_URL.departments);
      const data = await response.json();
      setDepartments(data.map((d: { name: string }) => d.name));
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchRecords = useCallback(async (pageNum: number, options?: { resetSelection?: boolean }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', '10');

      if (filters.name) params.append('name', filters.name);
      if (filters.phone1) params.append('phone1', filters.phone1);
      if (filters.phone2) params.append('phone2', filters.phone2);
      if (filters.post) params.append('post', filters.post);
      if (filters.department) params.append('department', filters.department);
      if (filters.location) params.append('location', filters.location);
      if (filters.status) params.append('status', filters.status);

      const response = await apiFetch(`${API_URL.resourcesSearch}?${params}`);
      const data = await response.json();

      setRecords(data.records || []);
      setTotalRecords(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || 1);
      setHasSearched(true);

      if (options?.resetSelection) {
        setSelectedRecord(data.records?.[0] ?? null);
      } else if (data.records?.length > 0 && !selectedRecord) {
        setSelectedRecord(data.records[0]);
      }

      listScrollRef.current?.scrollTo({ top: 0 });
    } catch (error) {
      console.error('Search error:', error);
      setRecords([]);
    }
    setLoading(false);
  }, [filters, selectedRecord]);

  const handleSearch = () => {
    fetchRecords(1, { resetSelection: true });
  };

  const handleClearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setSelectedRecord(null);
    fetchRecords(1, { resetSelection: true });
  }, [fetchRecords]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleCardClick = (record: CandidateRecord) => {
    setSelectedRecord(record);
  };

  const handleCardDoubleClick = useCallback((record: CandidateRecord) => {
    setSelectedRecord(record);
    if (onRecordDoubleClick) {
      onRecordDoubleClick(record);
    }
  }, [onRecordDoubleClick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;

      if (e.key === '/') {
        e.preventDefault();
        setShowFilters(true);
        window.setTimeout(() => document.getElementById('filter-name')?.focus(), 0);
        return;
      }

      if (e.key === 'Escape') {
        handleClearFilters();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (records.length === 0) return;
        e.preventDefault();
        const currentIndex = records.findIndex((r) => r.slNo === selectedRecord?.slNo);
        const targetIndex =
          currentIndex === -1
            ? e.key === 'ArrowDown'
              ? 0
              : records.length - 1
            : e.key === 'ArrowDown'
              ? Math.min(records.length - 1, currentIndex + 1)
              : Math.max(0, currentIndex - 1);
        const record = records[targetIndex];
        if (record) {
          setSelectedRecord(record);
          listScrollRef.current
            ?.querySelector(`[data-slno="${record.slNo}"]`)
            ?.scrollIntoView({ block: 'nearest' });
        }
        return;
      }

      if (e.key === 'Enter') {
        if (tag === 'BUTTON' || tag === 'A') return;
        if (selectedRecord) {
          e.preventDefault();
          handleCardDoubleClick(selectedRecord);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [records, selectedRecord, onRecordDoubleClick, handleClearFilters, handleCardDoubleClick]);

  const handlePrevPage = () => {
    if (page > 1) {
      fetchRecords(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      fetchRecords(page + 1);
    }
  };

  const selectedDocUrl = selectedRecord?.docPath ? API_URL.docUrl(selectedRecord.docPath, getToken()) : null;
  const previewSrc =
    selectedDocUrl && selectedRecord?.docPath?.toLowerCase().endsWith('.pdf')
      ? `${selectedDocUrl}#page=1&view=Fit`
      : selectedDocUrl;

  const activeFilterCount = Object.values(filters).filter((value) => value.trim() !== '').length;

  const previewMeta: { label: string; value: string; mono?: boolean }[] = [];
  if (selectedRecord?.entryNo) previewMeta.push({ label: 'Entry', value: selectedRecord.entryNo, mono: true });
  if (selectedRecord?.datez) previewMeta.push({ label: 'Date', value: formatDate(selectedRecord.datez) });
  if (selectedRecord?.experience) previewMeta.push({ label: 'Experience', value: `${selectedRecord.experience} yrs` });
  if (selectedRecord?.location) previewMeta.push({ label: 'Location', value: selectedRecord.location });
  const cur = formatSalary(selectedRecord?.currentSalary);
  const exp = formatSalary(selectedRecord?.expectedSalary);
  const salaryLabel = cur && exp ? `${cur} → ${exp}` : cur || exp;
  if (salaryLabel) previewMeta.push({ label: 'Salary', value: salaryLabel });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        title="Candidate Search"
        subtitle="Find candidates by name, phone, department, or status"
        onBack={onBack}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear
            </Button>
            <Button size="sm" icon={<MagnifyingGlass size={14} weight="bold" />} onClick={handleSearch}>
              Search
            </Button>
          </>
        }
      />

      {/* FILTERS */}
      <Panel className="shrink-0">
        <button
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          aria-controls="search-filters-panel"
          className="flex w-full items-center gap-2 px-4 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:focus-visible:ring-slate-400/60"
        >
          <CaretDown
            size={13}
            weight="bold"
            className={`text-slate-400 transition-transform duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none dark:text-slate-500 ${
              showFilters ? '' : '-rotate-90'
            }`}
          />
          <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">Filters</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-1.5 py-px text-xs font-medium text-blue-700 dark:border-slate-500/40 dark:bg-slate-500/20 dark:text-slate-300">
              {activeFilterCount} active
            </span>
          )}
          {!showFilters && (
            <span className="text-[13px] text-slate-400 dark:text-slate-500">Expand to refine your search</span>
          )}
        </button>
        <div
          id="search-filters-panel"
          inert={!showFilters}
          className={`grid transition-[grid-template-rows] duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
            showFilters ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className={`transition-[opacity,transform] duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                showFilters ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
              }`}
            >
              <div
                className="grid grid-cols-2 gap-3 border-t border-slate-100 px-4 pb-4 pt-3 md:grid-cols-3 xl:grid-cols-4 dark:border-slate-800"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              >
            <Field label="Name" htmlFor="filter-name">
              <Input
                id="filter-name"
                type="text"
                placeholder="Candidate name"
                autoComplete="off"
                value={filters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
              />
            </Field>
            <Field label="Phone 1" htmlFor="filter-phone1">
              <Input
                id="filter-phone1"
                type="text"
                placeholder="10-digit number"
                autoComplete="off"
                value={filters.phone1}
                onChange={(e) => handleFilterChange('phone1', e.target.value)}
                className="font-mono"
              />
            </Field>
            <Field label="Phone 2" htmlFor="filter-phone2">
              <Input
                id="filter-phone2"
                type="text"
                placeholder="10-digit number"
                autoComplete="off"
                value={filters.phone2}
                onChange={(e) => handleFilterChange('phone2', e.target.value)}
                className="font-mono"
              />
            </Field>
            <Field label="Post" htmlFor="filter-post">
              <Input
                id="filter-post"
                type="text"
                placeholder="Enter post"
                autoComplete="off"
                value={filters.post}
                onChange={(e) => handleFilterChange('post', e.target.value)}
              />
            </Field>
            <Field label="Department" htmlFor="filter-department">
              <Select
                id="filter-department"
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
              >
                <option value="">All departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </Select>
            </Field>
            <Field label="Location" htmlFor="filter-location">
              <Input
                id="filter-location"
                type="text"
                placeholder="Enter location"
                autoComplete="off"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
              />
            </Field>
            <Field label="Status" htmlFor="filter-status">
              <Input
                id="filter-status"
                type="text"
                placeholder="e.g. notice_period"
                autoComplete="off"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              />
            </Field>
            </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* RESULTS + PREVIEW */}
      <div
        ref={gridRef}
        className="relative grid min-h-0 flex-1 grid-cols-1 gap-3"
        style={isXl ? { gridTemplateColumns: `${listWidth}px minmax(0, 1fr)` } : undefined}
      >
        {isXl && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize candidate list"
            title="Drag to resize · double-click to reset"
            onMouseDown={startResize}
            onDoubleClick={resetListWidth}
            className="absolute inset-y-0 z-10 w-1.5 -translate-x-1/2 cursor-col-resize rounded-full transition-colors duration-150 hover:bg-blue-500/50 dark:hover:bg-slate-400/50"
            style={{ left: `calc(${listWidth}px + 8px)` }}
          />
        )}
        {/* LIST */}
        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Candidates</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">{totalRecords} results</span>
          </div>

          <div
            ref={listScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
          >
            {loading ? (
              <div className="space-y-2.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-2/5" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="mt-2.5 h-3 w-4/5" />
                    <Skeleton className="mt-3 h-3 w-3/5" />
                  </div>
                ))}
              </div>
            ) : records.length === 0 && hasSearched ? (
              <EmptyState
                icon={<MagnifyingGlass size={22} />}
                title="No candidates found"
                description="Try adjusting your filters."
              />
            ) : records.length === 0 ? (
              <EmptyState
                icon={<MagnifyingGlass size={22} />}
                title="Search candidates"
                description="Use the filters above to find candidates."
              />
            ) : (
              <div className="space-y-2">
                {records.map((record) => {
                  const selected = selectedRecord?.slNo === record.slNo;
                  return (
                    <div
                      key={record.slNo}
                      data-slno={record.slNo}
                      onClick={() => handleCardClick(record)}
                      onDoubleClick={() => handleCardDoubleClick(record)}
                      title="Double-click to edit"
                      className={`relative cursor-pointer rounded-lg border px-3.5 py-3 transition-colors duration-150 ${
                        selected
                          ? 'border-blue-500 bg-blue-50 dark:border-slate-400 dark:bg-slate-800'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800'
                      }`}
                    >
                      {selected && (
                        <span className="absolute inset-y-2.5 left-0 w-0.5 rounded-r-full bg-blue-600 dark:bg-slate-300" />
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {record.name || '—'}
                          </p>
                          <p className="mt-0.5 truncate text-[13px] text-slate-500 dark:text-slate-400">
                            {[record.post, record.department, record.location].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </div>
                        <StatusBadge status={record.status} />
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                        <div className="flex min-w-0 items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-300">
                          <span className="truncate">{record.phone1 || '—'}</span>
                          {record.phone2 && (
                            <span className="truncate text-slate-400 dark:text-slate-500">{record.phone2}</span>
                          )}
                        </div>
                        <div className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                          {formatSalary(record.currentSalary) && formatSalary(record.expectedSalary) ? (
                            <>
                              <span className="font-medium text-slate-600 dark:text-slate-300">
                                {formatSalary(record.currentSalary)}
                              </span>
                              <span className="mx-1 text-slate-300 dark:text-slate-600">→</span>
                              {formatSalary(record.expectedSalary)}
                            </>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">
                              {formatSalary(record.currentSalary) || formatSalary(record.expectedSalary) || '—'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex shrink-0 items-center justify-between border-t border-slate-200 px-3 py-2.5 dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                icon={<CaretLeft size={13} weight="bold" />}
                onClick={handlePrevPage}
                disabled={page === 1}
              >
                Prev
              </Button>
              <span className="text-[13px] text-slate-500 dark:text-slate-400">
                Page <span className="font-medium text-slate-700 dark:text-slate-200">{page}</span> of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleNextPage}
                disabled={page === totalPages}
              >
                Next
                <CaretRight size={13} weight="bold" />
              </Button>
            </div>
          )}
        </Panel>

        {/* PREVIEW */}
        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
            <div className="flex min-w-0 items-center gap-2.5">
              <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {selectedRecord?.name || 'Resume Preview'}
              </h3>
              {selectedRecord?.status && <StatusBadge status={selectedRecord.status} />}
            </div>
            {selectedRecord && previewMeta.length > 0 && (
              <div className="flex min-w-0 flex-1 items-center gap-x-2.5 overflow-x-auto whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                {previewMeta.map((item, index) => (
                  <span key={item.label} className="flex shrink-0 items-center gap-x-2">
                    {index > 0 && <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />}
                    <span className="text-slate-400 dark:text-slate-500">{item.label}</span>
                    <span className={`font-medium text-slate-700 dark:text-slate-200 ${item.mono ? 'font-mono text-xs' : ''}`}>
                      {item.value}
                    </span>
                  </span>
                ))}
              </div>
            )}
            <div className="flex shrink-0 items-center gap-2">
              {selectedDocUrl && (
                <a href={selectedDocUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm" icon={<FileText size={14} weight="bold" />}>
                    Open
                  </Button>
                </a>
              )}
              {selectedRecord && onRecordDoubleClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<PencilSimple size={14} weight="bold" />}
                  onClick={() => onRecordDoubleClick(selectedRecord)}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overscroll-contain bg-slate-100 p-3 dark:bg-slate-950">
            {selectedRecord?.docPath ? (
              <iframe
                key={selectedRecord.docPath}
                src={previewSrc ?? undefined}
                className="preview-fade h-full w-full rounded-lg border border-slate-200 bg-white shadow-panel dark:border-slate-800"
                title="Resume Preview"
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                <EmptyState
                  icon={<FileText size={22} />}
                  title={selectedRecord ? 'No resume attached' : 'No candidate selected'}
                  description={
                    selectedRecord
                      ? 'This candidate has no document uploaded.'
                      : 'Select a candidate from the list to preview their resume.'
                  }
                />
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
