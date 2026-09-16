export function Footer() {
  return (
    <footer className="flex flex-col sm:flex-row shrink-0 items-center justify-between gap-2 py-3 sm:py-0 sm:h-12 border-t border-slate-200/80 bg-white px-4 sm:px-6 text-xs text-slate-400 text-center sm:text-left">
      <p>© 2026 EMS Industrial Console. All Rights Reserved.</p>
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-[11px] sm:text-xs">
        <a href="#" className="hover:text-slate-600 transition-colors">
          Privacy Policy
        </a>
        <span className="text-slate-300">·</span>
        <a href="#" className="hover:text-slate-600 transition-colors">
          Terms of Service
        </a>
        <span className="text-slate-300">·</span>
        <a href="#" className="hover:text-slate-600 transition-colors">
          Technical Support
        </a>
      </div>
    </footer>
  );
}
