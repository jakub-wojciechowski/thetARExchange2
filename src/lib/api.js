import {
  WarpFactory,
  LoggerFactory,
  sleep,
} from 'warp-contracts';
import { selectWeightedPstHolder } from 'smartweave';
/* global BigInt */

LoggerFactory.INST.logLevel('error');

// addresses
const thetARContractAddress = 'xJ9SXNlziAAp-RrOMUKLhHDItVYiPuLSRAbtg2Fv5k4';
const feeWalletAdrress = 'JJFq7UFAD-7P4oRV9O6hhmAEeLenrprJja6bxNisIeA';


const warp = WarpFactory.forLocal(1984, undefined, {inMemory: false});
// const warp = WarpFactory.forTestnet();
// const warp = WarpFactory.forMainnet();
const arweave = warp.arweave;
let walletAddress = undefined;
export let isConnectWallet = false;
export let tarAddress;
export let tarSymbol;
export let tarDecimals;

let thetARContract = undefined;

// export async function txInfo() {
//   const txs = [
//     '8KIEY03eVHjzdnpQjbMDn-PO0CIc4AllQQPEpH8dSo8',
//     'MfcWJgngTpi3MnT683zSlrH_H0y24wP3Kt9Rthy8QeI',
//     'VYtreO_HjCyak7L2DmooBme4Ihi716-3_Gj3dlSq5RQ',
//   ]
//   let res = [];

//   for (let i = 0; i < txs.length; i++) {
//     const tx = txs[i];
//     let ret = {tx: tx, k_v: {}};
//     const info = await arweave.transactions.get(tx);
//     info.get('tags').forEach(tag => {
//       const key = tag.get('name', {decode: true, string: true});
//       const value = tag.get('value', {decode: true, string: true});
//       ret.k_v[key] = value;
//     });
//     res.push(ret);
//   }

//   console.log('txInfo: ', res);
// }

export async function connectWallet(walletJwk) {
  thetARContract.connect(walletJwk);
  isConnectWallet = true;
  walletAddress = await arweave.wallets.jwkToAddress(walletJwk);
}

export async function connectContract() {
  thetARContract = warp.contract(thetARContractAddress);
  thetARContract.setEvaluationOptions({
    internalWrites: true,
    allowUnsafeClient: true,
    allowBigInt: true
  });

  tarAddress = (await thetARContract.readState()).cachedValue.state.thetarTokenAddress;

  const tarState = (await warp.contract(tarAddress).readState()).cachedValue.state;
  tarSymbol = tarState.symbol;
  tarDecimals = tarState.decimals;

  return {status: true, result: 'Connect contract success!'};
}

export function getWalletAddress() {
  return walletAddress;
}

export function arLessThan(a, b) {
  return arweave.ar.isLessThan(arweave.ar.arToWinston(a), arweave.ar.arToWinston(b));
}

