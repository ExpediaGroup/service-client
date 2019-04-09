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

const Hoek = require('hoek')
const Wreck = require('wreck')
const Agent = require('./agent')
const Schema = require('./schema')
const GlobalConfig = require('./config')
const Client = require('./client')

const debug = require('debug')('serviceclient:factory')

// Factory for client creation
const create = function (servicename, overrides = {}) {
  const base = Hoek.applyToDefaultsWithShallow(GlobalConfig.base, GlobalConfig.overrides[servicename] || {}, ['agent'])
  const merged = Hoek.applyToDefaultsWithShallow(base, overrides, ['agent'])

  const config = Schema.validateCreate(merged)

  /* istanbul ignore else */
  if (!config.agent) {
    config.agent = Agent.create(config.protocol, config)
  }

  const client = new Client(servicename, config)

  // Proxy Wreck functions as instance methods
  Object.assign(client, proxiedWreckFunctions)

  debug('create(): created client id %s for service %s', client.id, servicename)

  return client
}

const proxiedWreckFunctions = {
  read () { return Wreck.read(...arguments) },
  toReadableStream () { return Wreck.toReadableStream(...arguments) },
  parseCacheControl () { return Wreck.parseCacheControl(...arguments) },
  agents: Wreck.agents
}

const use = function (plugins = []) {
  if (!Array.isArray(plugins)) {
    plugins = [plugins]
  }

  plugins.forEach((plugin) => {
    /* istanbul ignore else */
    if (typeof plugin === 'function' && !GlobalConfig.plugins.includes(plugin)) {
      GlobalConfig.plugins.push(plugin)
    }
  })
}

const mergeConfig = function (externalConfig = {}) {
  externalConfig = Schema.validateGlobalConfig(externalConfig)

  // merge base configuration
  Hoek.merge(GlobalConfig.base, externalConfig.base || {})

  // merge overrides for each service
  Object.keys(externalConfig.overrides || {}).forEach((serviceName) => {
    GlobalConfig.overrides[serviceName] = GlobalConfig.overrides[serviceName] || {}
    Hoek.merge(GlobalConfig.overrides[serviceName], externalConfig.overrides[serviceName])
  })

  // merge and dedupe plugins
  use(externalConfig.plugins)
}

// Exported API
const ServiceClient = {
  create,
  ...proxiedWreckFunctions,
  use,
  mergeConfig
}

module.exports = ServiceClient
