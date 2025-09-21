import { useUserData } from '@/providers/UserDataProvider';
import type { Route } from '../+types/root';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';

export default function Members({ loaderData, actionData, params, matches }: Route.ComponentProps) {
  const { user } = useUserData();
  const [userData, setUserData] = useState([]);
  const [error, setError] = useState('');
  const { getUsers } = useAdmin();

  useEffect(() => {
    getUsers()
      .then(setUserData)
      .catch((e) => {
        console.error(e);
        setError(e);
      });
  }, [getUsers]);

  return (
    <>
      {error ? (
        <>{error.message}</>
      ) : (
        <>
          <h1>members page</h1>
          <p>Loader Data: {JSON.stringify(loaderData)}</p>
          <p>Action Data: {JSON.stringify(actionData)}</p>
          <p>Route Parameters: {JSON.stringify(params)}</p>
          <p>Matched Routes: {JSON.stringify(matches)}</p>
          <p>User: {JSON.stringify(user)}</p>
          <p>User: {JSON.stringify(user)}</p>
          <div>
            <h1>THE USERS:</h1>
            {userData.map((u, idx) => (
              <p key={idx}>
                {u.first_name} ({u.email})
              </p>
            ))}
          </div>
        </>
      )}
    </>
  );
}
