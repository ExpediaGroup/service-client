# @vrbo/service-client

* [Introduction](#introduction)
* [Examples](#examples)
    * [Basic Usage](#basic-usage)
    * [More Examples](#more-examples)
* [API](#api)
    * [Global Defaults](#global-defaults)
    * [`ServiceClient.create(servicename, [overrides])`](#serviceclientcreateservicename-overrides)
    * [`ServiceClient.read(response, [options])`](#serviceclientreadresponse-options)
    * [`ServiceClient.toReadableStream(payload, [encoding])`](#serviceclienttoreadablestreampayload-encoding)
    * [`ServiceClient.parseCacheControl(field)`](#serviceclientparsecachecontrolfield)
    * [`ServiceClient.agents`](#serviceclientagents)
    * [`ServiceClient.mergeConfig({})`](#serviceclientmergeconfig)
    * [`ServiceClient.use([])`](#serviceclientuse)
    * [ServiceClient instance](#serviceclient-instance)
* [Plugins](#plugins)
    * [Overview](#overview)
    * [Registration](#registration)
    * [Available Plugins](#available-plugins)
    * [Plugin structure](#plugin-structure)
    * [Writing your own plugin](#writing-your-own-plugin)
* [Development](#development)
* [Further Reading](#further-reading)

## Introduction
A general purpose http client built with extensibility in mind. It also features lifecycle hooks, dynamic hostname resolution, and circuit breaking.

Principal features:
* uses [`wreck`](https://github.com/hapijs/wreck) underneath the covers
* circuit breaking ([`circuit-state`](https://github.com/tlivings/circuit-state))
* extensible with hooks ([see Plugins section](#plugins))
* creates secure context
* promise based - no callbacks

## Installation

```bash
npm install @vrbo/service-client
```

## Examples

### Basic Usage

```javascript
const ServiceClient = require('@vrbo/service-client')

// Create a re-usable client for a service.
const client = ServiceClient.create('myservice', {
    /* overrides the global defaults */
    hostname: 'example.com',
    port: 80
})

try {
    const response = await client.request({
        method: 'GET',
        path: '/v1/listings/{listingId}',
        pathParams: {
            listingId: 'vb24523'
        }
    })
} catch (error) {
    console.log(error)
}
```

### More Examples

For a more thorough collection of examples see the [examples directory](https://github.com/homeaway/service-client/tree/master/examples).

***

## API

### Global Defaults

- **protocol** - The protocol to use for the request. Defaults to `"http:"`.
- **connectTimeout** - The connection timeout. Defaults to `1000`.
- **maxConnectRetry** - After `connectTimeout` elapses, how many attempts to retry the connection. Defaults to `0`.
- **timeout** - The number of ms to wait without receiving a response before aborting the request. Defaults to `10000`.
- **maxFailures** - Maximum number of failures before circuit breaker flips open. See [`circuit-state`](https://github.com/tlivings/circuit-state#api). Defaults to `3`.
- **resetTime** - Time in ms before an open circuit breaker returns to a half-open state. If 0 or less, manual resets will be used. See [`circuit-state`](https://github.com/tlivings/circuit-state#api). Defaults to `30000`.
- **agentOptions** - Instead of passing `agent`, pass options to initialize `agent` internally. See [http.Agent](https://nodejs.org/api/http.html#http_class_http_agent) or [https.Agent](https://nodejs.org/api/https.html#https_class_https_agent) docs.
    - **keepAlive** - Defaults to `true`.
    - **keepAliveMsecs** - Defaults to `30000`.

***

### `ServiceClient.create(servicename, [overrides])`

Returns a new service client instance for `servicename` with optional `overrides` to the global defaults listed above:

- **protocol** - The protocol to use for the request. Defaults to `"http:"`.
- **hostname** - The hostname to use for the request. Accepts a string or a function that returns a string.
- **port** - The port number to use for the request.
- **basePath** - The base path used to prefix every request path. This path should begin with a `/`.
- **connectTimeout** - The connection timeout. Defaults to `1000`.
- **maxConnectRetry** - After `connectTimeout` elapses, how many attempts to retry the connection. Defaults to `0`.
- **timeout** - The number of ms to wait without receiving a response before aborting the request. Defaults to `10000`.
- **maxFailures** - Maximum number of failures before circuit breaker flips open. See [`circuit-state`](https://github.com/tlivings/circuit-state#api). Defaults to `3`.
- **resetTime** - Time in ms before an open circuit breaker returns to a half-open state. If 0 or less, manual resets will be used. See [`circuit-state`](https://github.com/tlivings/circuit-state#api). Defaults to `30000`.
- **agent** - An http/https agent instance. See [Node docs](https://nodejs.org/docs/latest-v8.x/api/http.html). Defaults to an instance created internally using `agentOptions`.
- **agentOptions** - Instead of passing `agent`, pass options to initialize `agent` internally. See [http.Agent](https://nodejs.org/api/http.html#http_class_http_agent) or [https.Agent](https://nodejs.org/api/https.html#https_class_https_agent) docs.
    - **keepAlive** - Defaults to `true`.
    - **keepAliveMsecs** - Defaults to `30000`.
    - **secureContext** - A SecureContext instance. Defaults to an instance created internally using `secureContextOptions`.
    - **secureContextOptions** - Instead of passing `secureContext` here, pass options to initialize `secureContext` internally. See [tls.createSecureContext()](https://nodejs.org/docs/latest-v8.x/api/tls.html#tls_tls_createsecurecontext_options) options.
- **plugins** - Configuration object for [ServiceClient plugins](#plugins).

### `ServiceClient.read(response, [options])`

This is a proxy to `Wreck.read()` - for further details please see [Wreck.read()](https://github.com/hapijs/wreck#readresponse-options).

### `ServiceClient.toReadableStream(payload, [encoding])`

This is a proxy to `Wreck.toReadableStream()` - for further details please see [Wreck.toReadableStream()](https://github.com/hapijs/wreck#toreadablestreampayload-encoding).

### `ServiceClient.parseCacheControl(field)`

This is a proxy to `Wreck.parseCacheControl()` - for further details please see [Wreck.parseCacheControl()](https://github.com/hapijs/wreck#parsecachecontrolfield).

### `ServiceClient.agents`

This is a proxy to `Wreck.agents` - for further details please see [Wreck.agents](https://github.com/hapijs/wreck#agents).

### `ServiceClient.mergeConfig({})`

Merges and overrides configuration with the global ServiceClient config.

### `ServiceClient.use([])`

Globally registers plugins. A helper function for calling `ServiceClient.mergeConfig({plugins: []})`. See [plugins](#plugins).

***

### ServiceClient instance

An instance returned by `ServiceClient.create()`.

#### Properties

- **stats** - The circuit breaker stats for this client instance.
- **id** - The generated unique identifier for this client instance.

#### Methods

- **`config(chain, options)`** - Read the configuration provided for the client. See [`Hoek.reach()`](https://github.com/hapijs/hoek/blob/master/API.md#reachobj-chain-options).
    - **chain** - object path syntax to the property you want.
    - **options** - options to pass to [`Hoek.reach()`](https://github.com/hapijs/hoek/blob/master/API.md#reachobj-chain-options).
- **`request(options)`** - Makes an http request.
    - **method** - the HTTP method.
    - **path** - defaults to `'/'`.
    - **queryParams** - object containing key-value query parameter values.
    - **pathParams** - object containing key-value path parameters to replace `{someKey}` value in path with.
    - **headers** - object containing key-value pairs of headers.
    - **payload** - the payload to send, if any.
    - **redirects** - the number of redirects to allow.
    - **operation** - the unique name for this endpoint request (default example: `GET` `/v1/supply/properties/austin` -> `GET_v1_supply_properties`).
    - **timeout** - the timeout for this request.
    - **connectTimeout** - the connection timeout for this request.
    - **maxConnectRetry** - on `connectionTimeout` elapsed, how many attempts to retry connection.
    - **maxBytes** - maximum size for response payload.
    - **agent** - an optional custom agent for this request.
    - **read** - whether or not to read the response (default: `true`).
    - **readOptions** - options for reading the response payload. See [Wreck.read()](https://github.com/hapijs/wreck#readresponse-options).
        - **timeout** - defaults to `20000`
        - **json** - defaults to `true`
        - **gunzip** - defaults to `false`
        - **maxBytes** - no default
    - **context** - the upstream request object (usually just a Hapi `request` or `server` object) to be passed to each hook.
    - **plugins** - the request-specific configuration object for service client plugins.

***

## Plugins
Service-Client plugins provide the ability to hook into different spots of a request's lifecycle, and in some hooks, await some asynchronous action.

Plugins are registered with `ServiceClient.mergeConfig({plugins: []})` or `ServiceClient.use([])` and affect all Service-Client instances created thereafter.

### Overview
A plugin exports a function which, when executed, returns an object containing a set of hook functions to be ran during a request's lifecycle. See all available hooks [below](#available-plugins).

Example:
```js
module.exports = function({client, context, plugins}) {
    return {
        request({...}) {

        },
        lookup({...}) {

        },
        response({...}) {

        }
    };
};
```

### Registration
```js
const ServiceClient = require('@vrbo/service-client');
const SCStatsD = require('@vrbo/service-client-statsd');

ServiceClient.use(SCStatsD);

// Alternatively with an array of plugins
ServiceClient.use([
    SCStatsD,
    Plugin1,
    Plugin2
]);
```

### Available Plugins

* [`statsd`](https://github.com/homeaway/service-client-statsd)

### Plugin structure
```js

/**
 * In the most general terms, a plugin is a function which returns a set of hook
 * functions. It can be async if necessary to perform some initial setup. Each
 * plugin is initialized within the context of every request. Provided to the
 * function are references to some helpful objects.
 *
 * @param {object} data - the object provided on every request to the plugin
 * @param {object} data.client - the service client instance for this request
 * @param {object} data.context - the upstream request object passed as `context` in the request options
 * @param {object} data.plugins - the request-specific plugin options passed as `plugins` in the request options
 */
async function plugin({client, context, plugins}) {

    /**
     * Each hook is supplied with at least these pieces of data:
     *
     * @param {object} data - data provided to the hook on every request
     * @param {object} data.context - the upstream request object (usually just a Hapi request or server object)
     * @param {string} data.clientId - the unique id of this particular instance of service-client
     * @param {string} data.requestId - the unique id of this particular request
     * @param {number} data.ts - the unix timestamp of when this hook was executed
     * @param {string} data.servicename - the name of the service associated with this instance of service-client
     * @param {string} data.operation - the normalized operation name for this request (ex: 'GET_v1_test_success')
     */

    return {

        /**
         * This hook is special. Data returned here will be deep merged with the
         * request options data that will be passed on to Wreck. If you wanted
         * to add headers to the request, this is where you would do it.
         * (ex: return {headers: {'x-ha-blah': 'foobar'}})
         *
         * @param {object} data - data provided to the hook on every request
         * @param {string} data.method - the request method (ex: 'GET', 'POST', etc)
         * @param {string} data.path - the request path (ex: '/v1/test/success')
         * @param {object} data.options - the request options to be passed to Wreck
         */
        async request(data) {

        },

        /**
         * @param {object} data - data provided to the hook on every request
         * @param {string} data.method - the request method (ex: 'GET', 'POST', etc)
         * @param {string} data.path - the request path (ex: '/v1/test/success')
         * @param {object} data.options - the request options to be passed to Wreck
         */
        async init(data) {

        },

        /**
         * @param {object} data - data provided to the hook on every request
         * @param {object} data.socket - The node socket associated with this request. See Node's net.Socket class.
         */
        socket(data) {

        },

        /**
         * @param {object} data - data provided to the hook on every request
         * @param {Error} data.error - the error object
         * @param {string} data.address - the ip address
         * @param {string} data.family - the address type (4 or 6)
         * @param {string} data.host - the hostname
         */
        lookup(data) {

        },

        /**
         * @param {object} data - data provided to the hook on every request
         */
        connect(data) {

        },

        /**
         * @param {object} data - data provided to the hook on every request
         */
        secureConnect(data) {

        },

        /**
         * This hook is special. The only value that should be returned here is
         * a response object. This is helpful for authentication plugins that
         * want to retry a request if an invalid response was received. A request
         * made within this hook could return it's response object here.
         *
         * There's a catch however. Since response objects from multiple hooks
         * cannot be merged, only the first response object will be taken. All
         * other returned responses are discarded.
         *
         * @param {object} data - data provided to the hook on every request
         * @param {object} data.response - the response received from Wreck before being read
         */
        async response(data) {

        },

        /**
         * @param {object} data - data provided to the hook on every request
         * @param {Error} data.error - the error object resulting from timeouts, read errors, etc
         */
        async error(data) {

        },

        /**
         * @param {object} data - data provided to the hook on every request
         * @param {boolean} data.open - whether or not the circuit breaker is open (see `circuit-state` module)
         * @param {number} data.executions - the number of executions
         * @param {number} data.successes - the number of successes
         * @param {number} data.failures - the number of failures
         */
        async stats(data) {

        },

        /**
         * @param {object} data - data provided to the hook on every request
         * @param {object} data.options - the request options that were passed to Wreck
         * @param {Error} data.error - the error object from the circuit breaker, timeouts, read errors, etc
         * @param {object} data.stats - an object containing `open`, `executions`, etc (see stats hook)
         */
        async end(data) {

        }
    }
}
```

### Writing your own plugin

```js
// my-example.js

const client = require('@vrbo/service-client');

ServiceClient.use(({client, context, plugins}) => {

    console.log('client plugin options:', client.config('plugins.myPlugin');
    console.log('context:', context);
    console.log('request plugin options:', plugins.myPlugin);

    return {
        request() {
            console.log('there was a request');
        },
        error() {
            console.log('there was an error');
        },
        response() {
            console.log('there was a response');
        }
    }
});

const client = ServiceClient.create('myservice', {
    plugin: {
        myPlugin: {
            clientOption: 'foobar'
        }
    }
});

try {
    const response = await client.request({
        method: 'GET',
        path: '/v1/test/stuff',
        plugins: {
            myPlugin: {
                option1: 'fizzbuzz'
            }
        }
    });
} catch (error) {
    console.log(error);
}
```

```bash
> node ./my-example.js
config: {"clientOption": "foobar"}
context: [context object]
plugins: {"option1": "fizzbuzz"}
there was a request
there was a response
>
```

## Development
This package uses [`debug`](https://github.com/visionmedia/debug) for logging debug statements.

Use the `serviceclient` namespace to log related information:
```bash
DEBUG=serviceclient:* npm test
```

## Further Reading
* [License](LICENSE)
* [Code of conduct](CODE_OF_CONDUCT.md)
* [Contributing](CONTRIBUTING.md)
* [Changelog](CHANGELOG.md)
