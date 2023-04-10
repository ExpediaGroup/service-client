/*
Copyright 2019 Expedia Group, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict'

const { createId } = require('@paralleldrive/cuid2')
const CircuitBreakerState = require('circuit-state')
const Hoek = require('@hapi/hoek')

const { version } = require('../package')
const Schema = require('./schema')
const Hooks = require('./hooks')
const Request = require('./http/request')
const Read = require('./http/read')
const { createBaseUrl } = require('./helpers')

const debug = require('debug')('serviceclient:client')

class ServiceClient {
  constructor (servicename, config = {}) {
    // Save some values to the instance
    this._servicename = servicename
    this._config = config
    this._version = version
    this._id = createId()

    // Build the base url for this client
    if (typeof config.hostname === 'function') {
      config.hostname = config.hostname(servicename, config.hostnameConfig || config)
    }

    const { protocol, hostname, port, basePath } = config
    this._baseUrl = createBaseUrl(protocol, hostname, basePath, port)

    // Configure circuit breaking
    this._circuitState = new CircuitBreakerState({ maxFailures: config.maxFailures, resetTime: config.resetTime })
    this._stats = this._circuitState.stats
  }

  get stats () {
    return this._stats.snapshot()
  }

  get id () {
    return this._id
  }

  config (path, options) {
    return Hoek.reach(this._config, path, options)
  }

  async request (opts) {
    const self = this
    const config = self._config
    const clientId = self._id
    const servicename = self._servicename

    const {
      context,
      hostPrefix,
      path,
      method,
      operation,
      queryParams,
      pathParams,
      headers,
      payload,
      redirects = config.redirects,
      connectTimeout = config.connectTimeout,
      maxConnectRetry = config.maxConnectRetry,
      timeout = config.timeout,
      agent = config.agent,
      read,
      readOptions,
      plugins
    } = Schema.validateRequest(servicename, opts)

    const hooks = await Hooks.init({
      client: self,
      context,
      plugins
    })

    // Use our own requestId instead of the one request generates.
    const requestId = createId()

    let baseUrl
    if (hostPrefix) {
      const { protocol, hostname, port, basePath } = config
      baseUrl = createBaseUrl(protocol, hostname, basePath, port, hostPrefix)
    } else {
      baseUrl = this._baseUrl
    }

    // Request options
    let requestOptions = {
      queryParams,
      pathParams,
      baseUrl,
      headers,
      payload,
      redirects,
      timeout,
      connectTimeout,
      maxConnectRetry,
      agent,
      read,
      readOptions
    }

    if (hooks.request) {
      requestOptions = await hooks.request({ context, clientId, requestId, ts: Date.now(), servicename, operation, method, path, options: requestOptions }) || requestOptions
    }

    // Hooks are used from request lifecycle events to execute.
    // ID emitted by request is ignored here so we can emit additional events with consistent ids.
    const reqHooks = {}
    if (hooks.init) {
      reqHooks.init = async (id, reqMethod, reqPath, options, ts = Date.now()) => {
        await hooks.init({ context, clientId, requestId, ts, servicename, operation, method: reqMethod, path: reqPath, options })
      }
    }
    if (hooks.socket) {
      reqHooks.socket = (id, socket, ts = Date.now()) => {
        hooks.socket({ context, clientId, requestId, ts, servicename, operation, socket })
      }
    }
    if (hooks.lookup) {
      reqHooks.lookup = (id, error, address, family, host, ts = Date.now()) => {
        hooks.lookup({ context, clientId, requestId, ts, servicename, operation, error, address, family, host })
      }
    }
    if (hooks.connect) {
      reqHooks.connect = (id, ts = Date.now()) => {
        hooks.connect({ context, clientId, requestId, ts, servicename, operation })
      }
    }
    if (hooks.secureConnect) {
      reqHooks.secureConnect = (id, ts = Date.now()) => {
        hooks.secureConnect({ context, clientId, requestId, ts, servicename, operation })
      }
    }
    if (hooks.response) {
      reqHooks.response = async (id, response, ts = Date.now()) => {
        return hooks.response({ context, clientId, requestId, ts, servicename, operation, response })
      }
    }
    if (hooks.error) {
      reqHooks.error = async (id, error, ts = Date.now()) => {
        await hooks.error({ context, clientId, requestId, ts, servicename, operation, error })
      }
    }
    if (hooks.read) {
      reqHooks.read = async (id, response, ts = Date.now()) => {
        return hooks.read({ context, clientId, requestId, ts, servicename, operation, response })
      }
    }

    const doRequest = async function () {
      if (self._circuitState.open) {
        debug('doRequest(): circuit state is open, failing fast')

        const preError = new Error('Circuit breaker is open')
        preError.code = 'EPERM'

        const snapshot = self._stats.snapshot()

        if (hooks.error) {
          await hooks.error({ context, clientId, requestId, ts: Date.now(), servicename, operation, error: preError })
        }
        if (hooks.stats) {
          await hooks.stats(Object.assign({ context, clientId, requestId, ts: Date.now(), servicename, operation }, snapshot))
        }
        if (hooks.end) {
          await hooks.end({ context, clientId, requestId, ts: Date.now(), servicename, operation, options: requestOptions, error: preError, stats: snapshot })
        }

        throw preError
      }

      const end = async function (error, response) {
        if (error) {
          if (error.message === 'Client request timeout' || error.code === 'ETIMEDOUT') {
            self._stats.increment('timeouts')
            debug('Client request timeout, no of timeouts: %i - Maximum timeouts: %i', self._stats._counts.timeouts, config.maxFailures)
          }
          debug('Client request error: %s', error.message)
          self._circuitState.fail()
        } else {
          self._circuitState.succeed()
        }

        const snapshot = self._stats.snapshot()

        if (hooks.stats) {
          await hooks.stats(Object.assign({ context, clientId, requestId, ts: Date.now(), servicename, operation }, snapshot))
        }
        if (hooks.end) {
          await hooks.end({ context, clientId, requestId, ts: Date.now(), servicename, operation, options: requestOptions, error, response, stats: snapshot })
        }
      }

      debug('doRequest(): making request')

      try {
        const response = await Request(method, path, requestOptions, reqHooks)
        debug('doRequest(): completed request')
        await end(null, response)
        return response
      } catch (error) {
        debug('doRequest(): request error: %s', error.message)
        await end(error)
        throw error
      }
    }

    debug('request(): making request id %s to operation %s', requestId, operation)

    return doRequest()
  }

  async read (response, options) {
    return Read(response, options)
  }
}

module.exports = ServiceClient
