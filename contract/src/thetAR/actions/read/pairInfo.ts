import * as type from '../../types/types';

declare const ContractError;

export const pairInfo = async (
  state: type.State,
  action: type.Action,
): Promise<type.ContractResult> => {
  const param: type.pairInfoParam = <type.pairInfoParam>action.input.params;
  let pairId: number = param.pairId;
  let result: type.Result;

  if (!Number.isInteger(pairId) || pairId < 0 || pairId > state.maxPairId) {
    throw new ContractError(`Invalid pairId!`);
  }

  result = state.pairInfos.filter(i=>i.pairId===pairId)[0];

  return { result };
};
