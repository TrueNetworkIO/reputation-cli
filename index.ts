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

program.parse();
