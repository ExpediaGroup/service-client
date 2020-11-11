'use strict'

const Fs = require('fs')
const ChildProcess = require('child_process')
const Path = require('path')

async function start () {
  const dirs = Fs.readdirSync(__dirname)
  for (const i in dirs) {
    const name = dirs[i]

    const testDir = Path.join(__dirname, name)
    const stat = Fs.statSync(testDir)
    if (stat.isFile()) {
      return
    }

    console.log(`Running ${name}`) // eslint-disable-line no-console

    // spawn node process
    const testProcess = ChildProcess.exec(`node ${testDir}/index.js`)

    // spawn autocannon process
    const acProcess = ChildProcess.exec(`node ${testDir}/../../../node_modules/.bin/autocannon -c 10 -d 20 http://localhost:8081/`)
    acProcess.on('error', function (e) {
      console.error(e)
    })

    const outputStream = Fs.createWriteStream(`${testDir}/stats`)
    acProcess.stdout.pipe(outputStream)
    acProcess.stderr.pipe(outputStream)

    // wait for autocannon process to finish, then kill the test code process
    await new Promise((resolve) => {
      if (testProcess.killed) {
        resolve()
      } else {
        acProcess.on('close', function () {
          testProcess.kill()
          resolve()
        })
      }
    })
  }
}

start()
