import { Download, FileText, X } from '@phosphor-icons/react';
import { IconButton } from './index';
import { API_URL } from '../utils/api';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  docPath: string;
  fileName?: string;
}

const anchorBase =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg font-medium transition-colors duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1 ' +
  'active:scale-[0.98]';

export function DocumentViewer({ isOpen, onClose, docPath, fileName }: DocumentViewerProps) {
  if (!isOpen || !docPath) return null;

  const fullUrl = API_URL.docPath(docPath);
  const isPdf = docPath.toLowerCase().endsWith('.pdf');
  const previewSrc = isPdf ? `${fullUrl}#page=1&view=Fit` : fullUrl;

  return (
      <div
        className="fixed inset-0 z-modal flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-slate-900/40" />

        <div
          className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-popover"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
              <FileText size={17} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-900">
                {fileName || 'CV Document'}
              </h3>
              <p className="truncate text-[13px] text-slate-500">{isPdf ? 'PDF document' : 'Document'}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={fullUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className={`${anchorBase} border border-slate-300 bg-white px-3 text-[13px] text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50`}
            >
              <Download size={14} />
              Download
            </a>
            <IconButton label="Close" onClick={onClose}>
              <X size={15} />
            </IconButton>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-slate-100 p-4">
          {isPdf ? (
            <iframe
              src={previewSrc}
              className="h-full w-full rounded-lg border border-slate-200 bg-white shadow-sm"
              title="Document Viewer"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-slate-200 bg-white">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                <FileText size={26} />
              </div>
              <p className="mb-4 text-sm text-slate-600">Preview not available for this file type</p>
              <a
                href={fullUrl}
                download={fileName}
                target="_blank"
                rel="noopener noreferrer"
                className={`${anchorBase} bg-blue-600 px-3.5 text-[13px] text-white shadow-sm hover:bg-blue-700`}
              >
                <Download size={14} />
                Download to View
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
