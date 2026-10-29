#!/usr/bin/env node
/** Điểm vào thực thi của CLI `presence-style`. */
import { runCli } from './cli'

runCli(process.argv.slice(2))
    .then((code) => {
        process.exitCode = code
    })
    .catch((error) => {
        process.stderr.write(`presence-style: ${(error as Error).message}\n`)
        process.exitCode = 1
    })
