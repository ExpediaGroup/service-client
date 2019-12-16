## [2.0.0](https://github.com/expediagroup/service-client/compare/v1.3.0...v2.0.0)

### Breaking

* Utilizes patterns established by the [WHATWG URL API](https://nodejs.org/api/url.html#url_the_whatwg_url_api)
    * basePath should end with a `/`
    * If a `path` variable has a leading '/', it will override the client's configured `basePath`


## [1.3.0](https://github.com/expediagroup/service-client/compare/v1.2.1...v1.3.0) (2019-12-03)

#### Feature

* Caches a client if one does not already exist
* Returns a cached client if already generated


## [1.2.1](https://github.com/expediagroup/service-client/compare/v1.2.0...v1.2.1) (2019-08-22)

#### Bug Fixes

* add hook debug statements ([#5](https://github.com/expediagroup/service-client/issues/5)) ([647534c](https://github.com/expediagroup/service-client/commit/647534c))
* Resolve client plugin config and per-request plugin config ([#7](https://github.com/expediagroup/service-client/issues/7)) ([659df43](https://github.com/expediagroup/service-client/commit/659df43))
* strip 'content-length' header from all requests ([#6](https://github.com/expediagroup/service-client/issues/6)) ([7954a9f](https://github.com/expediagroup/service-client/commit/7954a9f))
