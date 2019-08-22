'use strict'

const Sinon = require('sinon')
const { assert } = require('chai')

const Hooks = require('../../../lib/hooks')
const GlobalConfig = require('../../../lib/config')

describe('Hooks', () => {
  let suite

  beforeEach(function () {
    suite = {}
    suite.sandbox = Sinon.createSandbox()
  })

  afterEach(function () {
    GlobalConfig.plugins = []
    suite.sandbox.restore()
    suite = null
  })

  describe('#init', function () {
    it('should return a hook function for each category of added hooks', async function () {
      const plugin1 = {
        request () {},
        init () {}
      }

      const plugin2 = {
        init () {},
        response () {}
      }

      GlobalConfig.plugins.push(
        () => plugin1,
        () => plugin2
      )

      const hookOptions = {
        client: {
          config () {}
        },
        context: null,
        plugins: {}
      }
      const result = await Hooks.init(hookOptions)

      assert.typeOf(result.request, 'function')
      assert.typeOf(result.init, 'function')
      assert.typeOf(result.response, 'function')
    })

    describe('per-request plugin options', function () {
      beforeEach(function () {
        suite.plugin1Stub = suite.sandbox.stub().returns({
          request () {},
          init () {}
        })

        suite.plugin2Stub = suite.sandbox.stub().returns({
          request () {},
          init () {}
        })

        GlobalConfig.plugins.push(
          suite.plugin1Stub,
          suite.plugin2Stub
        )
      })

      it('should disable a configured plugin', async function () {
        const hookOptions = {
          client: {
            config: () => ({
              auth: {
                clientId: '123',
                clientSecret: 'abc'
              }
            })
          },
          context: null,
          plugins: {
            auth: false
          }
        }

        await Hooks.init(hookOptions)

        Sinon.assert.calledWith(suite.plugin1Stub, {
          client: Sinon.match.any,
          context: Sinon.match.any,
          plugins: Sinon.match({
            auth: false
          })
        })
      })

      it('should enable a disabled plugin', async function () {
        const hookOptions = {
          client: {
            config: () => ({
              foobar: false
            })
          },
          context: null,
          plugins: {
            foobar: true
          }
        }

        await Hooks.init(hookOptions)

        Sinon.assert.calledWith(suite.plugin1Stub, {
          client: Sinon.match.any,
          context: Sinon.match.any,
          plugins: Sinon.match({
            foobar: true
          })
        })
      })

      it('should use options containing base and per-request config', async function () {
        const hookOptions = {
          client: {
            config: () => ({
              auth: {
                clientId: '123',
                clientSecret: 'abc'
              }
            })
          },
          context: null,
          plugins: {
            auth: {
              initialRetry: true
            }
          }
        }

        await Hooks.init(hookOptions)

        Sinon.assert.calledWith(suite.plugin1Stub, {
          client: Sinon.match.any,
          context: Sinon.match.any,
          plugins: Sinon.match({
            auth: {
              clientId: '123',
              clientSecret: 'abc',
              initialRetry: true
            }
          })
        })
      })
    })

    it('should execute each added hook', async function () {
      const plugin1 = {
        request: suite.sandbox.spy(),
        init: suite.sandbox.spy()
      }

      const plugin2 = {
        init: suite.sandbox.spy(),
        response: suite.sandbox.spy()
      }

      GlobalConfig.plugins.push(
        () => plugin1,
        () => plugin2
      )

      const hookOptions = {
        client: {
          config () {}
        },
        context: null,
        plugins: {}
      }
      const result = await Hooks.init(hookOptions)

      const data = { options: { foo: 'bar' } }
      result.request(data)
      result.init(data)
      result.response(data)

      Sinon.assert.calledOnce(plugin1.request)
      Sinon.assert.calledOnce(plugin1.init)
      Sinon.assert.calledOnce(plugin2.init)
      Sinon.assert.calledOnce(plugin2.response)
    })

    it('should execute async hooks', async function () {
      const plugin1Spies = {
        request: suite.sandbox.spy(),
        init: suite.sandbox.spy()
      }

      const plugin2Spies = {
        init: suite.sandbox.spy(),
        response: suite.sandbox.spy()
      }

      GlobalConfig.plugins.push(
        async function () {
          await new Promise((resolve) => setTimeout(resolve, 100))
          return {
            async request () {
              await new Promise((resolve) => setTimeout(resolve, 100))
              plugin1Spies.request()
            },
            async init () {
              await new Promise((resolve) => setTimeout(resolve, 100))
              plugin1Spies.init()
            }
          }
        },
        async function () {
          await new Promise((resolve) => setTimeout(resolve, 100))
          return {
            async init () {
              await new Promise((resolve) => setTimeout(resolve, 100))
              plugin2Spies.init()
            },
            async response () {
              await new Promise((resolve) => setTimeout(resolve, 100))
              plugin2Spies.response()
            }
          }
        }
      )

      const startTime = Date.now()

      const hookOptions = {
        client: {
          config () {}
        },
        context: null,
        plugins: {}
      }
      const result = await Hooks.init(hookOptions)

      const data = { options: { foo: 'bar' } }
      await result.request(data)
      await result.init(data)
      await result.response(data)

      const endTime = Date.now()

      Sinon.assert.calledOnce(plugin1Spies.request)
      Sinon.assert.calledOnce(plugin1Spies.init)
      Sinon.assert.calledOnce(plugin2Spies.init)
      Sinon.assert.calledOnce(plugin2Spies.response)

      const execTime = endTime - startTime
      assert.isTrue(execTime >= 400 && execTime < 500, `400ms <= ${execTime}ms < 500ms`)
    })
  })
})
