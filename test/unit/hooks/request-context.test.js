'use strict'

const Nock = require('nock')
const Sinon = require('sinon')
const Hapi = require('hapi')
const HapiRequest = require('hapi/lib/request')
const Wreck = require('wreck')

const ServiceClient = require('../../../lib')
const GlobalConfig = require('../../../lib/config')

describe('Using ServiceClient in the context of a Hapi request', () => {
  let suite

  beforeEach(async function () {
    suite = {}
    suite.sandbox = Sinon.createSandbox()

    suite.server = Hapi.server({ port: 8080 })

    Nock('http://service.local:80')
      .defaultReplyHeaders({
        'Content-Type': 'application/json'
      })
      .get('/test')
      .reply(200, { message: 'success' })

    suite.server.route([
      {
        method: 'GET',
        path: '/',
        async handler (request) {
          await suite.client.request({ context: request, method: 'GET', path: '/test', operation: 'GET_test' })
          return 'OK'
        }
      }
    ])
    await suite.server.start()
  })

  afterEach(async function () {
    await suite.server.stop()
    GlobalConfig.plugins = []
    suite.sandbox.restore()
    suite = null
    ServiceClient.remove('myservice')
  })

  it('should process requests that may be in flight simultaneously', async function () {
    const requestSpy = suite.sandbox.spy()
    ServiceClient.use(() => {
      return {
        async request ({ context }) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          requestSpy(context)
        }
      }
    })
    suite.client = ServiceClient.create('myservice', {
      hostname: '0.0.0.0',
      port: 8080
    })

    await Promise.all([
      Wreck.request('GET', '/', { baseUrl: 'http://0.0.0.0:8080' }),
      Wreck.request('GET', '/', { baseUrl: 'http://0.0.0.0:8080' })
    ])

    Sinon.assert.calledTwice(requestSpy)
    Sinon.assert.alwaysCalledWith(requestSpy, Sinon.match({
      info: Sinon.match({
        id: Sinon.match.defined
      }),
      url: Sinon.match.defined
    }))
  })

  it('should pass the incoming request via `context` to the `request` hook', async function () {
    const requestSpy = suite.sandbox.spy()
    ServiceClient.use(() => {
      return {
        request ({ context }) {
          requestSpy(context)
        }
      }
    })
    suite.client = ServiceClient.create('myservice', {
      hostname: '0.0.0.0',
      port: 8080
    })

    await Wreck.request('GET', '/', { baseUrl: 'http://0.0.0.0:8080' })

    Sinon.assert.alwaysCalledWith(requestSpy, Sinon.match.instanceOf(HapiRequest))
  })
})
