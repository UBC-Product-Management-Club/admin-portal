import { useUserData } from '@/providers/UserDataProvider';
import type { Route } from '../+types/root';
import { useEffect, useState } from 'react';
import { useMember } from '@/hooks/useMember';
import UserDataTable from '@/components/user-data-table';

export default function Members({ loaderData, actionData, params, matches }: Route.ComponentProps) {
  const { user } = useUserData();
  const [userData, setUserData] = useState([]);
  const [error, setError] = useState('');
  const { getUsers } = useMember();

  useEffect(() => {
    getUsers()
      .then((res) => {
        console.log('getUsers() result:', res);
        setUserData(res);
      })
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
            <UserDataTable users={userData} />
          </div>
        </>
      )}
    </>
  );
}
