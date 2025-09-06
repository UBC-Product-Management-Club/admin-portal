import { useAuth0 } from '@auth0/auth0-react';
import { useLocation } from 'react-router';
import { useState } from 'react';
import logo from '@/assets/pmc3d.svg';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function meta() {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

interface AuthError {
  error: string;
  description: string;
}

export default function Main() {
  const { loginWithRedirect } = useAuth0();
  const location = useLocation();
  const error = location.state;
  const [authError] = useState<AuthError>(error);

  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <header className="flex flex-col items-center gap-9">
          <div className="w-[500px] max-w-[100vw] p-4">
            <img src={logo} alt="PMC logo" className="block w-full" />
          </div>
        </header>
        <div className="max-w-[300px] w-full space-y-6 px-4">
          <nav className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700 space-y-4">
            <p className="leading-6 text-gray-700 dark:text-gray-200 text-center">
              PMC Admin Portal
            </p>
            <button onClick={() => loginWithRedirect()}>Login</button>
            {authError && (
              <Alert variant="destructive">
                <AlertTitle>{authError.error}</AlertTitle>
                <AlertDescription>{authError.description}</AlertDescription>
              </Alert>
            )}
          </nav>
        </div>
      </div>
    </main>
  );
}
