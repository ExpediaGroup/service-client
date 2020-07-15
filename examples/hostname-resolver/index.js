'use strict'

const ServiceClient = require('../..');

(async function start () {
  /**
   * A hostname resolver function.
   * When the application is deployed to production, return a mesh url.
   * Otherwise, return a fully qualified url using the provided `region`, `env`, and `segment`.
   *
   * @param {string} serviceName The canonical name of our external service
   * @param {object} hostnameConfig A set of configuration options used to construct a url
   */
  function hostnameResolver(serviceName, hostnameConfig) {
    if (process.env.NODE_ENV === 'production') {
      // return mesh url
      return `${serviceName}.service.local`
    }
    const { region, env, segment } = hostnameConfig
    return `${serviceName}.${region}.${env}.${segment}.mywebsite.com`
  };

  /**
   * Configure service-client with some base settings and some individual overrides.
   * This is helpful for organizing configuration in a place separate from where the client is created.
   */
  ServiceClient.mergeConfig({
    base: {
      hostname: hostnameResolver,
      hostnameConfig: {
        region: process.env.AWS_REGION,
        env: process.env.DEPLOY_ENV,
        segment: process.env.AWS_SEGMENT
      }
    },
    overrides: {
      myservice: {
        protocol: 'https:',
        basePath: '/api/'
      }
    }
  })

  // Create the ServiceClient instance
  const client = ServiceClient.create('myservice')

  // Submit a request
  const response = await client.request({
    method: 'GET',
    path: 'users',
    queryParams: { page: 2 },
    operation: 'GET_users_pg2'
  })

  console.log(response.statusCode)
  console.log(response.payload)
})()
