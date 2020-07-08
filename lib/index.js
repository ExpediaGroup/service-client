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

const Hoek = require('@hapi/hoek')

const Agent = require('./agent')
const Schema = require('./schema')
const GlobalConfig = require('./config')
const Client = require('./client')
const Read = require('./http/read')

const debug = require('debug')('serviceclient:factory')

// Factory for client creation
const create = function (servicename, overrides = {}) {
  if (!servicename) {
    throw new Error('A service name is required')
  }

  // Were no overrides passed?
  const noOverrides = !Object.keys(overrides).length

  // Look for an existing client w/ the specified service name
  let client = GlobalConfig.clientInstances[servicename]

  // If no overrides are passed and a client already exists, return it
  if (noOverrides && client) {
    return client
  }

  // Come up with the new client's configuration
  const base = Hoek.applyToDefaults(GlobalConfig.base, GlobalConfig.overrides[servicename] || {}, { shallow: ['agent'] })
  const merged = Hoek.applyToDefaults(base, overrides, { shallow: ['agent'] })
  const config = Schema.validateCreate(servicename, merged)

  // If an agent was not included in the overrides, create one and add it to the config
  // istanbul ignore else */
  if (!config.agent) {
    config.agent = Agent.create(config.protocol, config)
  }

  // Create a new client
  client = new Client(servicename, config)
  debug('create(): created client id %s for service %s', client.id, servicename)

  // If no overrides are passed, cache the new client
  if (noOverrides) {
    GlobalConfig.clientInstances[servicename] = client
  }

  // Return the new client
  return client
}

const remove = function (servicename) {
  delete GlobalConfig.clientInstances[servicename]
}

const use = function (plugins = []) {
  if (!Array.isArray(plugins)) {
    plugins = [plugins]
  }

  plugins.forEach((plugin) => {
    // istanbul ignore else
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
  remove,
  read: Read,
  use,
  mergeConfig
}

module.exports = ServiceClient
