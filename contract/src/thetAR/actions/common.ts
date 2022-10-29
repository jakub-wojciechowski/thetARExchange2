declare const ContractError;

export const isAddress = (addr: string) => /[a-z0-9_-]{43}/i.test(addr);

export const hashCheck = async (validHashs: number[], contractTxId: string): Promise<boolean> => {
  const tx = await SmartWeave.unsafeClient.transactions.get(contractTxId);

  let SrcTxId;
  tx.get('tags').forEach(tag => {
    let key = tag.get('name', {decode: true, string: true});
    if (key === 'Contract-Src') {
      SrcTxId = tag.get('value', {decode: true, string: true});
    }
  });
  if (!SrcTxId || !isAddress(SrcTxId)) {
    throw new ContractError('Cannot find valid srcTxId in contract Tx content!');
  }
  const srcTx: string = await SmartWeave.unsafeClient.transactions.getData(SrcTxId, {decode: true, string: true});
  if (srcTx.length < 10000 && validHashs.includes(calcHash(srcTx))) {
    return true;
  }
  return false;
};

export const calcHash = (string) => {
	var hash: number = 0, i, chr;
	if (string.length === 0) return hash;
	for (i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
	}
    return hash;
}

export const selectWeightedTokenHolder = async (balances: {[address: string]: number}) => {
  // Count the total tokens
  let totalTokens = 0;
  for (const address of Object.keys(balances)) {
    totalTokens += balances[address];
  }

  let sum = 0;
  const r = await getRandomIntNumber(totalTokens);
  for (const address of Object.keys(balances)) {
    sum += balances[address];
    if (r <= sum && balances[address] > 0) {
      return address;
    }
  }
  return undefined;
}

async function getRandomIntNumber(max, uniqueValue = "") {
  const pseudoRandomData = SmartWeave.arweave.utils.stringToBuffer(
    SmartWeave.block.height
    + SmartWeave.block.timestamp
    + SmartWeave.transaction.id
    + uniqueValue
  );
  const hashBytes = await SmartWeave.arweave.crypto.hash(pseudoRandomData);
  const randomBigInt = bigIntFromBytes(hashBytes);
  return Number(randomBigInt % BigInt(max));
}

function bigIntFromBytes(byteArr) {
  let hexString = "";
  for (const byte of byteArr) {
    hexString += byte.toString(16).padStart(2, '0');
  }
  return BigInt("0x" + hexString);
}