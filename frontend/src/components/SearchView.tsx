import { useState, useEffect, useCallback } from 'react';
import { GlassCard } from './index';
import { API_URL } from '../utils/api';

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
}

export function SearchView({ onRecordDoubleClick }: SearchViewProps) {
  const [filters, setFilters] = useState({
    name: '',
    phone1: '',
    phone2: '',
    post: '',
    department: '',
    location: '',
    status: ''
  });
  const [records, setRecords] = useState<CandidateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CandidateRecord | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    fetchDepartments();
    fetchRecords(1);
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch(API_URL.departments);
      const data = await response.json();
      setDepartments(data.map((d: { name: string }) => d.name));
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchRecords = useCallback(async (pageNum: number) => {
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
      
      const response = await fetch(`${API_URL.resourcesSearch}?${params}`);
      const data = await response.json();
      
      setRecords(data.records || []);
      setTotalRecords(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || 1);
      setHasSearched(true);
      
      if (data.records?.length > 0 && !selectedRecord) {
        setSelectedRecord(data.records[0]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setRecords([]);
    }
    setLoading(false);
  }, [filters, selectedRecord]);

  const handleSearch = () => {
    fetchRecords(1);
  };

  const handleClearFilters = () => {
    setFilters({
      name: '',
      phone1: '',
      phone2: '',
      post: '',
      department: '',
      location: '',
      status: ''
    });
    setSelectedRecord(null);
    fetchRecords(1);
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleCardClick = (record: CandidateRecord) => {
    setSelectedRecord(record);
  };

  const handleCardDoubleClick = (record: CandidateRecord) => {
    setSelectedRecord(record);
    if (onRecordDoubleClick) {
      onRecordDoubleClick(record);
    }
  };

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

  const formatSalary = (value?: number) => {
    if (!value || value === 0) return '-';
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="h-full -mt-1">
      <GlassCard className="h-full p-2" hover={false}>
        <div className="flex flex-col h-full -mt-1">
          {/* FILTERS SECTION - Collapsible Header */}
          <div className="flex-shrink-0 pb-2 border-b border-white/10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <svg 
                    className={`w-4 h-4 text-white/70 transition-transform ${showFilters ? 'rotate-90' : ''}`} 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <h3 className="text-sm font-semibold text-white">Search</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSearch}
                  className="px-2 py-1 text-xs rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 transition-all flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search
                </button>
                <button
                  onClick={handleClearFilters}
                  className="px-2 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 transition-all"
                >
                  Clear
                </button>
              </div>
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={filters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60"
                />
                <input
                  type="text"
                  placeholder="Phone 1"
                  value={filters.phone1}
                  onChange={(e) => handleFilterChange('phone1', e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60"
                />
                <input
                  type="text"
                  placeholder="Phone 2"
                  value={filters.phone2}
                  onChange={(e) => handleFilterChange('phone2', e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60"
                />
                <input
                  type="text"
                  placeholder="Post"
                  value={filters.post}
                  onChange={(e) => handleFilterChange('post', e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60"
                />
                <select
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg bg-white/10 border border-white/20 text-white outline-none focus:border-cyan-400/60"
                >
                  <option value="" className="bg-gray-800">Dept</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept} className="bg-gray-800">{dept}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Location"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60"
                />
                <input
                  type="text"
                  placeholder="Status"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-cyan-400/60"
                />
                <div className="text-xs text-gray-400 flex items-center px-2">
                  {totalRecords} records
                </div>
              </div>
            )}
          </div>

          {/* MAIN CONTENT */}
          <div className="flex flex-1 gap-3 overflow-hidden">
            {/* LEFT SIDE - CARD LIST (40%) */}
            <div className="w-[40%] h-full flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto pr-2 custom-scroll">
                <div className="flex flex-col gap-2">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-2" />
                        <p className="text-xs text-gray-400">Loading...</p>
                      </div>
                    </div>
                  ) : records.length === 0 && hasSearched ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-center text-gray-400">
                        <p className="text-sm font-medium mb-1">No records found</p>
                        <p className="text-xs text-gray-500">Try adjusting your filters</p>
                      </div>
                    </div>
                  ) : records.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-center text-gray-400">
                        <p className="text-sm font-medium mb-1 text-white/70">Search Resources</p>
                        <p className="text-xs text-gray-500">Use filters above to search</p>
                      </div>
                    </div>
                  ) : (
                    records.map((record) => (
                      <div
                        key={record.slNo}
                        onClick={() => handleCardClick(record)}
                        onDoubleClick={() => handleCardDoubleClick(record)}
                        className={`p-3 rounded-lg bg-white/10 backdrop-blur-xl border transition-all cursor-pointer hover:bg-white/15 ${
                          selectedRecord?.slNo === record.slNo
                            ? 'border-blue-400 bg-blue-500/10'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-base font-semibold text-white">{record.name || '-'}</h4>
                            <p className="text-sm text-cyan-400">Entry: {record.entryNo}</p>
                          </div>
                          {record.status && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                              {record.status}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
                          <div><span className="text-gray-500">P1:</span> {record.phone1 || '-'}</div>
                          <div><span className="text-gray-500">P2:</span> {record.phone2 || '-'}</div>
                          <div><span className="text-gray-500">Post:</span> {record.post || '-'}</div>
                          <div><span className="text-gray-500">Dept:</span> {record.department || '-'}</div>
                          <div><span className="text-gray-500">Loc:</span> {record.location || '-'}</div>
                          <div><span className="text-gray-500">Exp:</span> {record.experience || 0}yr</div>
                          <div><span className="text-gray-500">Cur:</span> ₹{formatSalary(record.currentSalary)}</div>
                          <div><span className="text-gray-500">Exp:</span> ₹{formatSalary(record.expectedSalary)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {/* PAGINATION - Below cards */}
              {totalPages > 1 && (
                <div className="flex-shrink-0 flex items-center justify-between pt-2 mt-2 border-t border-white/10">
                  <button
                    onClick={handlePrevPage}
                    disabled={page === 1}
                    className={`px-2 py-1 text-xs rounded border transition-all flex items-center gap-1 ${
                      page === 1
                        ? 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Prev
                  </button>
                  <span className="text-xs text-gray-400">
                    {page}/{totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={page === totalPages}
                    className={`px-2 py-1 text-xs rounded border transition-all flex items-center gap-1 ${
                      page === totalPages
                        ? 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  >
                    Next
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT SIDE - RESUME VIEWER (60%) */}
            <div className="w-[60%] flex flex-col">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">Resume Preview</h3>
                {selectedRecord?.docPath ? (
                  <span className="ml-auto text-xs text-green-400">✓ Document attached</span>
                ) : (
                  <span className="ml-auto text-xs text-gray-500">No document</span>
                )}
              </div>
              
              <div className="flex-1 rounded-lg bg-white/5 border border-white/20 overflow-hidden">
                {selectedRecord?.docPath ? (
                  <iframe
                    src={API_URL.docPath(selectedRecord.docPath)}
                    className="w-full h-full min-h-[400px]"
                    title="Resume Preview"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-gray-500 p-4">
                      <svg className="w-12 h-12 mx-auto mb-3 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {selectedRecord ? (
                        <p className="text-sm text-gray-400">No document attached to this record</p>
                      ) : (
                        <p className="text-sm text-gray-400">Select a record to preview resume</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
