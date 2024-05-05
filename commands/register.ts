import { getIssuer } from '@truenetworkio/sdk/dist/pallets/issuer/state.js'
import { stringToBlakeTwo256Hash } from '@truenetworkio/sdk/dist/utils/hashing.js'

import { generateWallet } from '../helpers/wallet.js'
import { readObjectFromFile } from '../helpers/file.js'

import { TrueApi, toTrueNetworkAddress } from "@truenetworkio/sdk";
import { CONFIG_FILE_NAME, TRUE_DIRECTORY_NAME } from '../helpers/constants.js'


const parseConfig = async () => {
  const config = readObjectFromFile(`${process.cwd()}/${TRUE_DIRECTORY_NAME}/${CONFIG_FILE_NAME}`);

  if (!config) throw Error(`Unable to load true-network config, make sure ${TRUE_DIRECTORY_NAME}/${CONFIG_FILE_NAME} exists. If not, please use init command.`)

  if (config?.issuer.hash !== `0x${stringToBlakeTwo256Hash(config.issuer.name)}`) throw Error("Mismatch found in config for issuer name & hash, make sure the properties are not altered.")

  const account = await generateWallet(config.account.secret)

  if (config.account.address !== account.address) throw Error("Invalid account secret provided in the config, please make sure the project is initiated correctly.")

  return config;
}

export const registerIssuerOnChain = async (trueApi: TrueApi): Promise<string> => {
  const config = await parseConfig();

  if (!config) throw Error(`Unable to load true-network config, make sure ${TRUE_DIRECTORY_NAME}/${CONFIG_FILE_NAME} exists. If not, please use init command.`)

  trueApi = await TrueApi.create(config.account.secret)

  const checkIfExists = await getIssuer(trueApi.network, config.issuer.hash)

  if (checkIfExists) {
    if (checkIfExists.controllers.includes(toTrueNetworkAddress(config.account.address))) {
      await trueApi.setIssuer(config.issuer.hash)
      await trueApi.close()
      return `\n✅ Issuer is already registered.\n`;
    } else {
      throw Error("Account is not a controller for the registered issuer. Please check at https://truenetwork.io/explorer/raman/chainstate.")
    }
  } else {
    await trueApi.registerIssuer(config.issuer.name, [config.account.address])
    await trueApi.close()
    return `\nIssuer registered successfully ✨\n`
  }
};