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

  describe('toReadableStream', function () {
    it('should call Wreck.toReadableStream', async function () {
      Sinon.stub(Wreck, 'toReadableStream')
      ServiceClient.toReadableStream()
      Sinon.assert.calledOnce(Wreck.toReadableStream)
      Wreck.toReadableStream.restore()
    })

    it('should call Wreck.toReadableStream and pass in the provided `payload` and `encoding` arguments', async function () {
      Sinon.stub(Wreck, 'toReadableStream')
      ServiceClient.toReadableStream(Buffer.from('Hello', 'ascii'), 'ascii')

      Sinon.assert.calledOnce(Wreck.toReadableStream)

      const [payload, encoding] = Wreck.toReadableStream.getCall(0).args
      assert.equal(payload.toString('ascii'), 'Hello')
      assert.equal('ascii', encoding)

      Wreck.toReadableStream.restore()
    })
  })

  describe('parseCacheControl', function () {
    it('should call Wreck.parseCacheControl', async function () {
      Sinon.stub(Wreck, 'parseCacheControl')
      ServiceClient.parseCacheControl()
      Sinon.assert.calledOnce(Wreck.parseCacheControl)
      Wreck.parseCacheControl.restore()
    })

    it('should call Wreck.parseCacheControl and pass in the provided `field` arguments', async function () {
      Sinon.stub(Wreck, 'parseCacheControl')
      ServiceClient.parseCacheControl('no-cache')

      Sinon.assert.calledOnce(Wreck.parseCacheControl)

      const [field] = Wreck.parseCacheControl.getCall(0).args
      assert.equal(field, 'no-cache')

      Wreck.parseCacheControl.restore()
    })
  })

  describe('agents', function () {
    it('should reference Wreck.agents', function () {
      assert.equal(ServiceClient.agents, Wreck.agents)
    })
  })
})
