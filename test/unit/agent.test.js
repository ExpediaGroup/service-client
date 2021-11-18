'use strict'

const Fs = require('fs')
const Path = require('path')
const Http = require('http')
const Https = require('https')
const Tls = require('tls')
const Sinon = require('sinon')
const { assert } = require('chai')

const Agent = require('../../lib/agent')

describe('agents', () => {
  let sandbox

  beforeEach(() => {
    sandbox = Sinon.createSandbox()
    sandbox.origGlobalAgentOptions = { ...Https.globalAgent.options }
  })

  afterEach(() => {
    Https.globalAgent.options = sandbox.origGlobalAgentOptions
    sandbox.restore()
    sandbox = null
  })

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
    sandbox.spy(Tls, 'createSecureContext')

    const instance = Agent.create('https', {
      agentOptions: {
        secureContextOptions: {
          ca: ['cert1']
        }
      }
    })

    assert.ok(instance instanceof Https.Agent, 'is https agent.')
    assert.ok(instance.options.secureContext, 'is pre-cached secureContext.')
    Sinon.assert.calledWith(Tls.createSecureContext, { ca: ['cert1'], cert: undefined, key: undefined })
  })

  it('should include globalAgent options: ca, cert, key', () => {
    sandbox.spy(Tls, 'createSecureContext')

    const ca = [Fs.readFileSync(Path.join(__dirname, '..', 'fixtures', 'ca.crt'))]
    const cert = Fs.readFileSync(Path.join(__dirname, '..', 'fixtures', 'cert.pem'))
    const key = Fs.readFileSync(Path.join(__dirname, '..', 'fixtures', 'key.pem'))

    Https.globalAgent.options = { ca, cert, key }

    const instance = Agent.create('https', {
      agentOptions: {
        secureContextOptions: {
          foo: 'bar'
        }
      }
    })

    assert.ok(instance instanceof Https.Agent, 'is https agent.')
    assert.ok(instance.options.secureContext, 'is pre-cached secureContext.')
    Sinon.assert.calledWith(Tls.createSecureContext, { ca, cert, key, foo: 'bar' })
  })
})
