// deploy code on-chain. 
import { saveAlgo, runAlgo } from '@truenetworkio/sdk/dist/pallets/algorithms/extrinsic.js'

import { TrueApi } from "@truenetworkio/sdk";
import { readAlgorithmId, readAlgorithmPath, readWasmAsBytes, updateTrueConfigAlgoId } from '../../helpers/file.js';
import path from 'path';
import { parseConfig } from '../../helpers/parser.js';
import { TRUE_DIRECTORY_NAME, CONFIG_FILE_NAME, getSchemaObjects } from '../../helpers/constants.js';


export const deployAlgoOnChain = async (): Promise<number> => {
  const algoPath = readAlgorithmPath();
  
  if(!algoPath) throw Error("Unable to read the algorithm path from true config.");

  const wasmPath = path.join(process.cwd(), algoPath, 'build', 'release.wasm');
  
  const config = await parseConfig();

  if (!config) throw Error(`Unable to load true-network config, make sure ${TRUE_DIRECTORY_NAME}/${CONFIG_FILE_NAME} exists. If not, please use init command.`)

  const trueApi = await TrueApi.create(config.account.secret);

  const schemaInfos = await getSchemaObjects(true);

  const algoId = await saveAlgo(trueApi.network, trueApi.account, schemaInfos.map(i => i.schema), readWasmAsBytes(wasmPath));

  // Need to add the algorithm id to true config.
  updateTrueConfigAlgoId(`${process.cwd()}/${TRUE_DIRECTORY_NAME}/${CONFIG_FILE_NAME}`, algoId)


  await trueApi.close()

  return algoId;
};


export const getReputationScore = async (userId: string): Promise<number> => {
  const algoId = readAlgorithmId();
  
  if(!algoId) throw Error("Unable to read the algorithm id from true config.");

  
  const config = await parseConfig();

  if (!config) throw Error(`Unable to load true-network config, make sure ${TRUE_DIRECTORY_NAME}/${CONFIG_FILE_NAME} exists. If not, please use init command.`)

  const trueApi = await TrueApi.create(config.account.secret);

  const score = await runAlgo(trueApi.network, config.issuer.hash, trueApi.account, userId, parseInt(algoId));
  
  await trueApi.close()

  return score;
};