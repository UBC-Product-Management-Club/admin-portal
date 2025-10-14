import { BaseService } from './BaseService';
import { RestClient } from './RestClient';
import type { User } from '@/lib/types/User';

class UserService extends BaseService {
    private readonly path: string = "/users"

    getUsers(): Promise<User[]> {
        return this.client.get(this.path, this.headers);
    }

    getUser(user_id: string): Promise<User> {
        return this.client.get(`${this.path}/${user_id}`, this.headers); }
}

export { UserService };