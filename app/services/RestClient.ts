import { supabase } from "@/config/supabase";
export class RestClient {

    // Admin portal should only access admin routes
    private readonly baseUrl: string = `${import.meta.env.VITE_API_URL}/api/v2/admin`

    static #instance: RestClient

    private constructor() {}

    public static getRestClient(): RestClient {
        if (!RestClient.#instance) {
            RestClient.#instance = new RestClient();
        }
        return RestClient.#instance;
    }

    public async request<TResponse>(path: string, options: RequestInit = {}): Promise<TResponse> {
        const access_token = (await supabase.auth.getSession()).data.session?.access_token
        if (!access_token) {
            throw new Error("No access token found!")
        }
        const headers = {...options.headers, "Authorization": `Bearer ${access_token}`};
        const response = await fetch(`${this.baseUrl}${path}`, { ...options, headers });

        if (!response.ok) {
            // Optionally log or throw a custom error
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
            return response.json() as Promise<TResponse>;
        }

        // Add handling for other types if needed
        return null as unknown as TResponse;
    }

    public get<TResponse>(path: string, headers: HeadersInit = {}): Promise<TResponse> {
        return this.request<TResponse>(path, {
            method: 'GET',
            credentials: 'include',
            headers,
        });
    }

    public post<TResponse>(
        path: string,
        body: BodyInit,
        headers: HeadersInit = {}
    ): Promise<TResponse> {
        return this.request<TResponse>(path, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body,
        });
    }

    public put<TRequest, TResponse>(
        path: string,
        body: TRequest,
        headers: HeadersInit = {}
    ): Promise<TResponse> {
        return this.request<TResponse>(path, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify(body),
        });
    }

    public delete<TResponse>(path: string, headers: HeadersInit = {}): Promise<TResponse> {
        return this.request<TResponse>(path, {
            method: 'DELETE',
            credentials: 'include',
            headers,
        });
    }

}
