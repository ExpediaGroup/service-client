import { ResponseObject } from '@hapi/hapi';
import Http from 'http';
import { Logger } from 'pino';
import QueryString from 'querystring';
import Stream, * as stream from 'stream';

export type ServiceClientOptions = {
    agent?: {[key: string]: string};
    connectTimeout?: number;
    context?: ServiceRequest;
    headers?: Headers;
    hostPrefix?: string;
    maxConnectRetry?: number;
    method: string;
    operation: string;
    path?: string;
    pathParams?: {[key: string]: string};
    payload?: string | Buffer | Stream.Readable | object;
    queryParams?: QueryParams;
    read?: boolean;
    readOptions?: {
        timeout?: number;
        JSON?: JSON;
        maxBytes?: number;
        gunzip?: {[key: string]: string};
    };
    redirects?: number;
    timeout?: number;
};

type Headers = {
    readonly [name: string]:
        | string
        | readonly string[]
        | boolean
        | undefined;
};


interface QueryParams extends QueryString.ParsedUrlQueryInput {}

export type ServiceContext = {
    dataSources: {[serviceClient: string]: ClientInstance};
    request: ServiceRequest;
};

export interface ServiceRequest {
    headers: Headers;
    logger: Logger;
    auth: {
        isAuthenticated: boolean;
        credentials: {
            apiToken: string;
            principalToken: string;
        };
    };
}

type ServiceClientResponsePayload = stream.Readable
        | Buffer
        | string
        | {[key: string]: string | string[]};

export interface ServiceClientResponse extends ResponseObject {
    readonly payload: ServiceClientResponsePayload;
}

export type ClientInstance = {
    request: <T = ServiceClientResponsePayload>(
        serviceClientOptions: ServiceClientOptions
    ) => T extends ServiceClientResponsePayload ? Promise<ServiceClientResponse> : Http.IncomingMessage & {
      req?: Http.ClientRequest;
      payload: T;
    }
};

export type GlobalConfig = {
    base?: {
        // url
        protocol?: string;
        // resiliency
        connectTimeout?: number;
        maxConnectRetry?: number;
        timeout?: number;
        maxFailures?: number; // circuit breaking
        resetTime?: number; // circuit breaking
        // agent options
        agentOptions?: {
            keepAlive?: boolean;
            keepAliveMsecs?: number;
        };
    };
    plugins?: any[];
    overrides?: {};
}

export function create(servicename: string, overrides?: {}): ClientInstance;

export function remove(servicename: string): void;

export function use(plugins?: any[]): void;

export function mergeConfig(externalConfig?: GlobalConfig): void;
