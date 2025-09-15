import { Link } from 'react-router';
import { supabase } from '@/config/supabase';
import { useUserData } from '@/providers/UserDataProvider';
import type { Route } from '../+types/root';

export function meta() {
  return [
    { title: 'PMC Admin portal' },
    { name: 'Dashboard', content: 'Welcome to React Router!' },
  ];
}

export default function Dashboard({
  loaderData,
  actionData,
  params,
  matches,
}: Route.ComponentProps) {
  const { user } = useUserData();
  return (
    <>
      <h1>this is a dashboard</h1>
      <p>Loader Data: {JSON.stringify(loaderData)}</p>
      <p>Action Data: {JSON.stringify(actionData)}</p>
      <p>Route Parameters: {JSON.stringify(params)}</p>
      <p>Matched Routes: {JSON.stringify(matches)}</p>
      <p>User: {JSON.stringify(user)}</p>
    </>
  );
}
