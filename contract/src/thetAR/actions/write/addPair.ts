import * as type from '../../types/types';
import { hashCheck, isAddress } from '../common';

declare const ContractError;

export const addPair = async (
  state: type.State,
  action: type.Action,
): Promise<type.ContractResult> => {
  const param: type.addPairParam = <type.addPairParam>action.input.params;
  const tokenAddress: string = param.tokenAddress;
  const logoTx: string = param.logo;
  const description: string = param.description;
  if (!isAddress(tokenAddress)) {
    throw new ContractError('Token address format error!');
  }
  if (!isAddress(logoTx)) {
    throw new ContractError('You should enter transaction id for Arweave of your logo!');
  }
  if (!validDescription(description)) {
    throw new ContractError('Description you enter is not valid!');
  }


  if (action.caller !== state.owner) {
    const txQty = SmartWeave.transaction.quantity;
    const txTarget = SmartWeave.transaction.target;
    if (txTarget !== state.owner) {
      throw new ContractError('AddPair fee sent to wrong target!');
    }
    if (SmartWeave.arweave.ar.isLessThan(txQty, SmartWeave.arweave.ar.arToWinston('10'))) {
      throw new ContractError('AddPair fee not right!');
    }
    
    if (!await hashCheck(state.tokenSrcTemplateHashs, tokenAddress)) {
      throw new ContractError('Pst contract validation check failed!');
    }
  }
  if (state.pairInfos.map(info=>info.tokenAddress).includes(tokenAddress)) {
    throw new ContractError('Pair already exists!');
  }

  const tokenState = await SmartWeave.contracts.readContractState(tokenAddress);

  state.maxPairId ++;
  state.pairInfos.push({
    pairId: state.maxPairId,
    tokenAddress: tokenAddress,
    logo: logoTx,
    description: description,
    name: tokenState.name,
    symbol: tokenState.symbol,
    decimals: tokenState.decimals
  });
  state.orderInfos[state.maxPairId] = {
    currentPrice: undefined,
    orders: [],
  };
  for (const user in state.userOrders) {
    if (Object.prototype.hasOwnProperty.call(state.userOrders, user)) {
      let userOrder = state.userOrders[user];
      userOrder[state.maxPairId] = [];
    }
  }

  return { state };
};

export const validDescription = (desc: string) => /[a-z0-9_\s\:\/-]{1,128}/i.test(desc);