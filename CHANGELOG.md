# [5.0.0](https://github.com/ExpediaGroup/service-client/compare/v4.4.1...v5.0.0) (2023-04-10)


### Features

* publish breaking release ([#107](https://github.com/ExpediaGroup/service-client/issues/107)) ([0d908c0](https://github.com/ExpediaGroup/service-client/commit/0d908c06976e1e074f2611c813813f2b9bebf316))


### BREAKING CHANGES

* replaced deprecated cuid package with paralleldrive/cuid2

## [4.4.1](https://github.com/ExpediaGroup/service-client/compare/v4.4.0...v4.4.1) (2023-03-24)


### Bug Fixes

* modifing order of the timeout and listeners to avoid incorrect errors ([#100](https://github.com/ExpediaGroup/service-client/issues/100)) ([a75e88c](https://github.com/ExpediaGroup/service-client/commit/a75e88ca8f69dd6ba6b85df427a3e220f03d4b16))

# [4.4.0](https://github.com/ExpediaGroup/service-client/compare/v4.3.3...v4.4.0) (2023-02-22)


### Features

* Updating some dependencies ([#91](https://github.com/ExpediaGroup/service-client/issues/91)) ([5495738](https://github.com/ExpediaGroup/service-client/commit/5495738f9fc61441c4ea65ffd77c89a1a084ebb9))

## [4.3.3](https://github.com/ExpediaGroup/service-client/compare/v4.3.2...v4.3.3) (2023-02-16)


### Bug Fixes

* Altering the order of semantic release config file to have it correct ([#90](https://github.com/ExpediaGroup/service-client/issues/90)) ([8a53994](https://github.com/ExpediaGroup/service-client/commit/8a539945582aa91e9a23b8e6d923f406a66fa579))

## [4.3.2](https://github.com/ExpediaGroup/service-client/compare/v4.3.1...v4.3.2) (2023-01-04)


### Bug Fixes

* bump json5 from 1.0.1 to 1.0.2 ([#75](https://github.com/ExpediaGroup/service-client/issues/75)) ([ae9df57](https://github.com/ExpediaGroup/service-client/commit/ae9df575b48762d98a03496912b5180770c08bca))

## [4.3.1](https://github.com/ExpediaGroup/service-client/compare/v4.3.0...v4.3.1) (2023-01-04)


### Bug Fixes

* upgrade to joi@17.7.0 ([#74](https://github.com/ExpediaGroup/service-client/issues/74)) ([af6db95](https://github.com/ExpediaGroup/service-client/commit/af6db95aa77d32ada775b2fed6536ea3a295db9a))

# [4.3.0](https://github.com/ExpediaGroup/service-client/compare/v4.2.0...v4.3.0) (2022-12-07)


### Features

* Upgrade to node v16 ([#73](https://github.com/ExpediaGroup/service-client/issues/73)) ([bc4dc68](https://github.com/ExpediaGroup/service-client/commit/bc4dc68be9c149fb4f6025ec9ab7012f3e3172de))

# [4.2.0](https://github.com/ExpediaGroup/service-client/compare/v4.1.0...v4.2.0) (2022-11-16)


### Features

* empty commit to force minor semantic release ([#72](https://github.com/ExpediaGroup/service-client/issues/72)) ([a1a8d30](https://github.com/ExpediaGroup/service-client/commit/a1a8d306915059a8ad901392dc2db371627e31a2))

## [4.1.0](https://github.com/expediagroup/service-client/compare/v4.0.0...v4.1.0) (2021-11-18)

#### Feature

- Use `tls.rootCertificates` and `https.globalAgent.options` for default options used to create https agents.

## [4.0.0](https://github.com/expediagroup/service-client/compare/v3.2.0...v4.0.0) (2021-11-04)

#### Breaking

- [Breaking] Drop support for node < 12.
- Update Github test workflow to only test againt node v 14.x
- Update dependencies, npm, and engines in package.json to support node version >= 14.

## [3.2.0](https://github.com/expediagroup/service-client/compare/v3.1.0...v3.2.0) (2021-09-29)

#### Feature

* add support for a read hook ([#63](https://github.com/ExpediaGroup/service-client/pull/63))

## [3.1.0](https://github.com/expediagroup/service-client/compare/v3.0.1...v3.1.0) (2021-09-09)

#### Feature

* Add typings ([#61](https://github.com/ExpediaGroup/service-client/pull/61))

## [3.0.1](https://github.com/expediagroup/service-client/compare/v3.0.0...v3.0.1) (2020-08-17)

#### Fix

* Honor request options ([#50](https://github.com/ExpediaGroup/service-client/pull/50))
* Refine request options and query param logic ([#51](https://github.com/ExpediaGroup/service-client/pull/51))

## [3.0.0](https://github.com/expediagroup/service-client/compare/v2.1.1...v3.0.0) (2020-08-07)

#### Breaking

* Drop support for node < 12.
* Update Github test workflow to only test against node v 12.x
* Update dependencies, npm, and engines in package.json to support node version >= 12. ([#49](https://github.com/ExpediaGroup/service-client/pull/49))

## [2.1.1](https://github.com/expediagroup/service-client/compare/v2.1.0...v2.1.1) (2020-08-03)

#### Fix

* Prevent request options object mutation. ([#45](https://github.com/ExpediaGroup/service-client/pull/45))

## [2.1.0](https://github.com/expediagroup/service-client/compare/v2.0.3...v2.1.0) (2020-07-15)

#### Feature

* Add client config option `hostnameConfig` for passing custom config to a `hostname` resolver function (#43)

## [2.0.3](https://github.com/expediagroup/service-client/compare/v2.0.2...v2.0.3) (2020-07-09)

#### Bug Fixes

* Optimize client creation (#42)

## [2.0.2](https://github.com/expediagroup/service-client/compare/v2.0.1...v2.0.2) (2020-06-14)

#### Bug Fixes

* Assert servicename upon client creation (#40)
* Include servicename in validation errors (#40)

#### Other

* Update devDependency eslint to v7 (#37)
* Switch to GH Actions for builds

## [2.0.1](https://github.com/expediagroup/service-client/compare/v2.0.0...v2.0.1) (2020-02-20)

#### Bug Fixes

* Make client caching compatible with older global configs


## [2.0.0](https://github.com/expediagroup/service-client/compare/v1.3.0...v2.0.0) (2019-12-17)

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
