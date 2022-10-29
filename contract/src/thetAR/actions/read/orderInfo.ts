import * as type from '../../types/types';

declare const ContractError;

export const orderInfo = async (
  state: type.State,
  action: type.Action,
): Promise<type.ContractResult> => {
  const param: type.orderInfoParam = <type.orderInfoParam>action.input.params;
  let pairId: number = param.pairId;
  let result: type.Result;

  if (!Number.isInteger(pairId) || pairId < 0 || pairId > state.maxPairId) {
    throw new ContractError(`Invalid pairId!`);
  }

  result = state.orderInfos[pairId];

  return { result };
};
