import { TallerTotalLogo } from "@/components/TallerTotalLogo";
import { LogoutButton } from "@/components/LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TallerTotalLogo />
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            SuperAdmin
          </span>
        </div>
        <LogoutButton />
      </header>
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  );
}
