'use strict'

const http = require('http')
const port = 8081

const ServiceClient = require('../../..')
ServiceClient.use([
  require('./plugin-1'),
  require('./plugin-2')
])
const client = ServiceClient.create('node-globalization-preference-service', {
  hostname: '0.0.0.0',
  port: 8080,
  basePath: 'v1/preferences'
})

const requestHandler = async (request, response) => {
  await client.request({
    method: 'GET',
    path: '/{uuid}/{type}',
    operation: 'my-operation',
    pathParams: {
      uuid: 'b6247e48-13f8-4049-ad91-540c24b36a70',
      type: 'havid'
    }
  })
  response.end('ok')
}

const server = http.createServer(requestHandler)

server.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err) // eslint-disable-line no-console
  }
  console.log(`server is listening on ${port}`) // eslint-disable-line no-console
})
