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

const Wreck = require('@hapi/wreck')
const QueryString = require('querystring')
const Cuid = require('cuid')

const Read = require('./read')

const debug = require('debug')('serviceclient:request')

const makeRequest = async function (method, path, options, hooks) {
  // The underlying socket
  let socket

  // Wreck request promise.
  const deferred = Wreck.request(method, path, options)
  // Underlying request object.
  const request = deferred.req

  // If there is no request there must be an error — short circuit.
  if (!request) {
    debug('makeRequest(): no request, must be an error')
    return deferred
  }

  let timer

  // Lookup event occurs (on socket) after resolving the hostname but before the socket connects.
  const onlookup = function (error, address, family, host) {
    debug('makeRequest(): lookup event')
    if (hooks.lookup) {
      hooks.lookup(options.id, error, address, family, host)
    }
  }

  // Connect event occurs (on socket) when socket connects.
  const onconnect = function () {
    if (~options.baseUrl.indexOf('http:')) {
      clearTimeout(timer)
      timer = undefined
    }
    debug('makeRequest(): connect event')
    if (hooks.connect) {
      hooks.connect(options.id)
    }
  }

  // SSL handshake results in a secureConnect event.
  const onsecureconnect = function () {
    if (~options.baseUrl.indexOf('https:')) {
      clearTimeout(timer)
      timer = undefined
    }
    debug('makeRequest(): secureConnect event')
    if (hooks.secureConnect) {
      hooks.secureConnect(options.id)
    }
  }

  // Socket event occurs when the kernel hands you a socket to use.
  const onsocket = function (sock) {
    socket = sock

    if (sock.connecting) {
      sock.once('lookup', onlookup)
      sock.once('connect', onconnect)
      sock.once('secureConnect', onsecureconnect)

      // Support for socket connect timeout.
      if (options.connectTimeout) {
        debug('makeRequest(): setting connectTimeout timer for %dms', options.connectTimeout)

        timer = setTimeout(() => {
          const error = new Error('Socket connect timeout.')
          error.name = 'connectTimeout'
          error.code = 'ETIMEDOUT'
          error.statusCode = 504
          debug('makeRequest(): timeout error')
          request.emit('error', error)
        }, options.connectTimeout)
      }
    }

    debug('makeRequest(): socket event')
    if (hooks.socket) {
      hooks.socket(options.id, sock)
    }
  }

  // Cleanup on request complete.
  const oncomplete = function () {
    debug('makeRequest(): complete')
    if (request) {
      request.removeListener('socket', onsocket)
    }
    if (socket) {
      socket.removeListener('lookup', onlookup)
      socket.removeListener('connect', onconnect)
      socket.removeListener('secureConnect', onsecureconnect)
      socket = null
    }
  }

  request.once('socket', onsocket)

  try {
    let response = await deferred

    debug('makeRequest(): response event')
    if (hooks.response) {
      response = await hooks.response(options.id, response) || response
    }

    if (!options.read) {
      debug('makeRequest(): payload read skipped')
      oncomplete()
      return response
    }

    response.payload = await Read(response, options.readOptions)

    debug('makeRequest(): payload read')
    oncomplete()
    return response
  } catch (error) {
    debug('makeRequest(): error getting response')

    oncomplete()
    throw error
  }
}

// Wrapper for retrying request on connect timeout.
const retryable = function (method, path, options, hooks) {
  options.connectRetries = 0

  const tryable = async function () {
    try {
      debug('retryable(): invoking request')
      return await makeRequest(method, path, options, hooks)
    } catch (error) {
      debug('retryable(): timeout error')
      if (error.code === 'ETIMEDOUT') {
        if (options.connectRetries < options.maxConnectRetry) {
          debug('retryable(): retrying')
          options.connectRetries++
          return tryable()
        }
      }
      throw error
    }
  }

  return tryable()
}

const create = async function (method, path, options, hooks = {}) {
  const id = Cuid()

  // If it is going to retry connect failures, use the retryable wrapper.
  const deferred = options.maxConnectRetry > 0 ? retryable : makeRequest

  // Request is beginning hook.
  debug('makeRequest(): init event')
  if (hooks.init) {
    await hooks.init(id, method, path, options)
  }

  options.id = id

  // Enables a path with /foo/{bar} and { pathParams: { bar: "abc" }}
  path = !options.pathParams ? path : path.replace(/{([^}]+)}/g, (...args) => {
    return options.pathParams[args[1]] || args[0]
  })

  if (options.queryParams) {
    path += `${path.includes('?') ? '&' : '?'}${QueryString.stringify(options.queryParams)}`
  }

  // Remove 'content-length' from request headers.
  // If the payload is not a buffer, this value may have been calculated before any
  // escaping took place, resulting in a content-length mismatch. This will result
  // in the downstream service waiting for bytes that will never be sent.
  // By doing this, we defer to Wreck to calculate the content length.
  if (options.headers) {
    delete options.headers['content-length']
  }

  debug('create(): invoking request')

  try {
    return await deferred(method, path, options, hooks)
  } catch (error) {
    if (hooks.error) {
      await hooks.error(id, error)
    }
    throw error
  }
}

module.exports = create
