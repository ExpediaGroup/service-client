'use strict'

const { assert } = require('chai')
const Sinon = require('sinon')
const Wreck = require('wreck')

const ServiceClient = require('../../lib/index')

describe('ServiceClient', function () {
  describe('read', function () {
    it('should call Wreck.read', async function () {
      Sinon.stub(Wreck, 'read')
      await ServiceClient.read()
      Sinon.assert.calledOnce(Wreck.read)
      Wreck.read.restore()
    })

    it('should call Wreck.read and pass in the provided `response` and `options` arguments', async function () {
      Sinon.stub(Wreck, 'read')
      await ServiceClient.read({ complete: true }, { json: true })
      Sinon.assert.calledOnce(Wreck.read)
      assert.equal(true, Wreck.read.getCall(0).args[0].complete)
      assert.equal(true, Wreck.read.getCall(0).args[1].json)
      Wreck.read.restore()
    })
  })
})
