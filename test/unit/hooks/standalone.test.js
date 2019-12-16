'use strict'

const EventEmitter = require('events')
const Nock = require('nock')
const Sinon = require('sinon')
const Wreck = require('@hapi/wreck')
const { assert } = require('chai')

const ServiceClient = require('../../../lib')
const GlobalConfig = require('../../../lib/config')

describe('Using ServiceClient in a standalone context', () => {
  let suite

  beforeEach(function () {
    suite = {}
    suite.sandbox = Sinon.createSandbox()

    Nock('http://myservice.service.local:80')
      .defaultReplyHeaders({
        'Content-Type': 'application/json'
      })
      .get('/')
      .delayConnection(100)
      .reply(200, { message: 'success' })
  })

  afterEach(function () {
    GlobalConfig.plugins = []
    suite.sandbox.restore()
    suite = null
    ServiceClient.remove('myservice')
  })

  it('should call hooks (successful request)', async function () {
    const spies = {
      request: suite.sandbox.spy(),
      init: suite.sandbox.spy(),
      socket: suite.sandbox.spy(),
      lookup: suite.sandbox.spy(),
      connect: suite.sandbox.spy(),
      secureConnect: suite.sandbox.spy(),
      response: suite.sandbox.spy(),
      error: suite.sandbox.spy(),
      stats: suite.sandbox.spy(),
      end: suite.sandbox.spy()
    }
    ServiceClient.use(() => {
      return spies
    })

    const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

    const response = await client.request({ method: 'GET', path: '/', operation: 'GET_' })

    assert.ok(response, 'is response.')

    Sinon.assert.calledOnce(spies.request)
    Sinon.assert.calledOnce(spies.init)
    Sinon.assert.calledOnce(spies.socket)
    Sinon.assert.notCalled(spies.lookup) // not performed when using Nock
    Sinon.assert.notCalled(spies.connect) // not performed when using Nock
    Sinon.assert.notCalled(spies.secureConnect) // not performed when using Nock
    Sinon.assert.calledOnce(spies.response)
    Sinon.assert.notCalled(spies.error) // no error for this test
    Sinon.assert.calledOnce(spies.stats)
    Sinon.assert.calledOnce(spies.end)

    Sinon.assert.callOrder(spies.request, spies.init, spies.socket, spies.response, spies.stats, spies.end)
  })

  it('should call hooks (error thrown in plugin initialization)', async function () {
    ServiceClient.use(() => {
      throw new Error('Plugin init error')
    })

    const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

    try {
      await client.request({ method: 'GET', path: '/', operation: 'GET_' })
      assert.fail('should fail')
    } catch (err) {
      assert.ok(err, 'is error')
      assert.equal(err.message, 'Plugin init error')
    }
  })

  it('should call hooks (error thrown in plugin request hook)', async function () {
    ServiceClient.use(() => {
      return {
        async request () {
          await new Promise((resolve) => setTimeout(resolve, 100))
          throw new Error('Plugin request hook error')
        }
      }
    })

    const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

    try {
      await client.request({ method: 'GET', path: '/', operation: 'GET_' })
      assert.fail('should fail')
    } catch (err) {
      assert.ok(err, 'is error')
      assert.equal(err.message, 'Plugin request hook error')
    }
  })

  it('should call hooks (failed request; connection error;)', async function () {
    class StubbedRequest extends EventEmitter {}
    const req = new StubbedRequest()
    let error

    req.once('error', function (err) {
      error = err
    })

    const res = new Promise((resolve, reject) => setTimeout(function () {
      if (error) {
        return reject(error)
      }
      return resolve({ statusCode: 200 })
    }, 200))

    res.req = req

    suite.sandbox.stub(Wreck, 'request').returns(res)

    const spies = {
      request: suite.sandbox.spy(),
      init: suite.sandbox.spy(),
      socket: suite.sandbox.spy(),
      lookup: suite.sandbox.spy(),
      connect: suite.sandbox.spy(),
      secureConnect: suite.sandbox.spy(),
      response: suite.sandbox.spy(),
      error: suite.sandbox.spy(),
      stats: suite.sandbox.spy(),
      end: suite.sandbox.spy()
    }
    ServiceClient.use(() => {
      return spies
    })

    const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

    const deferred = client.request({ method: 'GET', path: '/', connectTimeout: 10, operation: 'GET_' })

    await new Promise((resolve) => setTimeout(resolve, 2))

    class StubbedSocket extends EventEmitter {}
    const socket = new StubbedSocket()
    socket.connecting = true
    req.emit('socket', socket)

    await new Promise((resolve) => setTimeout(resolve, 2))

    socket.emit('lookup')

    await new Promise((resolve) => setTimeout(resolve, 100))

    socket.emit('connect')
    socket.emit('secureConnect')

    try {
      await deferred
      assert.fail('should fail')
    } catch (err) {
      assert.ok(err, 'is error')
    }

    Sinon.assert.calledOnce(spies.request)
    Sinon.assert.calledOnce(spies.init)
    Sinon.assert.calledOnce(spies.socket)
    Sinon.assert.calledOnce(spies.lookup) // not performed when using Nock
    Sinon.assert.calledOnce(spies.connect)
    Sinon.assert.calledOnce(spies.secureConnect)
    Sinon.assert.notCalled(spies.response)
    Sinon.assert.calledOnce(spies.error) // no error for this test
    Sinon.assert.calledOnce(spies.stats)
    Sinon.assert.calledOnce(spies.end)

    Sinon.assert.callOrder(spies.request, spies.init, spies.socket, spies.lookup, spies.connect, spies.secureConnect, spies.error, spies.stats, spies.end)
  })

  it('should call hooks (failed request; read error;)', async function () {
    const spies = {
      request: suite.sandbox.spy(),
      init: suite.sandbox.spy(),
      socket: suite.sandbox.spy(),
      lookup: suite.sandbox.spy(),
      connect: suite.sandbox.spy(),
      secureConnect: suite.sandbox.spy(),
      response: suite.sandbox.spy(),
      error: suite.sandbox.spy(),
      stats: suite.sandbox.spy(),
      end: suite.sandbox.spy()
    }
    ServiceClient.use(() => {
      return spies
    })

    const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

    suite.sandbox.stub(Wreck, 'read').throws('Read Error')

    try {
      await client.request({ method: 'GET', path: '/', read: true, operation: 'GET_' })
      assert.fail('should fail')
    } catch (err) {
      assert.ok(err, 'is error')
    }

    Sinon.assert.calledOnce(spies.request)
    Sinon.assert.calledOnce(spies.init)
    Sinon.assert.calledOnce(spies.socket)
    Sinon.assert.notCalled(spies.lookup) // not performed when using Nock
    Sinon.assert.notCalled(spies.connect) // not performed when using Nock
    Sinon.assert.notCalled(spies.secureConnect) // not performed when using Nock
    Sinon.assert.calledOnce(spies.response)
    Sinon.assert.calledOnce(spies.error) // no error for this test
    Sinon.assert.calledOnce(spies.stats)
    Sinon.assert.calledOnce(spies.end)

    Sinon.assert.callOrder(spies.request, spies.init, spies.socket, spies.response, spies.error, spies.stats, spies.end)
  })

  it('should process hooks from both plugins', async function () {
    const spies1 = {
      request: suite.sandbox.spy(),
      end: suite.sandbox.spy()
    }

    const spies2 = {
      request: suite.sandbox.spy(),
      end: suite.sandbox.spy()
    }

    ServiceClient.use(() => {
      return spies1
    })

    ServiceClient.use(() => {
      return spies2
    })

    const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

    const response = await client.request({ method: 'GET', path: '/', operation: 'GET_' })

    assert.ok(response, 'is response.')

    // provided by the first plugin
    Sinon.assert.calledOnce(spies1.request)
    Sinon.assert.calledOnce(spies1.end)

    // provided by the second plugin
    Sinon.assert.calledOnce(spies2.request)
    Sinon.assert.calledOnce(spies2.end)
  })

  it('should await hooks', async function () {
    this.timeout(10000)

    const startDate = Date.now()

    ServiceClient.use(() => {
      return {
        async request () {
          await new Promise((resolve) => setTimeout(resolve, 200))
        },
        async init () {
          await new Promise((resolve) => setTimeout(resolve, 200))
        },
        async response () {
          await new Promise((resolve) => setTimeout(resolve, 200))
        },
        async stats () {
          await new Promise((resolve) => setTimeout(resolve, 200))
        },
        async end () {
          await new Promise((resolve) => setTimeout(resolve, 200))
        }
      }
    })

    const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

    const response = await client.request({ method: 'GET', path: '/', operation: 'GET_' })

    assert.ok(response, 'is response.')

    assert.isAbove(Date.now() - startDate, 1, '5 hooks each take 200ms to process')
  })

  it('should merge request options returned from each `request` hook', async function () {
    ServiceClient.use(() => {
      return {
        request () {
          return {
            fizz: 'buzz'
          }
        }
      }
    })

    ServiceClient.use(() => {
      return {
        request () {
          return {
            foo: 'bar'
          }
        }
      }
    })

    const initSpy = suite.sandbox.spy()
    ServiceClient.use(() => {
      return {
        init ({ options }) {
          initSpy(options)
        }
      }
    })

    const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

    const response = await client.request({ method: 'GET', path: '/', operation: 'GET_' })

    assert.ok(response, 'is response.')

    Sinon.assert.calledWith(initSpy, Sinon.match({
      foo: 'bar',
      fizz: 'buzz'
    }))
  })
})
