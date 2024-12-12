#!/usr/bin/env node

import chalk from 'chalk'
import figlet from 'figlet'
import { Command } from 'commander'
import { Keyring } from '@polkadot/api'
import { TrueApi } from '@truenetworkio/sdk'
import { runProjectInit } from './commands/init.js'
import { registerIssuerOnChain } from './commands/register.js'
import loading from 'loading-cli'
import { getBalance } from './commands/balance.js'
import { setup, setupAcm } from './commands/algorithm/setup.js'
import { exec } from 'child_process'
import { checkIfFileExists, readAlgorithmId, readAlgorithmPath, readWasmAsBytes } from './helpers/file.js'
import { deployAlgoOnChain, getReputationScore } from './commands/algorithm/deploy.js'
import path from 'path'
import { promisify } from 'util'
import { generateSchemaTypes } from './commands/schemas.js'

const asyncExec = promisify(exec)

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
  .command('setup')
  .argument('<string>', 'Path to create the algorithm project setup.')
  .description('Creates the algorithm directory ')
  .action(async (path: string) => {
    const load = loading("Setting up algorithm folder for your project...").start();

    try {
      await setupAcm(path);
    } catch (e: any) {
      console.log(e.message)
    } finally {
      load.stop();
    }
  });


program
  .command('acm-prepare')
  .description('Create the required helper class for importing attestations in your algorithm.')
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
  .command('deploy')
  .option('--force', 'Force deployment with a new algorithm id.')
  .description('Deploy the algorithm wasm to True Network.')
  .action(async (force) => {
    const algoId = readAlgorithmId();
    if (algoId && !force) throw Error("Algorithm Id already exists in the config, use --force to make a new deployment");

    const load = loading("Deploying the algorithm for your project...").start();

    const newAlgoId = await deployAlgoOnChain(trueApi)

    load.stop();

    console.log(`✅ Deploy successful, the algorithm is deployed on the True Network.\nAlgo Id: ${newAlgoId}`)
  });


program
.command('dry-run')
.argument('<string>', 'Wallet address of the user whom reputation needs to be calculated.')
.description('Get the reputation score of a user for the created algorithm.')
.action(async (wallet) => {
  if(!wallet) {
    console.log("Wallet address is required for calculating reputation score.")
    return;
  }


  const load = loading(`Running the algorithm for your user: ${wallet}`).start();

  const score = await getReputationScore(trueApi, wallet)

  load.stop();

  console.log(`Reputation Score for ${wallet.slice(0, 3)}...${wallet.slice(wallet.length-3)} is ${score}`);
});

program
  .command('compile')
  .description('Compiles and generates the wasm code for the algorithm.')
  .action(async () => {
    const algo = readAlgorithmPath();
    if (!algo) throw Error("Unable to read the algorithm path from the true config.");
    // Change to the new directory
    const fullPath = path.resolve(algo);
    process.chdir(fullPath);

    const load = loading("Compiling your algorithm & generating the wasm build...").start();

    // Initialize AssemblyScript project
    await asyncExec('npm i && npm run asbuild:release');

    load.stop();
    console.log('✅ Build successful, the algorithm is compiled into wasm executable file.')
  });

  program
  .command('generate-schemas')
  .argument('[filePath]', 'Location & file name for the schemas.ts file to be saved.', 'schemas.ts')
  .description('Fetch and generate schemas from the hashes stored on-chain.')
  .action(async (filePath: string) => {
    if(checkIfFileExists(filePath)) throw Error(`File already exists with name: ${filePath}`)
    await generateSchemaTypes(trueApi, filePath)
  });


program.parse();
