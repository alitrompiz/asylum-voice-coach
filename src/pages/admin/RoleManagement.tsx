import { RoleManagement as RoleManagementComponent } from '@/components/admin/RoleManagement';

export default function RoleManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">
            Manage admin roles and permissions
          </p>
        </div>
      </div>
      
      <RoleManagementComponent />
    </div>
  );
}