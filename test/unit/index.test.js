'use strict'

const { assert } = require('chai')
const Nock = require('nock')

const ServiceClient = require('../../lib/index')

describe('ServiceClient', function () {
  describe('read()', async function () {
    it('should export the read function', async function () {
      Nock('http://myservice.service.local:80')
        .get('/v1/test/stuff')
        .reply(200, { message: 'success' })

      const client = ServiceClient.create('myservice', { hostname: 'myservice.service.local' })

      const response = await client.request({ method: 'GET', path: '/v1/test/stuff', operation: 'GET_v1_test_stuff', read: false })
      const payload = await ServiceClient.read(response, { json: true })

      assert.deepEqual(payload, { message: 'success' })
    })
  })
})
