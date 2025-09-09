import type { Route } from './+types/Main';
import { Link } from 'react-router';
import { useAuth0 } from '@auth0/auth0-react';

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
  const { user, logout } = useAuth0();

  return (
    <>
      <h1>this is a dashboard</h1>
      <p>Loader Data: {JSON.stringify(loaderData)}</p>
      <p>Action Data: {JSON.stringify(actionData)}</p>
      <p>Route Parameters: {JSON.stringify(params)}</p>
      <p>Matched Routes: {JSON.stringify(matches)}</p>
      <p>User: {JSON.stringify(user)}</p>
      <Link to="/" onClick={() => logout}>
        Logout
      </Link>
    </>
  );
}
