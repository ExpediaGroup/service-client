'use strict'

const { expect } = require('chai')
const { createBaseUrl } = require('../../lib/helpers')

describe('helpers', () => {
  describe('createBaseUrl', () => {
    it('no host prefix', () => {
      const expected = 'http://vrbo.com/app'
      const actual = createBaseUrl('http:', 'vrbo.com', '/app')
      expect(actual).to.equal(expected)
    })

    it('host prefix present', () => {
      const expected = 'http://secure.vrbo.com/app'
      const actual = createBaseUrl('http:', 'vrbo.com', '/app', null, 'secure')
      expect(actual).to.equal(expected)
    })

    it('no port present', () => {
      const expected = 'http://vrbo.com/app'
      const actual = createBaseUrl('http:', 'vrbo.com', '/app')
      expect(actual).to.equal(expected)
    })

    it('port present', () => {
      const expected = 'http://vrbo.com:8080/app'
      const actual = createBaseUrl('http:', 'vrbo.com', '/app', '8080')
      expect(actual).to.equal(expected)
    })
  })
})
