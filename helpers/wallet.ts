import { Keyring } from '@polkadot/api'
import { mnemonicGenerate, cryptoWaitReady } from '@polkadot/util-crypto'
import { stringToBlakeTwo256Hash } from '@truenetworkio/sdk/dist/utils/hashing.js'
import { Account } from '@truenetworkio/sdk/dist/utils/cli-config.js'

const keyring = new Keyring({ type: 'sr25519' });
keyring.setSS58Format(7);

export const generateWallet = async (secret?: string): Promise<Account> => {
  await cryptoWaitReady()
  const mnemonic = mnemonicGenerate();

  const secretSeed = secret || `0x${stringToBlakeTwo256Hash(mnemonic)}`

  const pair = keyring.addFromUri(secretSeed)

  return {
    secret: secretSeed,
    address: pair.address
  }
}