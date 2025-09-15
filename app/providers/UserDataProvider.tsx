import { supabase } from '@/config/supabase';
import type { AuthTokenResponsePassword } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useNavigate } from 'react-router';

type User = NonNullable<AuthTokenResponsePassword['data']>['user'];
type Session = NonNullable<AuthTokenResponsePassword['data']>['session'];

interface UserDataContextType {
  user: User | undefined;
  session: Session | undefined;
  setUser: Dispatch<SetStateAction<User | undefined>>;
  setSession: Dispatch<SetStateAction<Session | undefined>>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

function useUserData() {
  const ctx = useContext(UserDataContext);
  if (!ctx) {
    throw new Error('UserDataContext used outside provider!');
  }
  return ctx;
}

function UserDataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>();
  const [session, setSession] = useState<Session>();
  const navigateTo = useNavigate();

  useEffect(() => {
    // On first load, get the current session
    supabase.auth.getSession().then(({ data }) => {
      console.log(data);
      setSession(data.session);
      setUser(data.session?.user ?? null);
    });

    // Subscribe to auth state changes (login, logout, refresh, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      switch (_event) {
        case 'SIGNED_IN':
          setSession(session);
          setUser(session?.user ?? null);
          break;
        case 'SIGNED_OUT':
          console.log('signed out!');
          setSession(undefined);
          setUser(undefined);
          navigateTo('/');
        case 'TOKEN_REFRESHED':
          console.log('token refreshed!');
        // might want to track usage?
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserDataContext.Provider value={{ user, session, setUser, setSession }}>
      {children}
    </UserDataContext.Provider>
  );
}

export { UserDataProvider, useUserData };
