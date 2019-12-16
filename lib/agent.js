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

const Tls = require('tls')
const Http = require('http')
const Https = require('https')
const Hoek = require('@hapi/hoek')

const create = function (protocol, options = {}) {
  let agentOptions = Hoek.applyToDefaults({}, options.agentOptions || {}, { shallow: ['secureContext'] })

  if (protocol.indexOf('https') >= 0) {
    // Pre cache secureContext for handshake so it doesn't create one every connect.
    if (!agentOptions.secureContext) {
      agentOptions.secureContext = Tls.createSecureContext(agentOptions.secureContextOptions || {})
    }

    delete agentOptions.secureContextOptions

    return new Https.Agent(agentOptions)
  }

  return new Http.Agent(agentOptions)
}

module.exports = { create }
