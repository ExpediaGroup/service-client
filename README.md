# @vrbo/service-client
[![NPM Version](https://img.shields.io/npm/v/@vrbo/service-client.svg?style=flat-square)](https://www.npmjs.com/package/@vrbo/service-client)
![](https://github.com/ExpediaGroup/service-client/workflows/Node_CI/badge.svg)
[![Dependency Status](https://david-dm.org/expediagroup/service-client.svg?theme=shields.io)](https://david-dm.org/expediagroup/service-client)
[![NPM Downloads](https://img.shields.io/npm/dm/@vrbo/service-client.svg?style=flat-square)](https://npm-stat.com/charts.html?package=@vrbo/service-client)

A general purpose HTTP client built with extensibility in mind.

## Features:
* uses [`wreck`](https://github.com/hapijs/wreck) underneath the covers
* circuit breaking ([`circuit-state`](https://github.com/tlivings/circuit-state))
* extensible with lifecycle hooks ([see Plugins section](#plugins))
* dynamic hostname resolution
* creates secure context
* promise based - no callbacks

## Contents
* [Installation](#installation)
* [Usage](#usage)
    * [More Examples](#more-examples)
* [API](#api)
    * [Global Defaults](#global-defaults)
    * [`ServiceClient.create(servicename, [overrides])`](#serviceclientcreateservicename-overrides)
    * [`ServiceClient.read(response, [options])`](#serviceclientreadresponse-options)
    * [`ServiceClient.mergeConfig({})`](#serviceclientmergeconfig)
    * [`ServiceClient.use([])`](#serviceclientuse)
    * [ServiceClient instance](#serviceclient-instance)
* [Plugins](#plugins)
    * [Overview](#overview)
    * [Registration](#registration)
    * [Available Plugins](#available-plugins)
    * [Plugin structure](#plugin-structure)
    * [Writing your own plugin](#writing-your-own-plugin)
* [Precautionary Notes](#precautionary-notes)
* [Development](#development)
* [Further Reading](#further-reading)

---

## Installation

```bash
npm install @vrbo/service-client
```

## Usage

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

For a more thorough collection of examples see the [examples directory](https://github.com/expediagroup/service-client/tree/master/examples).

---

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

---

### `ServiceClient.create(servicename, [overrides])`

Returns a new service client instance for `servicename` with optional `overrides` to the global defaults listed above:

*Note: If no `overrides` are provided, when a service client instance is created for a `servicename` it will be stored in a cache.  That instance will be returned instead of creating a new instance.*

- **protocol** - The protocol to use for the request. Defaults to `"http:"`.
- **hostname** - The hostname to use for the request. Accepts a `string` or a `function(serviceName, hostnameConfig || serviceConfig)` that returns a string.
- **hostnameConfig** - The object passed to the provided `hostname` resolver function. See `hostname` description above.
- **port** - The port number to use for the request.
- **basePath** - The base path used to prefix every request path. This path should end with a `/`.
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

Returns a promise that resolves into the payload in the form of a Buffer or (optionally) parsed JavaScript object (JSON).

- **response** - An HTTP Incoming Message object
- **options** - A configuration object
    - **timeout** - The number of milliseconds to wait while reading data before
    aborting handling of the response. Defaults to unlimited.
    - **json** - A value indicating how to try to parse the payload as JSON. Defaults to `true`.
        - **true** - Only try `JSON.parse` if the response indicates a JSON content-type. This is the default value.
        - **false** - Do not try `JSON.parse` on the response at all.
        - **strict** - Same as `true`, except throws an error for non-JSON content-type.
        - **force** - Try `JSON.parse` regardless of the content-type header.
    - **gunzip** - A value indicating the behavior to adopt when the payload is gzipped. Defaults to `false` meaning no gunzipping.
        - **true** - Only try to gunzip if the response indicates a gzip content-encoding.
        - **false** - Explicitly disable gunzipping.
        - **force** - Try to gunzip regardless of the content-encoding header.
    - **maxBytes** - The maximum allowed response payload size. Defaults to `0` (unlimited).

### `ServiceClient.mergeConfig({})`

Merges and overrides configuration with the global ServiceClient config.

### `ServiceClient.use([])`

Globally registers plugins. A helper function for calling `ServiceClient.mergeConfig({plugins: []})`. See [plugins](#plugins).

---

### ServiceClient instance

An instance returned by `ServiceClient.create()`.

#### Properties

- **stats** - The circuit breaker stats for this client instance.
- **id** - The generated unique identifier for this client instance.

#### Methods

- **`config(chain, options)`** - Read the configuration provided for the client. See [`Hoek.reach()`](https://github.com/hapijs/hoek/blob/master/API.md#reachobj-chain-options).
    - **chain** - Object path syntax to the property you want.
    - **options** - Options to pass to [`Hoek.reach()`](https://github.com/hapijs/hoek/blob/master/API.md#reachobj-chain-options).
- **`request(options)`** - Makes an http request.
    - **method** - The HTTP method.
    - **hostPrefix** - A base prefix that gets prepended to the hostname.
    - **path** - A leading `'/'` will override the client's configured `basePath`.
    - **queryParams** - Object containing key-value query parameter values.
    - **pathParams** - Object containing key-value path parameters to replace `{someKey}` value in path with.
    - **headers** - Object containing key-value pairs of headers.
    - **payload** - The payload to send, if any.
    - **redirects** - The number of redirects to allow.
    - **operation** - The unique name for this endpoint request (default example: `GET` `/v1/supply/properties/austin` -> `GET_v1_supply_properties`). Required.
    - **timeout** - The timeout for this request.
    - **connectTimeout** - The connection timeout for this request.
    - **maxConnectRetry** - On `connectionTimeout` elapsed, how many attempts to retry connection.
    - **maxBytes** - Maximum size for response payload.
    - **agent** - An optional custom agent for this request.
    - **read** - Whether or not to read the response (default: `true`).
    - **readOptions** - Options for reading the response payload. See [`ServiceClient.read()`](#serviceclientreadresponse-options).
        - **timeout** - Defaults to `20000`
        - **json** - Defaults to `true`
        - **gunzip** - Defaults to `false`
        - **maxBytes** - No default
    - **context** - The upstream request object (usually just a Hapi `request` or `server` object) to be passed to each hook.
    - **plugins** - The request-specific configuration object for service client plugins.

- **`read(response, [options])`** - Read the response payload. See the documentation for [`ServiceClient.read()`](#serviceclientreadresponse-options).

---

## Plugins
Service-Client plugins provide the ability to hook into different spots of a request's lifecycle, and in some hooks, await some asynchronous action.

Plugins are registered with `ServiceClient.mergeConfig({plugins: []})` or `ServiceClient.use([])` and affect all Service-Client instances created thereafter.

### Overview
A plugin exports a function which, when executed, returns an object containing a set of hook functions to be run during a request's lifecycle. See all available hooks [below](#available-plugins).

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

* [`statsd`](https://github.com/expediagroup/service-client-statsd)

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
         * This hook is special. The queryParams, pathParams, and headersData options
         * are deep merged with a copy of the request options data that will be
         * passed on to Wreck. All other data returned here will be shallow merged.
         * If you wanted to add headers to the request, this is where you would do it.
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
         * made within this hook could return its response object here.
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
         * This hook is special. This hook behaves just like response but can be used to 
         * validate data after being read. The only value that should be returned here is
         * a response object. This is helpful for authentication plugins that
         * want to retry a request if an invalid response was received. A request
         * made within this hook could return its response object here.
         *
         * There's a catch however. Since response objects from multiple hooks
         * cannot be merged, only the first response object will be taken. All
         * other returned responses are discarded.
         *
         * @param {object} data - data provided to the hook on every request
         * @param {object} data.response - the response received from Wreck after being read
         */
        async read(data) {

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

## Precautionary Notes
Any `content-length` header passed into the request options will be removed as a precaution against mismatching content-length values downstream. In the case of a non-buffer payload, this can occur if escape characters were taken into consideration when calculating the content length. This mismatch will result in the downstream service waiting for bytes that will never be sent. By removing the header, we defer to Wreck to calculate the correct content length.

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
