import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SidebarInput, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useUserData } from '@/providers/UserDataProvider';
import { Link, Outlet } from 'react-router';

export default function AuthorizedLayout() {
  const { user, session } = useUserData();
  if (user && session) {
    return (
      <SidebarProvider
        style={
          {
            '--sidebar-width': 'calc(var(--spacing) * 72)',
            '--header-height': 'calc(var(--spacing) * 12)',
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    );
  } else {
    return (
      <div className="w-1/4 mx-auto mt-14">
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized!</CardTitle>
            <CardDescription>Please login</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button variant="outline">Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
}
