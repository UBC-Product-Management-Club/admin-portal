import { usePortalSettings } from '@/hooks/usePortalSettings';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function meta() {
  return [{ title: 'Portal Settings | PMC Admin portal' }];
}

export default function Settings() {
  const {
    constructionModeEnabled,
    loading,
    saving,
    error,
    updateConstructionMode,
  } = usePortalSettings();

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Portal Settings</h1>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Portal Settings</h1>

      <Card className="mt-6 w-[31rem]">
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="grid min-w-0 flex-1 gap-1.5">
              <Label htmlFor="construction-mode">Construction mode</Label>
              <p className="max-w-[20.5rem] text-sm text-muted-foreground">
                When enabled, the membership portal shows the construction page instead of login.
              </p>
            </div>
            <Switch
              id="construction-mode"
              checked={constructionModeEnabled}
              disabled={saving}
              onCheckedChange={(checked) => {
                void updateConstructionMode(checked);
              }}
            />
          </div>

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
