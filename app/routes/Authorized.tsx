import { useNavigate, useSearchParams } from 'react-router';
import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export default function AuthorizedRouter() {
  const { user, isLoading } = useAuth0();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!user || params.has('error')) {
        navigate('/', {
          state: {
            error: params.get('error') ?? 'Auth error!',
            description: params.get('error_description') ?? 'Please use your pmc email.',
          },
          replace: true,
        });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [params, user, isLoading]);

  return <h1>loading...</h1>;
}
