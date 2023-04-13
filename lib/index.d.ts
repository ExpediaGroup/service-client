import { ResponseObject } from '@hapi/hapi';
import Http from 'http';
import QueryString from 'querystring';
import * as stream from 'stream';

type Headers = {
    readonly [name: string]:
        | string
        | readonly string[]
        | boolean
        | undefined;
};

export type ServiceClientOptions = {
    agent?: {[key: string]: string};
    connectTimeout?: number;
    context?: any;
    headers?: Headers;
    hostPrefix?: string;
    maxConnectRetry?: number;
    method: string;
    operation: string;
    path?: string;
    pathParams?: {[key: string]: string};
    payload?: string | Buffer | stream.Readable | object;
    queryParams?: QueryString.ParsedUrlQueryInput;
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
    ) => T extends ServiceClientResponsePayload ? Promise<ServiceClientResponse> : Promise<Http.IncomingMessage & {
        req?: Http.ClientRequest;
        payload: T;
    }>
};

export type ServiceConfig = {
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

export type ServiceOverrides = Record<string, ServiceConfig>;

export type GlobalConfig = {
    base?: ServiceConfig;
    plugins?: any[];
    overrides?: ServiceOverrides;
}

export function create(servicename: string, overrides?: ServiceOverrides): ClientInstance;

export function remove(servicename: string): void;

export function use(plugins?: any[]): void;

export function mergeConfig(externalConfig?: GlobalConfig): void;
