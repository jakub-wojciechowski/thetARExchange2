import * as type from '../../types/types';
import { selectWeightedTokenHolder } from '../common';

declare const ContractError;
interface Transaction {
  tokenType: 'trade' | 'dominent';
  to: string;
  quantity: number;
}

export const createOrder = async (
  state: type.State,
  action: type.Action,
): Promise<type.ContractResult> => {
  const param: type.createOrderParam = <type.createOrderParam>action.input.params;
  if (!(param.pairId <= state.maxPairId && param.pairId >= 0)) {
    throw new ContractError('PairId not valid!');
  }
  if (param.price !== undefined && param.price !== null) {
    if (typeof(param.price) !== 'number') {
      throw new ContractError('Price must be a number!');
    }
    if (param.price <= 0 || !Number.isInteger(param.price)) {
      throw new ContractError('Price must be positive integer!');
    }
  }

  const newOrder: type.orderInterface = {
    creator: action.caller,
    orderId: SmartWeave.transaction.id,
    direction: param.direction,
    quantity: await checkOrderQuantity(state, action),
    price: param.price,
  }

  let selectedFeeRecvr = undefined;
  try {
    selectedFeeRecvr = await selectWeightedTokenHolder(await tokenBalances(state.thetarTokenAddress));
  } catch {}
  const { newOrderbook, newUserOrders, transactions, currentPrice } = await matchOrder(
    newOrder,
    state.orderInfos[param.pairId].orders,
    state.userOrders,
    param.pairId,
    action.caller,
    state.feeRatio,
    selectedFeeRecvr,
  );

  // update orderInfos and userOrders
  state.orderInfos[param.pairId].orders = newOrderbook;
  state.userOrders = newUserOrders;

  // update pair's current price
  if (!isNaN(currentPrice) && isFinite(currentPrice)) {
    state.orderInfos[param.pairId].currentPrice = currentPrice;
  }
  
  // make transactions
  for await (const tx of transactions) {
    const matchedPair = state.pairInfos.find(i=>i.pairId===param.pairId);
    const targetTokenAdrress = tx.tokenType === 'dominent' ? 
        state.thetarTokenAddress : matchedPair.tokenAddress;
    await SmartWeave.contracts.write(
      targetTokenAdrress, 
      { function: 'transfer', to: tx.to, amount: tx.quantity},
    );
  }
  
  return { state };
};

const tokenBalances = async (tokenAddress) => {
  return (await SmartWeave.contracts.readContractState(tokenAddress)).balances;
}

const checkOrderQuantity = async (
  state: type.State,
  action: type.Action,
): Promise<number> => {
  const param: type.createOrderParam = <type.createOrderParam>action.input.params;

  // fetch allowance
  let pairInfo = state.pairInfos.find(pair=>pair.pairId===param.pairId);
  const tokenAddress: string = param.direction === 'buy' ? state.thetarTokenAddress : pairInfo.tokenAddress;
  const tokenState = await SmartWeave.contracts.readContractState(tokenAddress);
  let orderQuantity = tokenState.allowances[action.caller][SmartWeave.contract.id];

  // transfer token(s) to contract address
  await SmartWeave.contracts.write(
    tokenAddress, 
    { function: 'transferFrom', from: action.caller, to: SmartWeave.contract.id, amount: orderQuantity},
  );

  // If direction is buy and order type is limit, covert quantity metric to that of wanted token
  // All quantity in orderbook should metric in trade token, 
  // but in `market` order type & `buy` direction we don't know that.
  if (param.direction === 'buy' && param.price) {
    orderQuantity = Math.floor(orderQuantity / param.price);
  }
  return orderQuantity;
};

