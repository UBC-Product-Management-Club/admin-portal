import { RestClient } from "./RestClient";

class BaseService {
    protected readonly headers = { 'Content-Type' : 'application/json'}
    protected readonly client: RestClient;
    
    constructor(client: RestClient = RestClient.getRestClient()) {
        this.client = client;
    }
}

export { BaseService }