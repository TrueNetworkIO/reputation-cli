#!/usr/bin/env node

import chalk from 'chalk'
import figlet from 'figlet'
import { Command } from 'commander'
import { Keyring } from '@polkadot/keyring'
import { TrueApi } from '@truenetworkio/sdk'
import { runProjectInit } from './commands/init.js'
import { registerIssuerOnChain } from './commands/register.js'
import loading from 'loading-cli'
import { getBalance } from './commands/balance.js'
import { setup } from './commands/algorithm/setup.js'
import { getSchemaObjects } from './helpers/constants.js'

const keyring = new Keyring({ type: 'sr25519' });
keyring.setSS58Format(7);

let trueApi: TrueApi


const init = () => {
  console.log(
    chalk.yellow(
      figlet.textSync("Reputation CLI")
    )
  );

  console.log(
    chalk.yellow(
      '\nBuild Reputation System for the Internet\n'
    )
  );
}

const program = new Command();

init()

program
  .name('reputation-cli')
  .version('0.0.1');

program
  .command('init')
  .description('Initiate a new / existing project using True Network SDK.')
  .action(async () => {
    await runProjectInit(trueApi)
  });

program
  .command('register')
  .description('Register the issuer from config on-chain.')
  .action(async () => {

    const load = loading("Registering issuer on True Network").start();
    // Register the issuer from the config file on-chain using the API.
    const data = await registerIssuerOnChain(trueApi)

    load.stop();

    console.log(data)
  });

program
  .command('balance')
  .argument('<string>', 'Public address of the account.')
  .description('Fetches the TRUE token balance from the chain.')
  .action(async (account: string) => {
    console.log('\nToken Balance:', await getBalance(account))
  });


program
  .command('acm-prepare')
  .option('--override', 'Override the existing helper class for acm.')
  .description('Compiles and generates the wasm code for the algorithm.')
  .action(async () => {
    try {
      const response = await setup()
      if (response) {
        console.log('\n✅ Successfully prepared helper file for writing reputation algorithm.')
      } else {
        console.log('\n✅ Successfully prepared helper file for writing reputation algorithm.')
      }
    } catch (e: any) {
      console.error(e?.message ?? "Error in preparing algorithm.")
    }
  });

program
  .command('compile')
  .option('--standalone', 'Compile as a standalone code packet.')
  .description('Compiles and generates the wasm code for the algorithm.')
  .action(async (standalone: boolean) => {
    await getSchemaObjects()
    // readConfigForAlgos(`${process.cwd()}/${TRUE_DIRECTORY_NAME}/${CONFIG_FILE_NAME}`)
    // await compileAlgorithm(standalone)
  });
program.parse();
