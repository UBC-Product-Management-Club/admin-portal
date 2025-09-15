import { useUserData } from '@/providers/UserDataProvider';
import type { Route } from '../+types/root';

export default function Events({ loaderData, actionData, params, matches }: Route.ComponentProps) {
  const { user } = useUserData();
  return (
    <>
      <h1>events page</h1>
      <p>Loader Data: {JSON.stringify(loaderData)}</p>
      <p>Action Data: {JSON.stringify(actionData)}</p>
      <p>Route Parameters: {JSON.stringify(params)}</p>
      <p>Matched Routes: {JSON.stringify(matches)}</p>
      <p>User: {JSON.stringify(user)}</p>
    </>
  );
}
