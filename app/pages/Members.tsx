import { useUserData } from '@/providers/UserDataProvider';
import type { Route } from '../+types/root';
import { useEffect, useState } from 'react';

export default function Members({ loaderData, actionData, params, matches }: Route.ComponentProps) {
  const { user, session } = useUserData();
  const [userData, setUserData] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const url = import.meta.env.VITE_API_URL + '/api/v2/admin/users';

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch users: ${res.status}`);
        }

        const data = await res.json();
        setUserData(data);
        console.log(data);
      } catch (errorMsg) {
        setError((errorMsg as Error).message);
      }
    };

    if (session?.access_token) {
      fetchUsers();
    }
  }, []);

  return (
    <>
      {error ? (
        <>hi</>
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
