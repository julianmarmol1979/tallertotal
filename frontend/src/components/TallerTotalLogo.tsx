import Image from "next/image";

export function TallerTotalLogo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image src="/logo.png" alt="TallerTotal" width={40} height={40} className="rounded-xl" />
      <span className={`text-2xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>
        TallerTotal
      </span>
    </div>
  );
}