export async function addPair(pstAddress) {
  if (!isConnectWallet) {
    return {status: false, result: 'Please connect your wallet first!'};
  }
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  if (!isWellFormattedAddress(pstAddress)) {
    return {status: false, result: 'Pst address not valid!'};
  }

  let result = "";
  let status = true;
  try {
    await thetARContract.writeInteraction(
      {
        function: 'addPair',
        params: {
          pstAddress: pstAddress
        }
      },
      {
        transfer: {
          target: feeWalletAdrress,
          winstonQty: await arweave.ar.arToWinston("0"),
        },
        disableBundling: true
      }
    );
    result = 'Add pair succeed!'
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function getBalance(pstAddress) {
  if (!isConnectWallet) {
    return {status: false, result: 'Please connect your wallet first!'};
  }
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  if (!isWellFormattedAddress(pstAddress) && pstAddress !== 'ar') {
    return {status: false, result: 'Pst address not valid!'};
  }

  let result = "";
  let status = true;
  try {
    if (pstAddress === 'ar') {
      result = arweave.ar.winstonToAr(await arweave.wallets.getBalance(getWalletAddress()));
    } else {
      result = await (await warp.contract(pstAddress).viewState({
        function: 'balanceOf',
        target: getWalletAddress(),
      })).result.balance;
    }
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function createOrder(direction, quantity, price, pairId) {
  if (!isConnectWallet) {
    return {status: false, result: 'Please connect your wallet first!'};
  }
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }
  if (direction !== 'sell' && direction !== 'buy') {
    return {status: false, result: 'Direction must either be BUY or SELL!'};
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {status: false, result: 'Quantity must be positive integer!'};
  }
  if (price !== undefined && (!Number.isInteger(price) || price <= 0)) {
    return {status: false, result: 'Price must either be positive integer or undefined!'};
  }
  if (!Number.isInteger(pairId) || pairId < 0) {
    return {status: false, result: 'PairId must be non-negative integer!'};
  }

  let result = "";
  let status = true;
  try {
    const pairInfo = (await thetARContract.dryWrite({
      function: 'pairInfo',
      params: {
        pairId: pairId
      }
    })).result;
    
    let token = warp.contract(direction === 'buy' ? tarAddress : pairInfo['tokenAddress']);
    token.connect('use_wallet');
    const transferTx = (await token.writeInteraction({
      function: 'approve',
      spender: thetARContractAddress,
      amount: quantity
    })).originalTxId;
    
    await thetARContract.writeInteraction({
      function: 'createOrder',
      params: {
        pairId: pairId,
        direction: direction,
        price: price
      }
    });
    
    result = 'Create order success!';
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function txStatus(tx) {
  return (await arweave.transactions.getStatus(tx)).status;
}

export async function pairInfo(pairId) {
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  let result = "";
  let status = true;
  try {
    result = (await thetARContract.dryWrite({
      function: "pairInfo",
      params: {
        pairId: pairId
      }
    })).result;
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function cancelOrder(pairId, orderId) {
  if (!isConnectWallet) {
    return {status: false, result: 'Please connect your wallet first!'};
  }
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }
  if (!Number.isInteger(pairId) || pairId < 0) {
    return {status: false, result: 'PairId must be non-negative integer!'};
  }
  if (!isWellFormattedAddress(orderId)) {
    return {status: false, result: 'orderId not valid!'};
  }

  let result = "";
  let status = true;
  try {
    const txId = await thetARContract.writeInteraction({
      function: 'cancelOrder',
      params: {
        pairId: pairId,
        orderId: orderId
      }
    });
    result = 'Order cancelled successfully!';
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function pairInfos() {
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  let result = "";
  let status = true;
  try {
    result = (await thetARContract.dryWrite({
      function: "pairInfos",
    })).result;
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function orderInfos() {
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  let result = "";
  let status = true;
  try {
    result = (await thetARContract.dryWrite({
      function: "orderInfos",
    })).result;
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function orderInfo(pairId) {
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }
  if (!Number.isInteger(pairId) || pairId < 0) {
    return {status: false, result: 'PairId must be non-negative integer!'};
  }

  let result = "";
  let status = true;
  try {
    result = (await thetARContract.dryWrite({
      function: "orderInfo",
      params: {
        pairId: pairId
      }
    })).result;
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function userOrder(address) {
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }
  if (!isWellFormattedAddress(address)) {
    return {status: false, result: 'Wallet address format error!'};
  }

  let result = "";
  let status = true;
  try {
    result = (await thetARContract.dryWrite({
      function: "userOrder",
      params: {
        address: address
      }
    })).result;
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function readState() {
  console.log('contract state: ', (await thetARContract.readState()));
}

export const isWellFormattedAddress = (input) => {
  const re = /^[a-zA-Z0-9_-]{43}$/;
  return re.test(input);
}

export const calculatePriceWithDecimals = (price, tradePrecision) => {
  const priceWithDecimal = price * Math.pow(10, -tarDecimals) * Math.pow(10, tradePrecision);
  const precision = tarDecimals - tradePrecision > 0 ? tarDecimals - tradePrecision : 0;
  return priceWithDecimal.toFixed(precision);
}