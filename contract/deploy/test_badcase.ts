import fs from 'fs';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { addFunds, mineBlock } from '../utils/_helpers';
import {
  PstState,
  Warp,
  WarpFactory,
  LoggerFactory,
  Contract,
} from 'warp-contracts';

const deploy = async () => {
  console.log('running...');

  LoggerFactory.INST.logLevel('error');

  const warp = WarpFactory.forLocal(1984);
  const arweave = warp.arweave;

  const walletJwk = await arweave.wallets.generate();
  await addFunds(arweave, walletJwk);
  const walletAddress = await arweave.wallets.jwkToAddress(walletJwk);
  // await mineBlock(arweave);
  
  // deploy TAR pst
  const wrcSrc = fs.readFileSync(path.join(__dirname, '../pkg/erc20-contract_bg.wasm'));

  const tarInit = {
    symbol: 'TAR',
    name: 'ThetAR exchange token',
    decimals: 2,
    totalSupply: 20000,
    balances: {
      [walletAddress]: 10000,
    },
    allowances: {},
    settings: null,
    owner: walletAddress,
    canEvolve: true,
    evolve: '',
  };

  const tarTxId = (await warp.createContract.deploy({
    wallet: walletJwk,
    initState: JSON.stringify(tarInit),
    src: wrcSrc,
    wasmSrcCodeDir: path.join(__dirname, '../src/wrc-20_fixed_supply'),
    wasmGlueCode: path.join(__dirname, '../pkg/erc20-contract.js'),
  })).contractTxId;

  // deploy thetAR contract
  const contractSrc = fs.readFileSync(path.join(__dirname, '../dist/contract.js'), 'utf8');
  const initFromFile = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../dist/thetAR/initial-state.json'), 'utf8')
  );
  const contractInit = {
    ...initFromFile,
    logs: [], // only for debug
    owner: walletAddress,
    tokenSrcTemplateHashs: [0x0],
    thetarTokenAddress: tarTxId,
  };

  const contractTxId = (await warp.createContract.deploy({
    wallet: walletJwk,
    initState: JSON.stringify(contractInit),
    src: contractSrc,
  })).contractTxId;
  const contract = warp.contract(contractTxId);
  contract.setEvaluationOptions({
    internalWrites: true,
    allowUnsafeClient: true,
    allowBigInt: true,
  }).connect(walletJwk);

  // deploy test pst
  let initialState = {
    symbol: 'TEST',
    name: 'TEST token',
    decimals: 2,
    totalSupply: 20000,
    balances: {
      [walletAddress]: 10000,
    },
    allowances: {},
    settings: null,
    owner: walletAddress,
    canEvolve: true,
    evolve: '',
  };

  const testTokenTxId = (await warp.createContract.deploy({
    wallet: walletJwk,
    initState: JSON.stringify(initialState),
    src: wrcSrc,
    wasmSrcCodeDir: path.join(__dirname, '../src/wrc-20_fixed_supply'),
    wasmGlueCode: path.join(__dirname, '../pkg/erc20-contract.js'),
  })).contractTxId;

  await contract.writeInteraction(
    {
      function: 'addPair',
      params: {
        tokenAddress: testTokenTxId,
        logo: 'TEST_00000lQgApM_a3Z6bGFHYE7SXnBI6C5_2_24MQ',
        description: 'test token'
      }
    }
  );

  console.log(JSON.stringify((await contract.readState()).cachedValue.state));
  console.log('txid: ', contractTxId);
  console.log('wallet address: ', walletAddress);
  fs.writeFileSync(path.join(__dirname, 'key-file-for-test.json'), JSON.stringify(walletJwk));
  fs.writeFileSync(path.join(__dirname, 'thetAR-txid-for-test.json'), contractTxId);
  fs.writeFileSync(path.join(__dirname, 'thetAR-token-txid-for-test.json'), tarTxId);
  fs.writeFileSync(path.join(__dirname, 'test-token-txid-for-test.json'), testTokenTxId);
};

const createOrder = async (direction, quantity, price) => {
  console.log('create order...');

  LoggerFactory.INST.logLevel('error');

  const warp = WarpFactory.forLocal(1984);
  const arweave = warp.arweave;

  const walletJwk = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'key-file-for-test.json'), 'utf8')
  );
  const walletAddress = await arweave.wallets.jwkToAddress(walletJwk);
  
  const contractId = 
    fs.readFileSync(path.join(__dirname, 'thetAR-txid-for-test.json'), 'utf8');
  let contract = warp.contract(contractId);
  contract.setEvaluationOptions({
    internalWrites: true,
      allowUnsafeClient: true,
      allowBigInt: true,
  }).connect(walletJwk);

  const testTokenId = 
    fs.readFileSync(path.join(__dirname, 'test-token-txid-for-test.json'), 'utf8');
  let testTokenContract = warp.contract(testTokenId);
  testTokenContract.connect(walletJwk);

  const thetarTokenId = 
    fs.readFileSync(path.join(__dirname, 'thetAR-token-txid-for-test.json'), 'utf8');
  let thetarTokenContract = warp.contract(thetarTokenId);
  thetarTokenContract.connect(walletJwk);

  console.log('BEFORE: ', JSON.stringify(await contract.readState()));

  let token: Contract = direction === 'buy' ? thetarTokenContract : testTokenContract;

  await token.writeInteraction({
    function: 'approve',
    spender: contractId,
    amount: quantity
  });
  mineBlock(arweave);

  const txId = (await contract.writeInteraction({
    function: 'createOrder',
    params: {
      pairId: 0,
      direction: direction,
      price: price
    }
  })).originalTxId;
  mineBlock(arweave);

  console.log('AFTER: ', JSON.stringify(await contract.readState()));
}

const cancelOrder = async (orderIndex) => {
  console.log('cancel order...');

  LoggerFactory.INST.logLevel('error');

  const warp = WarpFactory.forLocal(1984);
  const arweave = warp.arweave;

  const walletJwk = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'key-file-for-test.json'), 'utf8')
  );
  const walletAddress = await arweave.wallets.jwkToAddress(walletJwk);
  
  const contractId = 
    fs.readFileSync(path.join(__dirname, 'thetAR-txid-for-test.json'), 'utf8');
  let contract = warp.contract(contractId);
  contract.setEvaluationOptions({
    internalWrites: true,
      allowUnsafeClient: true,
      allowBigInt: true,
  }).connect(walletJwk);

  const testTokenId = 
    fs.readFileSync(path.join(__dirname, 'test-token-txid-for-test.json'), 'utf8');
  let testTokenContract = warp.contract(testTokenId);
  testTokenContract.connect(walletJwk);

  const thetarTokenId = 
    fs.readFileSync(path.join(__dirname, 'thetAR-token-txid-for-test.json'), 'utf8');
  let thetarTokenContract = warp.contract(thetarTokenId);
  thetarTokenContract.connect(walletJwk);

  console.log('BEFORE: ', JSON.stringify(await contract.readState()));

  const orderId = (await contract.readState()).cachedValue.state['orderInfos']['0']['orders'][orderIndex]['orderId'];

  const txId = await contract.writeInteraction({
    function: 'cancelOrder',
    params: {
      pairId: 0,
      orderId: orderId
    }
  });
  mineBlock(arweave);

  console.log('AFTER: ', JSON.stringify(await contract.readState()));
}

(async () => {
  await deploy();
  await createOrder('buy', 1, 1);
  await createOrder('buy', 2, 2);
  await cancelOrder(0);
  await cancelOrder(0);
})();