const matchOrder = async (
  newOrder: type.orderInterface,
  orderbook: type.orderInterface[],
  userOrders: {
    [walletAddress: string]: {
      [pairId: number]: type.orderInterface[];
    }
  },
  newOrderPairId,
  caller,
  feeRatio: number,
  selectedFeeRecvr: string | undefined,
): Promise<{
  newOrderbook: type.orderInterface[], 
  newUserOrders: {
    [walletAddress: string]: {
      [pairId: number]: type.orderInterface[];
    }
  },
  transactions: Transaction[],
  currentPrice: number,
}> => {
  let transactions: Transaction[] = Array<Transaction>();
  const targetSortDirection = newOrder.direction === 'buy' ? 'sell' : 'buy';
  let totalTradePrice = 0;
  let totalTradeVolume = 0;

  const reverseOrderbook = orderbook.filter(order=>
    order.direction===targetSortDirection
  ).sort((a, b) => {
    if (newOrder.direction === 'buy') {
      return a.price > b.price ? 1 : -1;
    } else {
      return a.price > b.price ? -1 : 1;
    }
  });

  const orderType = newOrder.price ? 'limit' : 'market';
  if (reverseOrderbook.length === 0 && orderType === 'market') {
    throw new ContractError(`The first order must be limit type!`);
  }
  const newOrderTokenType = 
        orderType === 'market' && newOrder.direction === 'buy' ? 
        'dominent' : 'trade';

  for (let i = 0; i < reverseOrderbook.length; i ++) {
    const order = reverseOrderbook[i];

    // For limit type order, we only process orders which price equals to newOrder.price
    if (orderType === 'limit' && order.price !== newOrder.price) {
      continue;
    }

    const targetPrice = order.price;
    const orderAmount = order.quantity;
    const newOrderAmoumt = newOrderTokenType === 'trade' ? 
        newOrder.quantity : Math.floor(newOrder.quantity / targetPrice);
    const targetAmout = orderAmount < newOrderAmoumt ? orderAmount : newOrderAmoumt;

    totalTradePrice += targetPrice * targetAmout;
    totalTradeVolume += targetAmout;

    if (targetAmout === 0) {
      break;
    }

    /// generate transactions

    // step1. calculate fee
    const dominentFee = Math.floor(targetAmout * targetPrice * feeRatio);
    const tradeFee = Math.floor(targetAmout * feeRatio);
    const dominentSwap = targetAmout * targetPrice - dominentFee;
    const tradeSwap = targetAmout - tradeFee;

    // step2. make swap
    const buyer = newOrder.direction === 'buy' ? newOrder : order;
    const seller = newOrder.direction === 'buy' ? order : newOrder;
    transactions.push({
      tokenType: 'dominent',
      to: seller.creator,
      quantity: dominentSwap,
    });
    transactions.push({
      tokenType: 'trade',
      to: buyer.creator,
      quantity: tradeSwap,
    });

    // step3. transfer fee
    if (selectedFeeRecvr) {
      transactions.push({
        tokenType: 'dominent',
        to: selectedFeeRecvr,
        quantity: dominentFee,
      });
      transactions.push({
        tokenType: 'trade',
        to: selectedFeeRecvr,
        quantity: tradeFee,
      });
    }
    
    /// update Objects

    // 1. update orderbook
    order.quantity -= targetAmout;
    if (order.quantity === 0) {
      orderbook = orderbook.filter(v=>v.orderId!==order.orderId);
    }

    // 2. update Order in userOrders
    let userOrderInfos = userOrders[order.creator][newOrderPairId];
    let matchedOrderIdx = userOrderInfos.findIndex(value=>value.orderId===order.orderId);
    userOrderInfos[matchedOrderIdx].quantity -= targetAmout;
    if (userOrderInfos[matchedOrderIdx].quantity === 0) {
      userOrders[order.creator][newOrderPairId] = 
          userOrderInfos.filter(v=>v.orderId !== order.orderId);
    }

    // 3. update new order
    newOrder.quantity -= newOrderTokenType === 'trade' ? 
        targetAmout : targetAmout * targetPrice;
  }

  /// if there are remaining tokens:

  // case1: refund user 
  if (orderType === 'market' && newOrder.quantity !== 0) {
    transactions.push({
      tokenType: newOrderTokenType,
      to: newOrder.creator,
      quantity: newOrder.quantity,
    });
    newOrder.quantity = 0;
  }
  // case2: update orderbook and userOrders
  if (orderType === 'limit' && newOrder.quantity !== 0) {
    orderbook.push({...newOrder});
  }
  if (newOrder.quantity !== 0) {
    if (userOrders[caller] === undefined) {
      userOrders[caller] = {};
    }
    if (userOrders[caller][newOrderPairId] === undefined) {
      userOrders[caller][newOrderPairId] = [];
    }
    userOrders[caller][newOrderPairId].push({...newOrder});
  }


  return {
    newOrderbook: orderbook,
    newUserOrders: userOrders,
    transactions: transactions,
    currentPrice: totalTradePrice / totalTradeVolume
  };
};
