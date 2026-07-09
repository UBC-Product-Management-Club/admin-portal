import * as React from 'react';
import {
  IconChartBar,
  IconDashboard,
  IconFolder,
  IconListDetails,
  IconSettings,
} from '@tabler/icons-react';

import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useUserData } from '@/providers/UserDataProvider';
import { useNavigate } from 'react-router';
import logo from '../assets/logo.png';

const data = {
  navMain: [
    {
      title: 'Dashboard',
      route: '/dashboard',
      icon: IconDashboard,
    },
    {
      title: 'Members',
      route: '/members',
      icon: IconListDetails,
    },
    {
      title: 'Events',
      route: '/events',
      icon: IconChartBar,
    },
    {
      title: 'Emails',
      route: '/emails',
      icon: IconFolder,
    },
    {
      title: 'Portal Settings',
      route: '/settings',
      icon: IconSettings,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useUserData();
  const navigateTo = useNavigate();

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User';
  const displayEmail = user?.email ?? '';
  const avatar = user?.user_metadata?.avatar_url ?? '';

  const handleLogout = async () => {
    await logout();
    navigateTo('/');
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="#">
                <img src={logo} width={40} height={40} />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: displayName,
            email: displayEmail,
            avatar,
          }}
          onLogout={handleLogout}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
