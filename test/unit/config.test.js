'use strict'

const { assert } = require('chai')

describe('Global Config', function () {
  it('should shim `clientInstances` when it does not exist', function () {
    delete require.cache[require.resolve('../../lib/config')]
    global.__serviceclientconfig = {
      base: {},
      overrides: {},
      plugins: []
    }

    const GlobalConfig = require('../../lib/config')

    assert.containsAllKeys(GlobalConfig, ['base', 'clientInstances', 'overrides', 'plugins'])
  })
})
