export const inputBaseClass =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 outline-none transition-colors duration-150 ' +
  'hover:border-slate-400 ' +
  'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:placeholder:text-slate-300';

export function inputErrorClass(error: boolean | undefined) {
  return error ? 'border-red-400 hover:border-red-400 focus:border-red-500 focus:ring-red-500/20' : '';
}
