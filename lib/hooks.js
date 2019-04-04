/*
Copyright 2019 Expedia Group, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict'

const Hoek = require('hoek')

const GlobalConfig = require('./config')

const debug = require('debug')('serviceclient:hooks')

async function init (options) {
  const hooks = {}

  /*
    First build up an object of hook names mapped to an array of associated hook functions
    {
        'request': [hookFn1, hookFn1],
        ...
    }
    */
  // process plugin initialization in parallel
  const pluginPromises = []
  GlobalConfig.plugins.forEach((plugin) => {
    pluginPromises.push(plugin(options))
  })
  const plugins = await Promise.all(pluginPromises)

  // then organize individual plugin hooks into their respective lifecycle hook
  plugins.forEach((pluginHooks) => {
    Object.entries(pluginHooks).forEach(([hookName, hookFn]) => {
      let fnsForHook = hooks[hookName]
      if (!fnsForHook) {
        fnsForHook = hooks[hookName] = []
      }
      fnsForHook.push(hookFn)
    })
  })

  /*
    Now that we have this map of hook names to hook functions, replace each
    array with a function that will resolve each of the functions in the array.
    {
        'request': async function() {
            await Promise.all([hookFn1(), hookFn2()])
        },
        ...
    }
    */
  Object.entries(hooks).forEach(([hookName, hookFns]) => {
    hooks[hookName] = async function (data) {
      debug('%s(): calling %d hooks', hookName, hookFns.length)

      const hookPromises = []
      hookFns.forEach((hookFn) => {
        // call the hook
        const hookPromise = hookFn(data)

        // keep track of each pending promise
        hookPromises.push(hookPromise)
      })

      // wait for the pending hook promises to resolve
      const results = await Promise.all(hookPromises)

      // for the `request` hook, merge and return options data
      if (hookName === 'request') {
        // merge results of returned hook data
        let finalData = data.options
        results.forEach((result) => {
          Hoek.merge(finalData, result)
        })
        return finalData
      } else

      // for the `response` hook, return the first non-falsy value
      if (hookName === 'response') {
        return results.find((result) => result)
      }
    }
  })

  // return the hook map to be used within each client request
  return hooks
}

module.exports = {
  init
}
