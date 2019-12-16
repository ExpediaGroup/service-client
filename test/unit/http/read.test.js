'use strict'

const Sinon = require('sinon')
const Wreck = require('@hapi/wreck')
const { assert } = require('chai')

const Read = require('../../../lib/http/read')

describe('read', () => {
  let suite

  beforeEach(() => {
    suite = {}
    suite.sandbox = Sinon.createSandbox()
    suite.readStub = suite.sandbox.stub(Wreck, 'read')
  })

  afterEach(async () => {
    if (suite.server) {
      await suite.server.stop({ timeout: 1 })
    }
    suite.sandbox.restore()
    suite = null
  })

  it('should call Wreck.read', async function () {
    await Read()
    Sinon.assert.calledOnce(suite.readStub)
  })

  it('should call Wreck.read and pass in the provided `response` and `options` arguments', async function () {
    await Read({ complete: true }, { json: true })
    Sinon.assert.calledOnce(suite.readStub)
    assert.equal(true, suite.readStub.getCall(0).args[0].complete)
    assert.equal(true, suite.readStub.getCall(0).args[1].json)
  })
})
