import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '@/components/AdminSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AdminSidebar />
        <main className="flex-1 p-6">
          <div className="mb-4">
            <SidebarTrigger />
          </div>
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}