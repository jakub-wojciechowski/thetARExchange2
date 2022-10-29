import fs from 'fs';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { addFunds, mineBlock } from '../utils/_helpers';
import {
  PstState,
  Warp,
  WarpNodeFactory,
  LoggerFactory,
} from 'warp-contracts';

const calcHash = (string) => {
  var hash: number = 0, i, chr;
  if (string.length === 0) return hash;
  for (i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

(async () => {
  console.log('running...');
  const arweave = Arweave.init({
    host: 'www.arweave.net',
    port: 443,
    protocol: 'https',
  });

  LoggerFactory.INST.logLevel('error');

  const warp = WarpNodeFactory.memCachedBased(arweave).useArweaveGateway().build();

  const walletJwk = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'key-file.json'), 'utf8')
  );
  const walletAddress = await arweave.wallets.jwkToAddress(walletJwk);
  console.log('Current wallet selected to deploy contract is: ', walletAddress);

  // calc hashs
  const fixedPstSrcHash = calcHash(fs.readFileSync(path.join(__dirname, 'fixed_pst.js'), 'utf8'));
  const mintablePstSrcHash = calcHash(fs.readFileSync(path.join(__dirname, 'mintable_pst.js'), 'utf8'));
  const dedicatedWalletHash = calcHash(fs.readFileSync(path.join(__dirname, '../dist/dedicated_wallet/contract.js'), 'utf8'));

  const contractSrc = fs.readFileSync(path.join(__dirname, '../dist/thetAR/contract.js'), 'utf8');
    const initFromFile = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../dist/thetAR/initial-state.json'), 'utf8')
    );
  const contractInit = {
    ...initFromFile,
    logs: [], //debug,
    owner: walletAddress,
    tokenSrcTemplateHashs: [fixedPstSrcHash, mintablePstSrcHash],
    dedicatedWalletTemplateHash: dedicatedWalletHash,
    thetarTokenAddress: 'D6ouMlzDi6YedBBCubyOo5TiOrbs8hZck9IAvVgO170',
    karTokenAddress: 'y2349UpHOGMLpMh6M1Q_mGagSpfeKZLdSwQmBPrUqFk',
  
    tokenInfos: [
      {
        tokenAddress: 'D6ouMlzDi6YedBBCubyOo5TiOrbs8hZck9IAvVgO170',
        tokenName: "thetAR coin",
        ticker: "TAR",
        logo: ""
      },
      {
        tokenAddress: 'y2349UpHOGMLpMh6M1Q_mGagSpfeKZLdSwQmBPrUqFk',
        tokenName: "Kontractized AR",
        ticker: "KAR",
        logo: ""
      }
    ],
    pairInfos: [
      {
        pairId: 0,
        tokenAddress: 'D6ouMlzDi6YedBBCubyOo5TiOrbs8hZck9IAvVgO170',
        dominantTokenAddress: 'y2349UpHOGMLpMh6M1Q_mGagSpfeKZLdSwQmBPrUqFk'
      }
    ],
    orderInfos: {
      0: { currentPrice: undefined, orders: [] },
    }
  };

  const contractTxId = (await warp.createContract.deploy({
    wallet: walletJwk,
    initState: JSON.stringify(contractInit),
    src: contractSrc,
  }));
  console.log('txid: ', contractTxId);
  console.log('wallet address: ', walletAddress);
  fs.writeFileSync(path.join(__dirname, 'thetAR-txid.json'), contractTxId);
})();
