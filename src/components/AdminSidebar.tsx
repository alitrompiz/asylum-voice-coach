import { NavLink, useLocation } from 'react-router-dom';
import { Users, Brain, UserCheck, MessageSquare, BarChart3, Shield, ArrowLeft, MessageCircle, Settings, BookOpen, Home } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

const adminItems = [
  {
    title: 'Home Page',
    url: '/admin/home-page',
    icon: Home,
  },
  {
    title: 'Users',
    url: '/admin/users',
    icon: Users,
  },
  {
    title: 'Focus Areas',
    url: '/admin/skills',
    icon: Brain,
  },
  {
    title: 'Officers',
    url: '/admin/personas',
    icon: UserCheck,
  },
  {
    title: 'Prompts',
    url: '/admin/prompts',
    icon: MessageSquare,
  },
  {
    title: 'Roles',
    url: '/admin/roles',
    icon: Shield,
  },
  {
    title: 'Usage',
    url: '/admin/usage',
    icon: BarChart3,
  },
  {
    title: 'Phrases',
    url: '/admin/phrases',
    icon: MessageCircle,
  },
  {
    title: 'Session Limits',
    url: '/admin/session-limits',
    icon: Settings,
  },
  {
    title: 'Test Stories',
    url: '/admin/test-stories',
    icon: BookOpen,
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isExpanded = adminItems.some((item) => isActive(item.url));

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50';

  return (
    <Sidebar
      collapsible="icon"
    >
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/70">
            <span>Admin Panel</span>
            <NavLink
              to="/dashboard"
              className="p-1 hover:bg-muted/50 rounded-sm transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-3 w-3" />
            </NavLink>
          </div>

          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={getNavCls}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {state !== 'collapsed' && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}