import { ManageSidebar } from "@/components/layout/manage-sidebar";
import { AuthProvider } from "@/lib/auth-context";

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden">
        <ManageSidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
