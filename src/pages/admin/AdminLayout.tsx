import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '@/components/AdminSidebar';

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <main className="flex-1 ml-[72px] md:ml-[220px] p-6">
        <Outlet />
      </main>
    </div>
  );
}