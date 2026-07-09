import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { useUserData } from '@/providers/UserDataProvider';
import { Link, Outlet } from 'react-router';

export default function AuthorizedLayout() {
  const { isAuthenticated, isLoading } = useUserData();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
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
      <SidebarInset className="flex-1 min-w-0 max-w-full">
        <SiteHeader />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
