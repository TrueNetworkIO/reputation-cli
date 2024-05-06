
import { formatBalance } from '@polkadot/util';
import { connect, getFreeBalance, testnet, toTrueNetworkAddress } from "@truenetworkio/sdk";

export const getBalance = async (address: string) => {
  const account = toTrueNetworkAddress(address)

  const apiPromise = await connect(testnet)
  const freeBalance = await getFreeBalance(apiPromise, account)

  const decimals = (await apiPromise.registry.chainDecimals)

  await apiPromise.disconnect()

  return formatBalance(freeBalance.toString(), { withSiFull: true, withUnit: 'TRUE', decimals: decimals[0] }).toString()
}