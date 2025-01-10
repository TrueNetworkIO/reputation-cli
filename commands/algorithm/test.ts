import { TrueApi } from "@truenetworkio/sdk";
import { readAlgorithmId, readWasmAsBytes } from '../../helpers/file.js';
import { parseConfig } from '../../helpers/parser.js';
import { TRUE_DIRECTORY_NAME, CONFIG_FILE_NAME, getSchemaObjects } from '../../helpers/constants.js';
import { CREDENTIALS_PALLET_NAME } from '@truenetworkio/sdk/dist/pallets/credentials/state.js'
import { getWalletWithType } from '@truenetworkio/sdk/dist/utils/address.js'
import { hexToBytes } from "../../helpers/utils.js";

interface WasmExports {
  calc: () => number;
  [key: string]: any;
}

async function fetchAttestations(trueApi: TrueApi, userId: string, schemas: any[], config: any) {
  return Promise.all(
    schemas.map(async (schema) => {
      try {
        const response = await trueApi.network.query[CREDENTIALS_PALLET_NAME].attestations(
          getWalletWithType(userId),
          config.issuer.hash,
          schema.schema
        );
        return response?.toHuman();
      } catch (error) {
        console.error(`Error fetching attestations for ${schema.name} schema:`, error);
        return null;
      }
    })
  );
}

function processAttestations(attestations: any[], schemas: any[], schemaObjects: any[]) {
  return attestations.reduce((allBytes: number[], attestation: any, index: number) => {
    if (!attestation || attestation.length === 0) {
      throw Error(`No attestations found for schema: ${schemas[index].name}`);
    }
 
    const lastAttestation = attestation[attestation.length - 1];
    const schemaBytes = lastAttestation.reduce((bytes: number[], value: string, jIndex: number) => {
      if (schemaObjects[index].schema[jIndex][1] !== 13) {
        return [...bytes, ...Array.from(hexToBytes(value))];
      }
      return bytes;
    }, []);
 
    return [...allBytes, ...schemaBytes];
  }, []);
 }

async function initializeWasm(wasmBytes: number[], attestationsBytes: number[]) {
  const memory = new WebAssembly.Memory({ initial: 40, maximum: 40 });
  
  const importObject = {
    host: {
      print: (i: number) => console.log(i),
    },
    env: {
      memory,
      abort: (_msgId: number, _filename: number, line: number, col: number) => 
        console.error('Abort called from wasm', line, col),
    }
  };

  const summands = new DataView(memory.buffer);
  attestationsBytes.forEach((byte, index) => summands.setUint8(index, byte));
  
  const { instance } = await WebAssembly.instantiate(
    Uint8Array.from(wasmBytes), 
    importObject,
  );

  return instance.exports as WasmExports;
}

export async function fetchAttestationsAndCompute(userId: string, wasmPath: string): Promise<number | null> {
  let trueApi: TrueApi | null = null;

  try {
    const algoId = readAlgorithmId();
    if (!algoId) throw Error("Algorithm ID not found in true config");

    const config = await parseConfig();
    if (!config) throw Error(
      `True-network config not found at ${TRUE_DIRECTORY_NAME}/${CONFIG_FILE_NAME}. Run init command first.`
    );

    trueApi = await TrueApi.create(config.account.secret);
    const schemas = await getSchemaObjects(true);
    const schemaObjects = await getSchemaObjects(false);

    const attestations = await fetchAttestations(trueApi, userId, schemas, config);
    const attestationBytes = processAttestations(attestations, schemas, schemaObjects);

    const wasmBytes = readWasmAsBytes(wasmPath);
    
    const exports = await initializeWasm(wasmBytes, attestationBytes);
    
    if (typeof exports.calc !== 'function') {
      throw Error('WASM file missing calc export');
    }

    console.log(wasmBytes.length, attestationBytes, exports.calc);

    return exports.calc();

  } catch (error) {
    console.error('Operation failed:', error);
    throw error;
  } finally {
    if (trueApi) {
      await trueApi.close();
    }
  }
}