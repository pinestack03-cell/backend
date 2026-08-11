import { GlassCard } from './index';

interface CandidateRecord {
  id: number;
  entryNo: string;
  name: string;
  mobile: string;
  post: string;
  department: string;
  location: string;
  status: string;
  entryDate: string;
}

interface RecordsListProps {
  records: CandidateRecord[];
  onRecordClick?: (record: CandidateRecord) => void;
}

const statusColors: Record<string, string> = {
  notice_period: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  interview_scheduled: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  offer_extended: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  joined: 'bg-green-500/20 text-green-300 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
  on_hold: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const formatStatus = (status: string) => {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function RecordsList({ records, onRecordClick }: RecordsListProps) {
  return (
    <GlassCard className="p-6" hover={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">All Records</h2>
            <p className="text-sm text-gray-400 mt-1">
              {records.length} total candidate{records.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-all duration-300">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter
              </span>
            </button>
            <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </span>
            </button>
          </div>
        </div>

        <div className="border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-white/5 to-white/[0.02] border-b border-white/10">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Entry No</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Post</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {records.length > 0 ? (
                  records.map((record, index) => (
                    <tr
                      key={record.id || index}
                      className="hover:bg-white/[0.02] transition-colors duration-200 cursor-pointer"
                      onClick={() => onRecordClick?.(record)}
                    >
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-cyan-400 font-mono">{record.entryNo}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-white">{record.name || '-'}</p>
                          <p className="text-xs text-gray-500">{record.mobile || '-'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-300">{record.post || '-'}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-300">{record.department || '-'}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-300">{record.location || '-'}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusColors[record.status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                          {formatStatus(record.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-400">{record.entryDate}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all duration-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all duration-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="relative mb-4">
                          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/[0.03] rounded-full blur-xl" />
                          <svg className="relative w-16 h-16 mx-auto text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium text-white/70 mb-1">No records yet</p>
                        <p className="text-sm text-gray-500">Start by adding a new candidate entry</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {records.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing <span className="text-white font-medium">1</span> to <span className="text-white font-medium">{records.length}</span> of{' '}
              <span className="text-white font-medium">{records.length}</span> results
            </p>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-gray-400 text-sm hover:bg-white/20 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                Previous
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-sm">
                1
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-gray-400 text-sm hover:bg-white/20 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
