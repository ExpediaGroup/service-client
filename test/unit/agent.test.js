'use strict'

const Http = require('http')
const Https = require('https')
const Tls = require('tls')
const { assert } = require('chai')

const Agent = require('../../lib/agent')

describe('agents', () => {
  it('should return an http agent', () => {
    const instance = Agent.create('http')

    assert.ok(instance instanceof Http.Agent, 'is http agent.')
  })

  it('should return an http agent using the provided `agentOptions`', () => {
    const instance = Agent.create('http', {
      agentOptions: {
        keepAlive: true,
        keepAliveMsecs: 12345
      }
    })

    assert.ok(instance instanceof Http.Agent, 'is http agent.')
    assert.ok(instance.keepAlive === true, 'keepAlive is set')
    assert.ok(instance.keepAliveMsecs === 12345, 'keepAliveMsecs is set')
  })

  it('should return an https agent', () => {
    const instance = Agent.create('https')

    assert.ok(instance instanceof Https.Agent, 'is https agent.')
    assert.ok(instance.options.secureContext, 'is pre-cached secureContext.')
  })

  it('should return an https agent using the provided secureContext', () => {
    const instance = Agent.create('https', {
      agentOptions: {
        secureContext: Tls.createSecureContext()
      }
    })

    assert.ok(instance instanceof Https.Agent, 'is https agent.')
    assert.ok(instance.options.secureContext, 'is pre-cached secureContext.')
  })

  it('should return an https agent using the provided secureContextOptions', () => {
    const instance = Agent.create('https', {
      agentOptions: {
        secureContextOptions: {
          ca: ['cert1']
        }
      }
    })

    assert.ok(instance instanceof Https.Agent, 'is https agent.')
    assert.ok(instance.options.secureContext, 'is pre-cached secureContext.')
  })
})
