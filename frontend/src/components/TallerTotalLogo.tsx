export function TallerTotalLogo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" width={40} height={40} className="rounded-xl object-contain" />
      <span className={`text-2xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>
        TallerTotal
      </span>
    </div>
  );
}
