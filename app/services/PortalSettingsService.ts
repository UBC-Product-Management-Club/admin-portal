import { BaseService } from './BaseService';

export type PortalSettings = {
    construction_mode_enabled: boolean;
};

class PortalSettingsService extends BaseService {
    private readonly adminPath = '/settings';

    getSettings(): Promise<PortalSettings> {
        return fetch(`${import.meta.env.VITE_API_URL}/api/v2/settings`).then(async (response) => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }

            return response.json() as Promise<PortalSettings>;
        });
    }

    updateConstructionMode(constructionModeEnabled: boolean): Promise<PortalSettings> {
        return this.client.patch<{ construction_mode_enabled: boolean }, PortalSettings>(
            this.adminPath,
            { construction_mode_enabled: constructionModeEnabled },
            this.headers
        );
    }
}

export { PortalSettingsService };
