import { Wrench } from "lucide-react";

export function MecaFlowLogo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-blue-500 rounded-xl p-2.5">
        <Wrench className="h-6 w-6 text-white" />
      </div>
      <span className={`text-2xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>
        MecaFlow
      </span>
    </div>
  );
}
