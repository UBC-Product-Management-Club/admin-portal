import { IconChartBar, IconFolder, IconListDetails } from '@tabler/icons-react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { useUserData } from '@/providers/UserDataProvider';

export function meta() {
  return [
    { title: 'PMC Admin portal' },
    { name: 'Dashboard', content: 'PMC Admin portal dashboard' },
  ];
}

const navCards = [
  {
    title: 'Members',
    description: 'View and manage member records',
    route: '/members',
    icon: IconListDetails,
  },
  {
    title: 'Events',
    description: 'View and manage upcoming events',
    route: '/events',
    icon: IconChartBar,
  },
  {
    title: 'Emails',
    description: 'View and manage email campaigns',
    route: '/emails',
    icon: IconFolder,
  },
];

export default function Dashboard() {
  const { user } = useUserData();
  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'there';

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {displayName}!</h1>
        <p className="text-muted-foreground">Here's where you can navigate the admin portal.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {navCards.map(({ title, description, route, icon: Icon }) => (
          <Button
            key={route}
            asChild
            variant="outline"
            className="h-auto flex-col items-start gap-2 p-4 text-left whitespace-normal"
          >
            <Link to={route}>
              <Icon className="size-6" />
              <span className="text-base font-medium">{title}</span>
              <span className="text-muted-foreground font-normal">{description}</span>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
