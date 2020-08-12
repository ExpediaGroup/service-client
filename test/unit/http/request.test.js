'use strict'

const EventEmitter = require('events')
const Fs = require('fs')
const Path = require('path')
const Http = require('http')
const Https = require('https')
const Nock = require('nock')
const Sinon = require('sinon')
const Wreck = require('@hapi/wreck')
const { assert } = require('chai')

const Request = require('../../../lib/http/request')

describe('request', () => {
  let suite

  beforeEach(() => {
    suite = {}
    suite.sandbox = Sinon.createSandbox()
  })

  afterEach(async () => {
    if (suite.server) {
      await suite.server.stop({ timeout: 1 })
    }
    suite.sandbox.restore()
    suite = null
  })

  async function makeRequest ({
    getDeferred,
    socketDelay = 2,
    lookupDelay = 2,
    connectDelay = 2,
    restoreRequest = true
  }) {
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

    suite.requestStub = suite.sandbox.stub(Wreck, 'request')
    suite.requestStub.returns(res)

    const deferred = getDeferred()

    await new Promise((resolve) => setTimeout(resolve, socketDelay))

    class StubbedSocket extends EventEmitter {}
    const socket = new StubbedSocket()
    socket.connecting = true
    req.emit('socket', socket)

    await new Promise((resolve) => setTimeout(resolve, lookupDelay))

    socket.emit('lookup')

    await new Promise((resolve) => setTimeout(resolve, connectDelay))

    socket.emit('connect')
    socket.emit('secureConnect')

    try {
      return await deferred
    } finally {
      if (restoreRequest) {
        Wreck.request.restore()
      }
    }
  }

  it('should make a successful request', async function () {
    const hooks = {
      init: suite.sandbox.spy(),
      socket: suite.sandbox.spy(),
      lookup: suite.sandbox.spy(),
      connect: suite.sandbox.spy(),
      secureConnect: suite.sandbox.spy(),
      response: suite.sandbox.spy(),
      error: suite.sandbox.spy()
    }

    const response = await makeRequest({
      getDeferred: () => Request('GET', '/v1/test/stuff', { baseUrl: 'https://service.local:80' }, hooks)
    })

    assert.equal(response.statusCode, 200, 'is ok.')

    Sinon.assert.calledOnce(hooks.init)
    Sinon.assert.calledOnce(hooks.socket)
    Sinon.assert.calledOnce(hooks.lookup)
    Sinon.assert.calledOnce(hooks.connect)
    Sinon.assert.calledOnce(hooks.secureConnect)
    Sinon.assert.calledOnce(hooks.response)
    Sinon.assert.notCalled(hooks.error) // no error for this test
  })

  it('should make an unsuccessful request (connection error)', async function () {
    const hooks = {
      init: suite.sandbox.spy(),
      socket: suite.sandbox.spy(),
      lookup: suite.sandbox.spy(),
      connect: suite.sandbox.spy(),
      secureConnect: suite.sandbox.spy(),
      response: suite.sandbox.spy(),
      error: suite.sandbox.spy()
    }

    try {
      await makeRequest({
        getDeferred: () => Request('GET', '/v1/test/stuff', { baseUrl: 'https://service.local:80', connectTimeout: 10 }, hooks),
        connectDelay: 100
      })
    } catch (err) {
      assert.ok(err, 'is an error.')
    }

    Sinon.assert.calledOnce(hooks.init)
    Sinon.assert.calledOnce(hooks.socket)
    Sinon.assert.calledOnce(hooks.lookup)
    Sinon.assert.calledOnce(hooks.connect)
    Sinon.assert.calledOnce(hooks.secureConnect)
    Sinon.assert.notCalled(hooks.response) // no response for this test
    Sinon.assert.calledOnce(hooks.error)
  })

  it('should make an unsuccessful request (read error)', async function () {
    suite.sandbox.stub(Wreck, 'read').throws('Read Error')

    const hooks = {
      init: suite.sandbox.spy(),
      socket: suite.sandbox.spy(),
      lookup: suite.sandbox.spy(),
      connect: suite.sandbox.spy(),
      secureConnect: suite.sandbox.spy(),
      response: suite.sandbox.spy(),
      error: suite.sandbox.spy()
    }

    try {
      await makeRequest({
        getDeferred: () => Request('GET', '/v1/test/stuff', { baseUrl: 'https://service.local:80', read: true }, hooks)
      })
    } catch (err) {
      assert.ok(err, 'is an error.')
    }

    Sinon.assert.calledOnce(hooks.init)
    Sinon.assert.calledOnce(hooks.socket)
    Sinon.assert.calledOnce(hooks.lookup)
    Sinon.assert.calledOnce(hooks.connect)
    Sinon.assert.calledOnce(hooks.secureConnect)
    Sinon.assert.calledOnce(hooks.response)
    Sinon.assert.calledOnce(hooks.error)
  })

  it('should make a successful request with `pathParams`', async function () {
    Nock('http://service.local:80')
      .get('/v1/test/stuff')
      .reply(200, { message: 'success' })

    const response = await Request('GET', '/v1/test/{thing}', { baseUrl: 'http://service.local:80', pathParams: { thing: 'stuff' } })
    assert.equal(response.statusCode, 200, 'is ok')
  })

  it('should make a successful request to a url containing the placeholder syntax if `pathParams` does not contain a matching key', async function () {
    Nock('http://service.local:80')
      .get('/v1/test/%7Bthing%7D')
      .reply(200, { message: 'success' })

    const response = await Request('GET', '/v1/test/{thing}', { baseUrl: 'http://service.local:80', pathParams: { } })
    assert.equal(response.statusCode, 200, 'is ok')
  })

  it('should make a successful request with `queryParams`', async function () {
    Nock('http://service.local:80')
      .get('/v1/test/stuff?thing=1')
      .reply(200, { message: 'success' })

    const response = await Request('GET', '/v1/test/stuff', { baseUrl: 'http://service.local:80', queryParams: { thing: 1 } })
    assert.equal(response.statusCode, 200, 'is ok')
  })

  it('should make a successful request with queryParams in path', async function () {
    Nock('http://service.local:80')
      .get('/v1/test/stuff?thing=1&test=2')
      .reply(200, { message: 'success' })

    const response = await Request('GET', '/v1/test/stuff?thing=1', { baseUrl: 'http://service.local:80', queryParams: { test: 2 } })
    assert.equal(response.statusCode, 200, 'is ok')
  })

  it('should make a successful request with `read: true`', async function () {
    Nock('http://service.local:80')
      .get('/v1/test/stuff')
      .reply(200, { message: 'success' })

    const response = await Request('GET', '/v1/test/stuff', { baseUrl: 'http://service.local:80', read: true })
    assert.equal(response.statusCode, 200, 'is ok')
    assert.ok(response.payload, 'is body')
  })

  it('should make a successful request without `connectTimeout`', async function () {
    const response = await makeRequest({
      getDeferred: () => Request('GET', '/v1/test/stuff', { baseUrl: 'https://service.local:80', connectTimeout: 0 })
    })

    assert.equal(response.statusCode, 200, 'is ok.')
  })

  it('should make an unsuccessful request with `connectTimeout: 10`', async function () {
    try {
      await makeRequest({
        getDeferred: () => Request('GET', '/v1/test/stuff', { baseUrl: 'https://service.local:80', connectTimeout: 10 }),
        connectDelay: 100
      })
      assert.fail('should fail')
    } catch (error) {
      assert.ok(error, 'is error.')
      assert.equal(error.code, 'ETIMEDOUT', 'is timeout error.')
      assert.equal(error.name, 'connectTimeout', 'is named connectTimeout.')
      assert.equal(error.statusCode, 504, 'is bad gateway.')
    }
  })

  it('should make an unsuccessful request with `connectTimeout: 10`, `maxConnectRetry: 1` and retries have been exceeded', async function () {
    try {
      await makeRequest({
        getDeferred: () => Request('GET', '/v1/test/stuff', { baseUrl: 'https://service.local:80', connectTimeout: 10, maxConnectRetry: 1 }),
        connectDelay: 100,
        restoreRequest: false
      })
      assert.fail('should fail')
    } catch (error) {
      // This should be 2 which indicates the request was tried once and subsequent call failed (i.e. a retry occured)
      assert.equal(Wreck.request.callCount, 2, 'initial + 1 retry')
      assert.equal(error.code, 'ETIMEDOUT')
    }
  })

  it('should make an unsuccessful request with an invalid method `EXPLODE`', async function () {
    try {
      await Request('EXPLODE', '/v1/test/stuff', { baseUrl: 'http://service.local:80' })
      assert.fail('should fail')
    } catch (error) {
      assert.ok(error, 'is failed.')
    }
  })

  it('should make a successful request, falling back to a default path and baseUrl', async function () {
    Nock('http://service.local:80')
      .get('/')
      .reply(200, { message: 'success' })

    try {
      await Request('GET', undefined, { baseUrl: 'http://service.local:80' })
    } catch (error) {
      assert.fail('is failed.')
    }
  })

  it('should make an unsuccessful request with invalid options', async function () {
    try {
      await Request('GET', '/v1/test/stuff', 1)
      assert.fail('should fail')
    } catch (error) {
      assert.ok(error, 'is failed.')
    }
  })

  describe('`content-length` header', function () {
    it('should strip the `content-length` header before passing the request options off to the http library', async function () {
      suite.requestStub = suite.sandbox.stub(Wreck, 'request').resolves({})

      await Request('POST', '/v1/test/stuff', {
        baseUrl: 'http://service.local:80',
        headers: { 'content-length': '9999999' },
        payload: 'this-is-data'
      })

      Sinon.assert.calledWith(suite.requestStub, 'POST', '/v1/test/stuff', Sinon.match({
        baseUrl: 'http://service.local:80',
        headers: {},
        payload: 'this-is-data',
        id: Sinon.match.string
      }))
    })

    it('should populate the `content-length` header with the correct payload size in the http library', async function () {
      const nock = Nock('http://service.local:80', {
        reqheaders: {
          host: 'service.local',
          'content-length': 12
        }
      })
        .post('/v1/test/stuff')
        .reply(200, { message: 'success' })

      await Request('POST', '/v1/test/stuff', {
        baseUrl: 'http://service.local:80',
        headers: { 'content-length': '9999999' },
        payload: 'this-is-data'
      })

      assert.isTrue(nock.isDone())
    })
  })

  describe('http real server', () => {
    let port
    let httpServer

    before(() => {
      httpServer = Http.createServer((req, res) => {
        res.writeHead(200)
        res.end()
      })

      const listen = httpServer.listen(() => {
        port = listen.address().port
      }).unref()
    })

    after(() => {
      httpServer.close()
      httpServer = null
    })

    it('i can haz http request', async function () {
      const called = {}

      const hooks = {
        socket () {
          called.socket = true
        },
        connect () {
          called.connect = true
        }
      }

      const response = await Request('GET', '/v1/test/stuff', { baseUrl: `http://localhost:${port}`, rejectUnauthorized: false }, hooks)

      assert.equal(response.statusCode, 200, 'is ok.')
      assert.ok(called.socket, 'is socket.')
      assert.ok(called.connect, 'is connect.')
    })
  })

  describe('https real server', () => {
    let port
    let httpsServer

    before(() => {
      httpsServer = Https.createServer({
        key: Fs.readFileSync(Path.join(__dirname, '..', '..', 'fixtures', 'key.pem')),
        cert: Fs.readFileSync(Path.join(__dirname, '..', '..', 'fixtures', 'cert.pem')),
        passphrase: 'passphrase'
      }, (req, res) => {
        res.writeHead(200)
        res.end()
      })

      const listen = httpsServer.listen(() => {
        port = listen.address().port
      }).unref()
    })

    after(() => {
      httpsServer.close()
      httpsServer = null
    })

    it('i can haz https request', async function () {
      const called = {}

      const hooks = {
        socket () {
          called.socket = true
        },
        connect () {
          called.connect = true
        },
        secureConnect () {
          called.secureConnect = true
        }
      }

      const response = await Request('GET', '/v1/test/stuff', { baseUrl: `https://localhost:${port}`, rejectUnauthorized: false }, hooks)

      assert.equal(response.statusCode, 200, 'is ok.')
      assert.ok(called.socket, 'is socket.')
      assert.ok(called.connect, 'is connect.')
      assert.ok(called.secureConnect, 'is secureConnect.')
    })
  })
})
