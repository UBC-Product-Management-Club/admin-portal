import { PortalSettingsService } from '@/services/PortalSettingsService';
import { useCallback, useEffect, useMemo, useState } from 'react';

function usePortalSettings() {
    const portalSettingsService = useMemo(() => new PortalSettingsService(), []);
    const [constructionModeEnabled, setConstructionModeEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        portalSettingsService
            .getSettings()
            .then((settings) => setConstructionModeEnabled(settings.construction_mode_enabled))
            .catch((err) => {
                console.error(err);
                setError('Failed to load portal settings.');
            })
            .finally(() => setLoading(false));
    }, [portalSettingsService]);

    const updateConstructionMode = useCallback(
        async (enabled: boolean) => {
            setSaving(true);
            setError('');

            try {
                const settings = await portalSettingsService.updateConstructionMode(enabled);
                setConstructionModeEnabled(settings.construction_mode_enabled);
            } catch (err) {
                console.error(err);
                setError(
                    err instanceof Error ? err.message : 'Failed to update construction mode.'
                );
                throw err;
            } finally {
                setSaving(false);
            }
        },
        [portalSettingsService]
    );

    return {
        constructionModeEnabled,
        loading,
        saving,
        error,
        updateConstructionMode,
    };
}

export { usePortalSettings };
