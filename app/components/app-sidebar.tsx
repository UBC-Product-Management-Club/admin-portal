import * as React from 'react';
import { IconChartBar, IconDashboard, IconFolder, IconListDetails, IconArrowLeft, IconUsers, IconUserCheck } from '@tabler/icons-react';

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
import { useLocation, useNavigate } from 'react-router';
import logo from '../assets/logo.png';

const defaultNav = [
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
];

const eventDetailNav = [
  {
    title: 'Back to Events',
    route: '/events',
    icon: IconArrowLeft,
  },
  {
    title: 'Attendees',
    route: '#',
    icon: IconUsers,
  },
  {
    title: 'Applicants',
    route: '#',
    icon: IconUserCheck,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useUserData();
  const navigateTo = useNavigate();
  const location = useLocation();

  const isEventDetailPage = /^\/events\/.+$/.test(location.pathname);
  const navItems = isEventDetailPage ? eventDetailNav : defaultNav;

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
        <NavMain items={navItems} />
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
