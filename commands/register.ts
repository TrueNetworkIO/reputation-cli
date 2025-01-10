import { getIssuer } from '@truenetworkio/sdk/dist/pallets/issuer/state.js'

import { TrueApi, toTrueNetworkAddress } from "@truenetworkio/sdk";
import { CONFIG_FILE_NAME, TRUE_DIRECTORY_NAME } from '../helpers/constants.js'
import { parseConfig } from '../helpers/parser.js';

export const registerIssuerOnChain = async (): Promise<string> => {
  const config = await parseConfig();

  if (!config) throw Error(`Unable to load true-network config, make sure ${TRUE_DIRECTORY_NAME}/${CONFIG_FILE_NAME} exists. If not, please use init command.`)

  const trueApi = await TrueApi.create(config.account.secret)

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