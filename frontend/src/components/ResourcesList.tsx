import { useState, useEffect, useCallback } from 'react';
import { GlassCard, GlassSelect } from './index';
import { API_URL } from '../utils/api';

interface Resource {
  slNo: number;
  entryNo: string;
  datez: string;
  phone1: string;
  phone2: string;
  name: string;
  post: string;
  department: string;
  location: string;
}

interface ResourcesListProps {
  refreshTrigger?: number;
}

export function ResourcesList({ refreshTrigger }: ResourcesListProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [departments, setDepartments] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch(API_URL.departments);
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }, []);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedDepartment) params.append('department', selectedDepartment);

      console.log('🔍 Fetching from:', `${API_URL.resources}?${params}`);

      const response = await fetch(`${API_URL.resources}?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ API Response:', data);
        setResources(Array.isArray(data) ? data : []);
      } else {
        console.error('❌ API Error:', data);
        setResources([]);
      }
    } catch (error) {
      console.error('❌ Fetch Error:', error);
      setResources([]);
    }
    setLoading(false);
  }, [searchQuery, selectedDepartment]);

  const testAPI = async () => {
    console.log('🧪 Testing API...');
    try {
      const response = await fetch(`${API_URL.base}/api/test`);
      const data = await response.json();
      console.log('🧪 Test Result:', data);
      alert(`API Test: ${data.success ? '✅ Connected!' : '❌ Failed'}\nRecords: ${data.count}`);
    } catch (error) {
      console.error('❌ Test failed:', error);
      alert('❌ Cannot connect to API');
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchResources();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedDepartment, fetchResources, refreshTrigger]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const departmentOptions = [
    { value: '', label: 'All Departments' },
    ...departments.map(d => ({ value: d.name, label: d.name }))
  ];

  const handleClear = () => {
    setSearchQuery('');
    setSelectedDepartment('');
  };

  return (
    <GlassCard className="p-6" hover={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Resources Database</h2>
            <p className="text-sm text-gray-400 mt-1">
              {resources.length} record{resources.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={testAPI}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-all duration-300"
            >
              Test API
            </button>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px] relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              {loading ? (
                <svg className="w-5 h-5 text-cyan-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full pl-12 pr-12 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/40 outline-none transition-all duration-300 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/30 focus:shadow-[0_0_20px_rgba(6,182,212,0.3)] focus:bg-white/15 hover:border-white/30"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200"
              >
                <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="w-48">
            <GlassSelect
              label="Department"
              options={departmentOptions}
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            />
          </div>

          {(searchQuery || selectedDepartment) && (
            <button
              onClick={handleClear}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-all duration-300"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-gradient-to-r from-white/5 to-white/[0.02] border-b border-white/10">
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Sl No</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Post</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Department</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-4" />
                      <p className="text-sm text-gray-400">Loading resources...</p>
                    </div>
                  </td>
                </tr>
              ) : resources.length > 0 ? (
                resources.map((resource, index) => (
                  <tr
                    key={resource.slNo || index}
                    className="hover:bg-white/[0.02] transition-colors duration-200"
                  >
                    <td className="px-4 py-3.5 text-sm text-cyan-400 font-mono">{resource.entryNo || '-'}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-white">{resource.name || '-'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm text-gray-300">
                        <p>{resource.phone1 || '-'}</p>
                        {resource.phone2 && resource.phone2 !== resource.phone1 && (
                          <p className="text-xs text-gray-500">{resource.phone2}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-300">{resource.post || '-'}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-white/10 text-gray-300 border border-white/20">
                        {resource.department || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-400 max-w-[200px] truncate">{resource.location || '-'}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-400">{formatDate(resource.datez)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <svg className="w-14 h-14 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-base font-medium mb-1">No records found</p>
                      <p className="text-sm text-gray-500">
                        {searchQuery || selectedDepartment 
                          ? 'Try adjusting your search criteria' 
                          : 'No resources in the database yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </GlassCard>
  );
}
