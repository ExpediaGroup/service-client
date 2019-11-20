'use strict'

const Nock = require('nock')
const Sinon = require('sinon')
const Hapi = require('hapi')

const ServiceClient = require('../../../lib')
const GlobalConfig = require('../../../lib/config')

describe('Using ServiceClient in the context of a Hapi server', () => {
  let suite

  beforeEach(async function () {
    suite = {}
    suite.sandbox = Sinon.createSandbox()

    suite.server = Hapi.server({ port: 8080 })

    Nock('http://myservice.service.local:80')
      .defaultReplyHeaders({
        'Content-Type': 'application/json'
      })
      .get('/test')
      .reply(200, { message: 'success' })

    await suite.server.start()
  })

  afterEach(async function () {
    await suite.server.stop()
    GlobalConfig.plugins = []
    suite.sandbox.restore()
    suite = null
    ServiceClient.destroy('myservice')
  })

  it('should pass the server via `context` to the `request` hook', async function () {
    const requestSpy = suite.sandbox.spy()
    ServiceClient.use(() => {
      return {
        request ({ context }) {
          requestSpy(context)
        }
      }
    })
    suite.client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

    await suite.client.request({ context: suite.server, method: 'GET', path: '/test', operation: 'GET_test' })

    Sinon.assert.alwaysCalledWith(requestSpy, suite.server)
  })
})
