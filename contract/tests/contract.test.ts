import fs from 'fs';
import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { addFunds, mineBlock } from '../utils/_helpers';
import {
  Warp,
  WarpFactory,
  LoggerFactory,
  Contract,
} from 'warp-contracts';

describe('Testing thetAR Project', () => {
  console.log = function() {};

  let arweave: Arweave;
  let arlocal: ArLocal;
  let warp: Warp;

  let walletJwk: JWKInterface;
  let walletAddress: string;
  let user1WalletJwk: JWKInterface;
  let user2WalletJwk: JWKInterface;
  let user1WalletAddress: string;
  let user2WalletAddress: string;

  let contractSrc: string;
  let contractInit: Object;
  let contractTxId: string;

  let userContract: Contract;
  let user1Contract: Contract;
  let user2Contract: Contract;
  let tarInit: Object;
  let tarTxId: string;
  let testTokenTxId: string;

  let user1Tar: Contract;
  let user2Tar: Contract;
  let user1TestToken: Contract;
  let user2TestToken: Contract;
  

  beforeAll(async () => {
    arlocal = new ArLocal(1820);
    await arlocal.start();

    LoggerFactory.INST.logLevel('error');

    warp = WarpFactory.forLocal(1820);
    arweave = warp.arweave;
  });

  afterAll(async () => {
    await arlocal.stop();
  });

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

  jest.setTimeout(15000);
  async function Initialize() {
    walletJwk = await arweave.wallets.generate();
    await addFunds(arweave, walletJwk);
    walletAddress = await arweave.wallets.jwkToAddress(walletJwk);
    await mineBlocks(1);

    user1WalletJwk = await arweave.wallets.generate();
    await addFunds(arweave, user1WalletJwk);
    user1WalletAddress = await arweave.wallets.jwkToAddress(user1WalletJwk);
    await mineBlocks(1);

    user2WalletJwk = await arweave.wallets.generate();
    await addFunds(arweave, user2WalletJwk);
    user2WalletAddress = await arweave.wallets.jwkToAddress(user2WalletJwk);
    await mineBlocks(1);

    // calc hashs
    // const wrc20Hash = calcHash(fs.readFileSync(path.join(__dirname, '../pkg/erc20-contract_bg.wasm'), 'utf8'));

    // deploy TAR pst
    const wrcSrc = fs.readFileSync(path.join(__dirname, '../pkg/erc20-contract_bg.wasm'));

    tarInit = {
      symbol: 'TAR',
      name: 'ThetAR exchange token',
      decimals: 2,
      totalSupply: 20000,
      balances: {
        [user1WalletAddress]: 10000,
        [user2WalletAddress]: 10000,
      },
      allowances: {},
      settings: null,
      owner: walletAddress,
      canEvolve: true,
      evolve: '',
    };

    tarTxId = (await warp.createContract.deploy({
      wallet: walletJwk,
      initState: JSON.stringify(tarInit),
      src: wrcSrc,
      wasmSrcCodeDir: path.join(__dirname, '../src/wrc-20_fixed_supply'),
      wasmGlueCode: path.join(__dirname, '../pkg/erc20-contract.js'),
    })).contractTxId;

    user1Tar = warp.contract(tarTxId);
    user1Tar.connect(user1WalletJwk);
    user2Tar = warp.contract(tarTxId);
    user2Tar.connect(user2WalletJwk);


    // deploy thetAR contract
    contractSrc = fs.readFileSync(path.join(__dirname, '../dist/contract.js'), 'utf8');
    const initFromFile = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../dist/thetAR/initial-state.json'), 'utf8')
    );
    contractInit = {
      ...initFromFile,
      logs: [], // only for debug
      owner: walletAddress,
      tokenSrcTemplateHashs: [0x0],
      thetarTokenAddress: tarTxId,
      feeRatio: 0.001
    };

    contractTxId = (await warp.createContract.deploy({
      wallet: walletJwk,
      initState: JSON.stringify(contractInit),
      src: contractSrc,
    })).contractTxId;
    user1Contract = warp.contract(contractTxId);
    user1Contract.setEvaluationOptions({
      internalWrites: true,
      allowUnsafeClient: true,
      allowBigInt: true,
    }).connect(user1WalletJwk);
    user2Contract = warp.contract(contractTxId);
    user2Contract.setEvaluationOptions({
      internalWrites: true,
      allowUnsafeClient: true,
      allowBigInt: true,
    }).connect(user2WalletJwk);
    userContract = warp.contract(contractTxId);
    userContract.setEvaluationOptions({
      internalWrites: true,
      allowUnsafeClient: true,
      allowBigInt: true,
    }).connect(walletJwk);
    await mineBlocks(1);

    // deploy test pst
    let initialState = {
      symbol: 'TEST',
      name: 'TEST token',
      decimals: 2,
      totalSupply: 20000,
      balances: {
        [user1WalletAddress]: 10000,
        [user2WalletAddress]: 10000,
      },
      allowances: {},
      settings: null,
      owner: walletAddress,
      canEvolve: true,
      evolve: '',
    };

    testTokenTxId = (await warp.createContract.deploy({
      wallet: walletJwk,
      initState: JSON.stringify(initialState),
      src: wrcSrc,
      wasmSrcCodeDir: path.join(__dirname, '../src/wrc-20_fixed_supply'),
      wasmGlueCode: path.join(__dirname, '../pkg/erc20-contract.js'),
    })).contractTxId;

    user1TestToken = warp.contract(testTokenTxId);
    user1TestToken.connect(user1WalletJwk);
    user2TestToken = warp.contract(testTokenTxId);
    user2TestToken.connect(user2WalletJwk);
  
    await mineBlocks(1);
  }

  async function mineBlocks(times: number) {
    for (var i = 0; i < times; i ++) {
      await mineBlock(arweave);
    }
  }

  async function addPair() {
    await userContract.writeInteraction(
      {
        function: 'addPair',
        params: {
          tokenAddress: testTokenTxId,
          logo: 'TEST_00000lQgApM_a3Z6bGFHYE7SXnBI6C5_2_24MQ',
          description: 'test token'
        }
      },
      { transfer: {
          target: walletAddress,
          winstonQty: await arweave.ar.arToWinston("10"),
        }
      }
    );
    await mineBlocks(1);

    expect((await user1Contract.readState()).cachedValue.state['maxPairId']).toEqual(0);

    expect((await user1Contract.readState()).cachedValue.state['pairInfos'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['pairInfos'][0]).toEqual({
      pairId: 0,
      symbol: 'TEST',
      name: 'TEST token',
      description: 'test token',
      logo: "TEST_00000lQgApM_a3Z6bGFHYE7SXnBI6C5_2_24MQ",
      decimals: 2,
      tokenAddress: testTokenTxId
    });

    expect(Object.keys((await user1Contract.readState()).cachedValue.state['orderInfos']).length).toEqual(1);
  }

  async function createOrder(
    user: number, 
    direction: 'buy'|'sell', 
    quantity: number,
    price?: number
  ) {
    const usersInfo = [
      {},
      {
        contract: user1Contract,
        walletAddress: user1WalletAddress,
        tar: user1Tar,
        testToken: user1TestToken
      },
      {
        contract: user2Contract,
        walletAddress: user2WalletAddress,
        tar: user2Tar,
        testToken: user2TestToken
      },
    ]

    const token = direction === 'buy' ? usersInfo[user].tar : usersInfo[user].testToken;
    await token.writeInteraction({
      function: 'approve',
      spender: contractTxId,
      amount: quantity
    });
    await mineBlocks(1);

    const txId = (await usersInfo[user].contract.writeInteraction({
      function: 'createOrder',
      params: {
        pairId: 0,
        direction: direction,
        price: price
      }
    })).originalTxId;
    await mineBlocks(1);

    return txId;
  }

  async function cancelOrder(
    user: number, 
    orderIndex: number,
  ) {
    const usersInfo = [
      {},
      {
        contract: user1Contract,
        walletAddress: user1WalletAddress,
        tar: user1Tar,
        testToken: user1TestToken
      },
      {
        contract: user2Contract,
        walletAddress: user2WalletAddress,
        tar: user2Tar,
        testToken: user2TestToken
      },
    ];
    const orderId = (await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][orderIndex]['orderId'];

    const txId = await usersInfo[user].contract.writeInteraction({
      function: 'cancelOrder',
      params: {
        pairId: 0,
        orderId: orderId
      }
    });
    await mineBlocks(1);
  }

  it('test deploy contract', async () => {
    await Initialize();
    expect(contractTxId.length).toEqual(43);
    expect(tarTxId.length).toEqual(43);
    expect(await (await user1Contract.readState()).cachedValue.state).toEqual(contractInit);
    expect(await (await user2Contract.readState()).cachedValue.state).toEqual(contractInit);
    
    expect((await user1Tar.readState()).cachedValue.state).toEqual(tarInit);
    expect((await user2Tar.readState()).cachedValue.state).toEqual(tarInit);
  });

  it('test add pair', async () => {
    await Initialize();
    await addPair();

    expect(await (await user1Contract.readState()).cachedValue.state['pairInfos'].length).toEqual(1);
    expect(await (await user1Contract.readState()).cachedValue.state['pairInfos'][0]).toEqual({
      pairId: 0,
      symbol: 'TEST',
      name: 'TEST token',
      description: 'test token',
      logo: "TEST_00000lQgApM_a3Z6bGFHYE7SXnBI6C5_2_24MQ",
      decimals: 2,
      tokenAddress: testTokenTxId
    });
  });

  it('test pairInfo function', async () => {
    await Initialize();
    await addPair();

    const pairInfo = (await user1Contract.dryWrite({
      function: 'pairInfo',
      params: {
        pairId: 0
      }
    })).result;

    expect(pairInfo).toEqual({
      pairId: 0,
      symbol: 'TEST',
      name: 'TEST token',
      description: 'test token',
      logo: "TEST_00000lQgApM_a3Z6bGFHYE7SXnBI6C5_2_24MQ",
      decimals: 2,
      tokenAddress: testTokenTxId
    })
  });

  it('test create order', async () => {
    await Initialize();
    await addPair();
    const tx = await createOrder(1, 'buy', 10, 1);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0'].orders[0]).toEqual({
      creator: user1WalletAddress,
      orderId: tx,
      direction: 'buy',
      quantity: 10,
      price: 1
    });
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress][0][0]).toEqual({
      creator: user1WalletAddress,
      orderId: tx,
      direction: 'buy',
      quantity: 10,
      price: 1
    });
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-10);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(10);
  });

  it('test limit order', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 10, 10);
  
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders']).toEqual([]);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(10);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test limit order - not fill full order - sell', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 5, 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(10);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+50);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(50);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+5);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-5);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test limit order - exceed full order - sell', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 20, 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['quantity']).toEqual(10);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]['0'][0]['quantity']).toEqual(10);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(10);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-20);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(10);
  });

  it('test limit order - not fill full order - buy', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await createOrder(2, 'buy', 50, 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(10);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+50);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-50);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+5);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(5);
  });

  it('test limit order - exceed full order - buy', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await createOrder(2, 'buy', 200, 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['quantity']).toEqual(10);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]['0'][0]['quantity']).toEqual(10);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]['0'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(10);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-200);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(100);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test limit order - 2 vs 1', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(1, 'buy', 200, 20);
    await createOrder(2, 'sell', 10, 20);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['quantity']).toEqual(10);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'][0]['quantity']).toEqual(10);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(20);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-300);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+200);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(100);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test limit order - 1 vs 2', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 5, 10);
    await createOrder(2, 'sell', 10, 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]['0'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]['0'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]['0'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(10);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-15);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(5);
  });

  it('test market order - exactly fill - buy', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await createOrder(2, 'buy', 100);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(10);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test market order - not fill order - buy', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await createOrder(2, 'buy', 50);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(10);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+50);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-50);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+5);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(5);
  });

  it('test market order - exceed fill order - buy', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await createOrder(2, 'buy', 200);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(10);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test market order - exactly fill order - sell', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(10);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test market order - not fill order - sell', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 5);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(10);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+50);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(50);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+5);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-5);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test market order - exceed fill order - sell', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 20);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(10);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test market order - 1 vs 2 - not fill orders - buy', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await createOrder(1, 'sell', 10, 5);
    await createOrder(2, 'buy', 120);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['quantity']).toEqual(3);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'][0]['quantity']).toEqual(3);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual((10 * 5 + 7 * 10)/(10 + 7));

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+120);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-120);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-20);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+17);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(3);
  });

  it('test market order - 1 vs 2 - exceed fill orders - buy', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await createOrder(1, 'sell', 10, 5);
    await createOrder(2, 'buy', 200);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual((10 * 5 + 10 * 10)/(10 + 10));

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+150);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-150);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-20);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+20);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test market order - 1 vs 2 - exactly fill orders - sell', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(1, 'buy', 100, 5);
    await createOrder(2, 'sell', 30);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual((10 * 10 + 20 * 5)/(10 + 20));

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-200);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+200);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+30);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-30);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test market order - 1 vs 2 - exceed fill orders - sell', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(1, 'buy', 100, 5);
    await createOrder(2, 'sell', 50);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual((10 * 10 + 20 * 5)/(10 + 20));

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-200);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+200);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+30);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-30);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test market order - 1 vs 2 - not fill orders - sell', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(1, 'buy', 100, 5);
    await createOrder(2, 'sell', 25);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['price']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual((10 * 10 + 15 * 5)/(10 + 15));

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-200);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+100+75);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(25);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+25);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-25);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test non-integer order quantity', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100, 13);
    await createOrder(2, 'sell', 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(13);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-100);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+91);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(9);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+7);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-7);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    await createOrder(1, 'buy', 10, 10);
    await createOrder(2, 'sell', 1);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(10);
  });

  it('test currentPrice calculation', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 10);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(10);

    await createOrder(1, 'buy', 100, 20);
    await createOrder(2, 'sell', 20);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(20);

    await createOrder(1, 'buy', 100, 15);
    await createOrder(2, 'sell', 15);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(15);

    await createOrder(1, 'buy', 100, 13);
    await createOrder(2, 'sell', 10, 10);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(15);
  });

  it('test create order with 0 price', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100, 0);
    await createOrder(2, 'sell', 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(undefined);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-10);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(10);
  });

  it('test create order with 0 quantity', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 0, 10);
    await createOrder(2, 'sell', 0, 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(undefined);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test cancel order - buy', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await cancelOrder(1, 0);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(undefined);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test cancel order - sell', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await cancelOrder(1, 0);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(undefined);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test insufficient funds', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 100000, 1);
    await createOrder(2, 'sell', 100000);
    
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(undefined);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test cont create & cancel orders', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 1, 1);
    await createOrder(1, 'buy', 2, 2);
    await createOrder(1, 'buy', 3, 3);
    await cancelOrder(1, 0);
    await cancelOrder(1, 0);
    await cancelOrder(1, 0);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(undefined);
    expect((await (await user1Contract.readState()).cachedValue.errorMessages)).toEqual({});

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test match self order', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 1, 1);
    await createOrder(1, 'sell', 1, 1);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders']).toEqual([]);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(1);

    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

  it('test distribute fee', async () => {
    await Initialize();
    await addPair();

    await createOrder(1, 'buy', 1000, 1);
    await createOrder(2, 'sell', 1000, 1);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['orders']).toEqual([]);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user1WalletAddress]['0'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userOrders'][user2WalletAddress]).toEqual(undefined);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['0']['currentPrice']).toEqual(1);

    // This test may NG because RANDOM number gen feature!!!
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000-1000+1);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000+999);
    expect((await user1Tar.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);

    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user1WalletAddress
    })).result['balance']).toEqual(10000+999+1);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: user2WalletAddress
    })).result['balance']).toEqual(10000-1000);
    expect((await user1TestToken.viewState({
      function: 'balanceOf',
      target: contractTxId
    })).result['balance']).toEqual(0);
  });

});
