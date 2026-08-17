export function Footer() {
  return (
    <footer className="flex h-12 shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 text-xs text-slate-400">
      <p>© 2024 EMS Industrial Dashboard. All Rights Reserved.</p>
      <div className="flex items-center gap-5">
        <a href="#" className="hover:text-slate-600">
          Privacy Policy
        </a>
        <a href="#" className="hover:text-slate-600">
          Terms of Service
        </a>
        <a href="#" className="hover:text-slate-600">
          Technical Support
        </a>
      </div>
    </footer>
  );
}
