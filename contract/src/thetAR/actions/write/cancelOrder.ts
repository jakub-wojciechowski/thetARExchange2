import * as type from '../../types/types';
import { isAddress } from '../common';

declare const ContractError;

export const cancelOrder = async (
  state: type.State,
  action: type.Action,
): Promise<type.ContractResult> => {
  const param: type.cancelOrderParam = <type.cancelOrderParam>action.input.params;
  const orderId: string = param.orderId;
  const pairId: number = param.pairId;

  if (!isAddress(orderId)) {
    throw new ContractError(`OrderId not found: ${param.orderId}!`);
  }
  if (!(param.pairId <= state.maxPairId && param.pairId >= 0)) {
    throw new ContractError('PairId not valid!');
  }
  const orderInfo = state.userOrders[action.caller][pairId].find(v=>v.orderId===orderId);
  const pairInfo = state.pairInfos.find(i=>i.pairId===pairId);
  if (!orderInfo) {
    throw new ContractError(`Cannot get access to pairId: ${pairId}!`);
  }
  if (!pairInfo) {
    throw new ContractError(`Pair info record not found: ${pairId}!`);
  }

  const tokenAddress = orderInfo.direction === 'buy' ? 
      state.thetarTokenAddress : pairInfo.tokenAddress;
  const quantity = orderInfo.direction === 'buy' ? 
      orderInfo.price * orderInfo.quantity : orderInfo.quantity;

  await SmartWeave.contracts.write(
    tokenAddress, 
    { function: 'transfer', to: action.caller, amount: quantity},
  );

  let ordersForUser = state.userOrders[action.caller][pairId];
  state.userOrders[action.caller][pairId] = 
      ordersForUser.filter(i=>i.orderId!==orderId);

  let ordersForPair = state.orderInfos[pairId].orders;
  state.orderInfos[pairId].orders = 
      ordersForPair.filter(i=>i.orderId!==orderId);

  return { state };
};