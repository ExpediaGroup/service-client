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

const Http = require('http')
const Https = require('https')
const Tls = require('tls')
const Hoek = require('hoek')
const Joi = require('joi')

const createSchema = Joi.object({
  // requests
  protocol: Joi.string().valid('http:', 'https:'),
  hostname: Joi.alternatives().try(Joi.string(), Joi.func()).required(),
  regions: Joi.array().items(Joi.string()),
  port: Joi.number(),
  basePath: Joi.string().default('/').regex(/^\//),

  // resiliency
  connectTimeout: Joi.number(),
  maxConnectRetry: Joi.number(),
  timeout: Joi.number(),
  maxFailures: Joi.number(), // circuit breaking
  resetTime: Joi.number(), // circuit breaking

  // agent options
  agent: Joi.alternatives([
    Joi.object().type(Http.Agent),
    Joi.object().type(Https.Agent)
  ]),
  agentOptions: Joi.object({
    secureContext: Joi.object().type(Tls.createSecureContext().constructor),
    secureContextOptions: Joi.object().unknown(true)
  }).unknown(true),

  // plugin options
  plugins: Joi.object()
}).unknown(true)

const requestDefaults = {
  path: '/',
  headers: {},
  read: true,
  readOptions: {
    timeout: 20000,
    json: true,
    gunzip: false
  },
  plugins: {}
}

const requestSchema = Joi.object({
  context: Joi.object().description('Usually the hapi `request`'),
  path: Joi.string().default(requestDefaults.path),
  method: Joi.string().required(),
  operation: Joi.string().required().description('Ex: GET_supply_properties_v1'),
  queryParams: Joi.object(),
  pathParams: Joi.object(),
  headers: Joi.object().default(requestDefaults.headers),
  payload: Joi.any(),
  redirects: Joi.alternatives().try(Joi.number(), Joi.valid(false)), // default value provided by global config
  connectTimeout: Joi.number(), // default value provided by global config
  maxConnectRetry: Joi.number(), // default value provided by global config
  timeout: Joi.number(), // default value provided by global config
  agent: Joi.object(), // default value provided by global config
  read: Joi.bool().default(requestDefaults.read),
  readOptions: Joi.object({
    timeout: Joi.number().default(requestDefaults.readOptions.timeout),
    json: Joi.valid(true, 'strict', 'force').default(requestDefaults.readOptions.json),
    maxBytes: Joi.number(),
    gunzip: Joi.valid(true, false, 'force').default(requestDefaults.readOptions.gunzip)
  }).default(requestDefaults.readOptions),
  plugins: Joi.object().default(requestDefaults.plugins)
}).unknown(true).default(requestDefaults)

// defaults listed in config.js
const globalSchema = Joi.object({
  plugins: Joi.array().items(Joi.func()),
  base: Joi.object(),
  overrides: Joi.object().pattern(/.+/, Joi.object())
})

function validate (schema, options) {
  const validated = Joi.validate(options, schema)

  Hoek.assert(!validated.error, validated.error)

  return validated.value
}

function validateCreate (options) {
  return validate(createSchema, options)
}

function validateRequest (options) {
  return validate(requestSchema, options)
}

function validateGlobalConfig (options) {
  return validate(globalSchema, options)
}

module.exports = {
  validateCreate,
  validateRequest,
  validateGlobalConfig
}
