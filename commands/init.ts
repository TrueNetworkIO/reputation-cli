
import { exec } from 'child_process'
import inquirer from 'inquirer'
import loading from 'loading-cli'
import fs from 'fs'

import { Issuer } from '@truenetworkio/sdk/dist/utils/cli-config.js'
import { getIssuer } from '@truenetworkio/sdk/dist/pallets/issuer/state.js'
import { stringToBlakeTwo256Hash } from '@truenetworkio/sdk/dist/utils/hashing.js'

import { generateWallet } from '../helpers/wallet.js'
import { createConfigFile, writeToEnvFile, writeToGitIgnore } from '../helpers/file.js'

import { TrueApi } from "@truenetworkio/sdk";

const askQuestions = async (trueApi: TrueApi) => {

  const { isSecret } = await inquirer.prompt({
    name: "isSecret",
    type: 'confirm',
    message: "Do you want to create a new secret key?"
  })

  let existingSecret: string | undefined;

  if (!isSecret) {
    // User already have a secret key, ask them to share.
    const { preferedSecret } = await inquirer.prompt({
      name: "preferedSecret",
      type: 'password',
      message: "Paste the existing secret key:",
      validate: (i) => {
        if (i.length < 64 || i.slice(0, 2).toLowerCase() !== '0x') return 'Invalid secret key format, please create a new key to start.';

        return true;
      }
    })

    existingSecret = preferedSecret
  }

  const account = await generateWallet(existingSecret)

  trueApi = await TrueApi.create(account.secret)

  const { name } = await inquirer.prompt(
    {
      name: "name",
      type: "input",
      message: "Pick a name for your issuer in the registry:",
      validate: async (i) => {
        if (i.length < 5) return 'Name have more than 5 characters';

        // Checking if name is already registered by someone else.
        const issuer = await getIssuer(trueApi.network, `0x${stringToBlakeTwo256Hash(i)}`)

        if (!issuer) return true;

        if (issuer.controllers.includes(account.address)) return true;

        return "Issuer already claimed; choose a new name or utilize the owner's secret account.";
      }
    }
  );

  const issuer: Issuer = {
    name,
    hash: `0x${stringToBlakeTwo256Hash(name)}`
  }


  await trueApi.close()

  return {
    account,
    issuer,
  }
};


const detectPackageManager = () => {
  // Check for lock files in current directory
  const hasYarnLock = fs.existsSync('yarn.lock')
  const hasPnpmLock = fs.existsSync('pnpm-lock.yaml')
  const hasNpmLock = fs.existsSync('package-lock.json')

  // Check for global installations as fallback
  const checkGlobalInstall = (command: string) => {
    try {
      require('child_process').execSync(`${command} --version`, { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }

  if (hasYarnLock) return 'yarn'
  if (hasPnpmLock) return 'pnpm'
  if (hasNpmLock) return 'npm'

  // If no lock file, check for global installations
  if (checkGlobalInstall('yarn')) return 'yarn'
  if (checkGlobalInstall('pnpm')) return 'pnpm'
  if (checkGlobalInstall('npm')) return 'npm'

  // Default to npm if nothing else is found
  return 'npm'
}

const installDependency = (dependency: any, load: any) => {
  const packageManager = detectPackageManager()
  const commands = {
    npm: `npm install ${dependency}`,
    yarn: `yarn add ${dependency}`,
    pnpm: `pnpm add ${dependency}`
  }

  return new Promise<any>((resolve, reject) => {
    exec(commands[packageManager], (error) => {
      if (error?.code) {
        load.stop()
        reject(error)
        return
      }
      resolve(null)
    })
  })
}

export const runProjectInit = async (trueApi: TrueApi) => {
  // 1. Ask if to create a new issuer, get Issuer Name.
  const { issuer, account } = await askQuestions(trueApi)

  // 2.1 Create a file to store: secret, issuerName, issuerHash, public address.
  createConfigFile(account, issuer)

  const load = loading("Installing @truenetworkio/sdk").start();
  
  try {
    // 2.2 Installing the dependency using detected package manager
    await installDependency('@truenetworkio/sdk', load)
    load.stop()
    
    writeToEnvFile(`TRUE_NETWORK_SECRET_KEY=${account.secret}`)
    writeToGitIgnore(`.env`)

    console.log('\n✅ Successfully created a new project.')
    console.log(`\nNext Steps: Get test tokens for the address: ${account.address}.`)
    console.log(`\nAnd then, use the register command to secure the issuer on the network.\n`)
  } catch (error: any) {
    console.error('Installation failed:', error?.message)
  }
}