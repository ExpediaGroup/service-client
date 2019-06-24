'use strict'

function createBaseUrl (protocol, hostname, basePath, port, hostPrefix) {
  const fixedPrefix = hostPrefix ? `${hostPrefix}.` : ''
  const fixedPort = port ? `:${port}` : ''
  return `${protocol}//${fixedPrefix}${hostname}${fixedPort}${basePath}`
}

module.exports = {
  createBaseUrl
}
