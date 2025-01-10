export const hexToBytes = (hex: string) => {
  // Remove 0x prefix if present
  hex = hex.replace('0x', '');
  const data = hex.match(/../g);

  if(!data) throw Error("Invalid hex string provided in the attestation.");

  return new Uint8Array(data.map(byte => parseInt(byte, 16)));
}