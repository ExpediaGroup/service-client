'use strict'

const { assert } = require('chai')
const Sinon = require('sinon')
const Wreck = require('wreck')
const ServiceClient = require('../../lib/index')

describe('read', () => {
  it('should call wreck.read', () => async function () {
    let wreckSpy = Sinon.spy(Wreck, 'read')
    await ServiceClient.read()
    Sinon.assert.calledOnce(wreckSpy)
    Wreck.read.restore()
  })
  it('should call wreck.read and pass in the provided response and options arguments', () => async function () {
    let wreckSpy = Sinon.spy(Wreck, 'read')
    await ServiceClient.read({ complete: true }, { json: true })
    Sinon.assert.calledOnce(wreckSpy)
    assert.equal(true, wreckSpy.getCall(0).args[0].complete)
    assert.equal(true, wreckSpy.getCall(0).args[1].json)
    Wreck.read.restore()
  })
})
