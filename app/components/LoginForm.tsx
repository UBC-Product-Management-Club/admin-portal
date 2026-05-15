import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useNavigate } from 'react-router';
import { useUserData } from '@/providers/UserDataProvider';
import { Spinner } from './ui/spinner';

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const { login } = useUserData();
  const navigateTo = useNavigate();

  const handleSubmit = async (formData: FormData) => {
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();
    if (!email || !password) return;

    setLoading(true);
    setError(undefined);
    try {
      const { error } = await login(email, password);
      if (error) {
        setError(error.message);
      } else {
        navigateTo('/dashboard');
      }
    } catch (e) {
      console.error(e);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>PMC Admin Portal</CardTitle>
          <CardDescription>Contact tech on Slack for credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit}>
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
                  {loading && <Spinner />}
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
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
