import { ResponseObject } from '@hapi/hapi';
import Http from 'http';
import Https from 'https';
import QueryString from 'querystring';
import * as stream from 'stream';
import { SecureContext, SecureContextOptions } from 'tls';

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
    protocol?: string;
    hostname?: string;
    hostnameConfig?: any,
    port?: number;
    basePath?: string;
    connectTimeout?: number;
    maxConnectRetry?: number;
    timeout?: number;
    maxFailures?: number;
    resetTime?: number;
    agent?: Http.Agent | Https.Agent;
    agentOptions?: {
        keepAlive?: boolean;
        keepAliveMsecs?: number;
        secureContext?: SecureContext;
        secureContextOptions?: SecureContextOptions;
    };
    plugins?: any;
};

export type GlobalConfig = {
    base?: ServiceConfig;
    plugins?: any[];
    overrides?: Record<string, ServiceConfig>;
}

export function create(servicename: string, overrides?: ServiceConfig): ClientInstance;

export function remove(servicename: string): void;

export function use(plugins?: any[]): void;

export function mergeConfig(externalConfig?: GlobalConfig): void;
