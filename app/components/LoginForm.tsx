import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/services/AuthService';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import type { AuthError } from '@supabase/supabase-js';
import { useNavigate } from 'react-router';
import { useUserData } from '@/providers/UserDataProvider';
import { Loader2Icon } from 'lucide-react';

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const [error, setError] = useState<AuthError | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const { setUser, setSession } = useUserData();
  const navigateTo = useNavigate();

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>PMC Admin Portal</CardTitle>
          <CardDescription>Contact tech on Slack for credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={(formData) => {
              const email = formData.get('email')?.toString();
              const pass = formData.get('password')?.toString();
              if (email && pass) {
                setLoading(true);
                login(email, pass)
                  .then((response) => {
                    if (response.error) {
                      setError(response.error);
                    } else {
                      console.log(response.data);
                      setUser(response.data.user);
                      setSession(response.data.session);
                      navigateTo('/dashboard');
                    }
                  }).catch((e) => {
                    console.error(e)
                  })
                  .finally(() => setLoading(false));
              }
            }}
          >
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="m@example.com" required />
              </div>
              <div className="grid gap-3">
                <Input id="password" name="password" type="password" required />
              </div>
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2Icon className="animate-spin" />}
                  Login
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Authentication error!</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
