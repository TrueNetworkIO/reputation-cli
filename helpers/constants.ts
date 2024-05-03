
import { Account, Issuer } from '@truenetworkio/sdk/dist/utils/cli-config.js'

export const TRUE_DIRECTORY_NAME = 'true-network'
export const CONFIG_FILE_NAME = 'true.config.ts'
export const ENV_VARIABLE_NAME = 'TRUE_NETWORK_SECRET_KEY'

export const constructConfigFileData = (account: Account, issuer: Issuer) => {
  return `
import { TrueApi } from '@truenetworkio/sdk'
import { TrueConfig } from '@truenetworkio/sdk/dist/utils/cli-config'
import Network from '@truenetworkio/sdk/dist/network'

// If you are using a NodeJS environment, please uncomment the below code
// and install the dotenv dependency, using yarn add dotenv.
// import dotenv from 'dotenv'
// dotenv.config()

export const getTrueNetworkInstance = async (): Promise<TrueApi> => {
  const trueApi = await TrueApi.create(config.account.secret)

  await trueApi.setIssuer(config.issuer.hash)

  return trueApi;
}

export const config: TrueConfig = {
  network: Network.testnet,
  account: {
    address: '${account.address}',
    secret: process.env.${ENV_VARIABLE_NAME} ?? ''
  },
  issuer: {
    name: '${issuer.name}',
    hash: '${issuer.hash}'
  },
  algorithm: {
    id: undefined,
    path: undefined,
    schemas: []
  },
}
  `
}