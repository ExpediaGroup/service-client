'use strict'

const ServiceClient = require('../..');

(async function start () {
  // Create a ServiceClient instance
  const client = ServiceClient.create('reqres', {
    protocol: 'https:',
    hostname: 'reqres.in',
    basePath: '/api'
  })

  // Submit a request
  const response = await client.request({
    method: 'GET',
    path: '/users',
    queryParams: { page: 2 },
    operation: 'GET_users_pg2'
  })

  console.log(response.statusCode)
  console.log(response.payload)
})()
