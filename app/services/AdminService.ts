import { RestClient } from './RestClient';

class AdminService {
    
    private client: RestClient;

    constructor(client?: RestClient) {
        this.client = client ?? new RestClient(`${import.meta.env.VITE_API_URL}/api/v2/admin`);
    }

    getUsers(access_token: string): Promise<any> {
        return this.client.get('/users', {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access_token}`,
          },);
    }
}

export { AdminService };