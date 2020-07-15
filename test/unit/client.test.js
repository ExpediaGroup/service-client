'use strict'

const EventEmitter = require('events')
const { IncomingMessage } = require('http')
const Nock = require('nock')
const Hoek = require('@hapi/hoek')
const { assert } = require('chai')
const Sinon = require('sinon')
const Wreck = require('@hapi/wreck')

const ServiceClient = require('../../lib')
const Hooks = require('../../lib/hooks')

describe('client', function () {
  let suite

  beforeEach(function () {
    suite = {}
    suite.sandbox = Sinon.createSandbox()
  })

  afterEach(function () {
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

    suite.sandbox.stub(Wreck, 'request').returns(res)

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

  describe('service-client configuration', () => {
    beforeEach(() => {
      suite.originalConfig = Hoek.clone(__serviceclientconfig) // eslint-disable-line no-undef
      suite.originalEnvVars = Hoek.clone(process.env)

      process.env.NODE_ENV = 'development'
      process.env.MPAAS_ENVIRONMENT = 'development'
    })

    afterEach(() => {
      Object.assign(__serviceclientconfig, suite.originalConfig) // eslint-disable-line no-undef
      process.env = suite.originalEnvVars
      ServiceClient.remove('myservice')
    })

    it('should throw an error if creating an instance without a service name', () => {
      assert.throws(function () {
        ServiceClient.create(undefined, { hostname: 'foobar' })
      }, 'A service name is required')
    })

    it('should throw an error if creating an instance without a hostname', () => {
      assert.throws(function () {
        ServiceClient.create('example-service')
      }, '"hostname" is required. servicename=example-service')
    })

    it('should assign a version to the client', () => {
      const client = ServiceClient.create('myservice', { hostname: 'vrbo.com' })

      assert.isDefined(client._version)
    })

    it('should fetch client configuration', () => {
      const client = ServiceClient.create('myservice', {
        hostname: 'vrbo.com',
        plugins: {
          auth: 'foobar'
        }
      })

      const result = client.config('plugins.auth')
      assert.equal(result, 'foobar')
    })

    it('should use the hostname function provided in the client config', async () => {
      Nock('http://myservice-test.us-east-1.aws')
        .get('/')
        .reply(200, { message: 'success' })

      const client = ServiceClient.create('myservice', { hostname: () => 'myservice-test.us-east-1.aws' })

      const response = await client.request({ method: 'GET', operation: 'GET_' })

      assert.ok(response, 'is response.')
      assert.equal(response.statusCode, 200, 'is ok response.')
      assert.ok(response.payload, 'is body')
      assert.equal(client.stats.executions, 1, 'is executions.')
    })

    it('should use the hostname function provided in the client config', async () => {
      Nock('http://myservice-test.us-east-1.aws')
        .get('/')
        .reply(200, { message: 'success' })

      const hostnameStub = suite.sandbox.stub().returns('myservice-test.us-east-1.aws')

      const client = ServiceClient.create('myservice', {
        hostname: hostnameStub,
        hostnameConfig: {
          foo: 'bar'
        }
      })

      const response = await client.request({ method: 'GET', operation: 'GET_' })

      assert.ok(response, 'is response.')
      assert.equal(response.statusCode, 200, 'is ok response.')
      assert.ok(response.payload, 'is body')
      assert.equal(client.stats.executions, 1, 'is executions.')

      Sinon.assert.calledWith(hostnameStub, 'myservice', Sinon.match({ foo: 'bar' }))
    })

    it('should use the hostname string provided in the client config', async () => {
      __serviceclientconfig.overrides.myoverride = { hostname: 'myoverride.service.local' } // eslint-disable-line no-undef

      Nock('http://myoverride.service.local:80')
        .get('/')
        .reply(200, { message: 'success' })

      const client = ServiceClient.create('myoverride')

      const response = await client.request({ method: 'GET', operation: 'GET_' })

      assert.ok(response, 'is response.')
      assert.equal(response.statusCode, 200, 'is ok response.')
      assert.ok(response.payload, 'is body')
      assert.equal(client.stats.executions, 1, 'is executions.')
    })

    it('should set overrides when creating a client instance', async function () {
      Nock('http://myservice.service.local:80')
        .get('/v1/test/stuff')
        .reply(200, { message: 'success' })

      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local', basePath: '/v1/test/' })

      const response = await client.request({ method: 'GET', path: 'stuff', operation: 'GET_stuff' })

      assert.ok(response, 'is response.')
      assert.equal(response.statusCode, 200, 'is ok response.')
      assert.ok(response.payload, 'is body')
      assert.equal(client.stats.executions, 1, 'is executions.')
    })

    it('should merge an external config into the global config and use it when creating a client', function () {
      ServiceClient.mergeConfig({
        plugins: [],
        base: {
          connectTimeout: 9999,
          timeout: 1234
        },
        overrides: {
          myservice: {
            basePath: '/api/',
            hostname: 'myservice-test.us-east-1.aws'
          }
        }
      })

      const client = ServiceClient.create('myservice')
      const clientConfig = client._config

      assert.equal(clientConfig.connectTimeout, 9999, 'client config `connectTimeout` was overridden')
      assert.equal(clientConfig.timeout, 1234, 'client config `timeout` was overridden')
      assert.equal(clientConfig.basePath, '/api/', 'client config `basePath` was overridden')
      assert.equal(clientConfig.hostname, 'myservice-test.us-east-1.aws', 'client config `hostname` was overridden')
    })

    it('should merge hostnameConfig overrides with an external config and use it when creating a client', function () {
      Nock('http://myservice-test.us-east-1.aws')
        .get('/')
        .reply(200, { message: 'success' })

      const hostnameStub = suite.sandbox.stub().returns('myservice-test.us-east-1.aws')

      ServiceClient.mergeConfig({
        plugins: [],
        base: {
          hostname: hostnameStub,
          hostnameConfig: {
            foo: 'bar',
            fizz: 'buzz',
            beep: 'boop'
          }
        },
        overrides: {
          myservice: {
            hostnameConfig: {
              fizz: 'baz',
              blerg: 'blarg'
            }
          }
        }
      })

      const client = ServiceClient.create('myservice', {
        hostnameConfig: {
          beep: 'bop'
        }
      })
      const clientConfig = client._config

      assert.deepEqual(clientConfig.hostnameConfig, {
        foo: 'bar',
        fizz: 'baz',
        blerg: 'blarg',
        beep: 'bop'
      })
    })

    it('should merge an empty external config into the global config without error', function () {
      assert.doesNotThrow(() => ServiceClient.mergeConfig())
    })

    it('should use a cached instance when no overrides provided', () => {
      __serviceclientconfig.overrides.cachedservice = { hostname: 'cachedservice.service.local' } // eslint-disable-line no-undef

      const client1 = ServiceClient.create('cachedservice')
      const client2 = ServiceClient.create('cachedservice', {})
      const client3 = ServiceClient.create('cachedservice', {
        basePath: '/v1/test/'
      })

      assert.equal(client1, client2, 'client2 is equal to client1 because its pulled from the cache')
      assert.notEqual(client1, client3, 'client3 provides an override and is a new instance of service client')
    })
  })

  describe('service-client request', () => {
    afterEach(() => {
      ServiceClient.remove('myservice')
    })

    it('should throw an error if requesting without an `operation`', async function () {
      const client = ServiceClient.create('myservice', { hostname: 'vrbo.com' })

      try {
        await client.request({ method: 'GET', path: '/v1/test/stuff' })
        assert.fail('should fail')
      } catch (err) {
        assert.ok(err, 'is error')
      }
    })

    it('should throw an error if requesting without a `method`', async function () {
      const client = ServiceClient.create('myservice', { hostname: 'vrbo.com' })

      try {
        await client.request({ path: '/v1/test/stuff', operation: 'GET_v1_test_stuff' })
        assert.fail('should fail')
      } catch (err) {
        assert.ok(err, 'is error')
      }
    })

    it('should make a successful request', async function () {
      Nock('http://myservice.service.local:80')
        .get('/v1/test/stuff')
        .reply(200, { message: 'success' })

      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

      const response = await client.request({ method: 'GET', path: '/v1/test/stuff', operation: 'GET_v1_test_stuff' })

      assert.ok(response, 'is response.')
      assert.equal(response.statusCode, 200, 'is ok response.')
      assert.ok(response.payload, 'is body')
      assert.equal(client.stats.executions, 1, 'is executions.')
    })

    it('should make a successful request with `pathParams`', async function () {
      Nock('http://myservice.service.local:80')
        .get('/v1/test/stuff/123')
        .reply(200, { message: 'success' })

      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

      const response = await client.request({ method: 'GET', path: '/v1/test/stuff/{id}', pathParams: { id: '123' }, operation: 'GET_v1_test_stuff_id' })

      assert.equal(response.statusCode, 200, 'is ok.')
    })

    it('should make a successful request with `queryParams`', async function () {
      Nock('http://myservice.service.local:80')
        .get('/v1/test/stuff?id=123')
        .reply(200, { message: 'success' })

      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

      const response = await client.request({ method: 'GET', path: '/v1/test/stuff', queryParams: { id: '123' }, operation: 'GET_v1_test_stuff' })

      assert.equal(response.statusCode, 200, 'is ok.')
    })

    it('should make a successful request with `hostPrefix`', async function () {
      Nock('http://prefix.myservice.service.local:80')
        .get('/v1/test/stuff?id=123')
        .reply(200, { message: 'success' })

      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })
      const response = await client.request({ method: 'GET', path: '/v1/test/stuff', queryParams: { id: '123' }, operation: 'GET_v1_test_stuff', hostPrefix: 'prefix' })

      assert.equal(response.statusCode, 200, 'is ok.')
    })

    it('should automatically parse a json response', async function () {
      Nock('http://myservice.service.local:80')
        .defaultReplyHeaders({
          'Content-Type': 'application/json'
        })
        .get('/v1/test/stuff')
        .reply(200, '{"message": "success"}')

      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

      const response = await client.request({ method: 'GET', path: '/v1/test/stuff', operation: 'GET_v1_test_stuff' })

      assert.deepEqual(response.payload, { message: 'success' })
    })

    it('should NOT parse a response without json content-type headers', async function () {
      Nock('http://myservice.service.local:80')
        .get('/v1/test/stuff')
        .reply(200, 'this-is-not-json')

      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

      const response = await client.request({ method: 'GET', path: '/v1/test/stuff', operation: 'GET_v1_test_stuff' })

      assert.instanceOf(response.payload, Buffer)
    })

    it('should NOT parse a response, even with json content-type headers', async function () {
      Nock('http://myservice.service.local:80')
        .defaultReplyHeaders({
          'Content-Type': 'application/json'
        })
        .get('/v1/test/stuff')
        .reply(200, 'this-is-not-json')

      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

      const response = await client.request({ method: 'GET', path: '/v1/test/stuff', operation: 'GET_v1_test_stuff', readOptions: { json: false } })

      assert.equal(response.payload, 'this-is-not-json')
    })

    it('should throw an error when attempting to parse a payload that is expected to be JSON', async function () {
      Nock('http://myservice.service.local:80')
        .defaultReplyHeaders({
          'Content-Type': 'application/json'
        })
        .get('/v1/test/stuff')
        .reply(200, 'this-is-not-json')

      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

      try {
        await client.request({ method: 'GET', path: '/v1/test/stuff', operation: 'GET_v1_test_stuff' })
      } catch (err) {
        assert.ok(err, 'is error')
      }
    })
  })

  describe('service-client read', () => {
    afterEach(() => {
      ServiceClient.remove('myservice')
    })

    it('should read the response payload', async function () {
      Nock('http://myservice.service.local:80')
        .get('/v1/test/stuff')
        .reply(200, { message: 'success' })

      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

      const response = await client.request({ method: 'GET', path: '/v1/test/stuff', operation: 'GET_v1_test_stuff', read: false })
      assert.instanceOf(response, IncomingMessage)

      const payload = await client.read(response, { json: true })
      assert.deepEqual(payload, { message: 'success' })
    })
  })

  describe('connectTimeout and circuit breaker', () => {
    afterEach(() => {
      ServiceClient.remove('myservice')
    })

    it('should fail the request because `connectTimeout` is short', async function () {
      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local', connectTimeout: 1, maxFailures: 1 })

      try {
        await makeRequest({
          getDeferred: () => client.request({ method: 'GET', path: '/v1/test/stuff', operation: 'GET_v1_test_stuff' }),
          connectDelay: 100
        })
        assert.fail('should fail')
      } catch (error) {
        assert.equal(error.code, 'ETIMEDOUT')
        assert.equal(client.stats.failures, 1)
        assert.equal(client.stats.open, true)
      }
    })

    it('should fail the request because `connectTimeout` is short and `maxConnectRetry` is too low', async function () {
      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local', connectTimeout: 1, maxConnectRetry: 1, maxFailures: 2 })

      try {
        await makeRequest({
          getDeferred: () => client.request({ method: 'GET', path: '/v1/test/stuff', operation: 'GET_v1_test_stuff' }),
          connectDelay: 100,
          restoreRequest: false
        })
        assert.fail('should fail')
      } catch (error) {
        // This should be 2 which indicates the request was tried once and subsequent call failed (i.e. a retry occured)
        assert.equal(Wreck.request.callCount, 2, 'initial + 1 retry')
        assert.equal(client.stats.failures, 1)
      }
    })

    it('should fail the request because `connectTimeout` is short and the circuit breaker should trip', async function () {
      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local', connectTimeout: 10, maxFailures: 1 })

      try {
        await makeRequest({
          getDeferred: () => client.request({ method: 'GET', path: '/v1/test/stuff', operation: 'GET_v1_test_stuff' }),
          connectDelay: 100
        })
        assert.fail('should fail')
      } catch (error) {
        assert.ok(error)
        assert.equal(client.stats.timeouts, 1)
        assert.equal(client.stats.open, true)

        try {
          await makeRequest({
            getDeferred: () => client.request({ method: 'GET', path: '/v1/test/stuff', operation: 'GET_v1_test_stuff' }),
            connectDelay: 100
          })
          assert.fail('should fail')
        } catch (error2) {
          assert.ok(error2)
          assert.equal(error2.message, 'Circuit breaker is open')
          assert.equal(error2.code, 'EPERM')
        }
      }
    })
  })

  describe('timeout and circuit breaker', () => {
    afterEach(() => {
      ServiceClient.remove('myservice')
    })

    it('should fail the request because `timeout` is short and the circuit breaker should trip', async function () {
      Nock('http://myservice.service.local:80')
        .get('/v1/test/stuff')
        .delay(100)
        .reply(200, { message: 'success' })

      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local', timeout: 10, maxFailures: 1 })

      try {
        await client.request({ method: 'GET', path: '/v1/test/stuff', operation: 'GET_v1_test_stuff' })
        assert.fail('should fail')
      } catch (error) {
        assert.ok(error)
        assert.equal(client.stats.timeouts, 1)
        assert.equal(client.stats.open, true)

        try {
          await client.request({ method: 'GET', path: '/v1/test/stuff', operation: 'GET_v1_test_stuff' })
          assert.fail('should fail')
        } catch (error2) {
          assert.ok(error2)
          assert.equal(error2.message, 'Circuit breaker is open')
          assert.equal(error2.code, 'EPERM')
        }
      }
    })
  })

  describe('circuit breaker and hooks', () => {
    afterEach(() => {
      ServiceClient.remove('myservice')
    })

    it('should execute `error`, `stats`, and `end` hooks if the circuit breaker is open', async function () {
      Nock('http://myservice.service.local:80')
        .get('/v1/test/stuff')
        .delayConnection(100)
        .reply(200, 'success')

      const spies = {
        error: suite.sandbox.spy(),
        stats: suite.sandbox.spy(),
        end: suite.sandbox.spy()
      }
      suite.sandbox.stub(Hooks, 'init').returns(spies)

      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local', timeout: 1, maxFailures: 1 })

      try {
        await client.request({ method: 'GET', path: '/v1/test/stuff', operation: 'GET_v1_test_stuff' })
        assert.fail('should fail')
      } catch (error1) {
        assert.ok(error1)
        assert.equal(client.stats.timeouts, 1)
        assert.equal(client.stats.open, true)

        try {
          await client.request({ method: 'GET', path: '/v1/test/stuff', operation: 'GET_v1_test_stuff' })
          assert.fail('should fail')
        } catch (error2) {
          assert.ok(error2)
          assert.equal(error2.message, 'Circuit breaker is open')
          assert.equal(error2.code, 'EPERM')
        }
      }

      Sinon.assert.called(spies.error)
      Sinon.assert.called(spies.stats)
      Sinon.assert.called(spies.end)
    })
  })
})
