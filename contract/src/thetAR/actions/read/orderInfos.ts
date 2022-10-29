import * as type from '../../types/types';

declare const ContractError;

export const orderInfos = async (
  state: type.State,
  action: type.Action,
): Promise<type.ContractResult> => {
  let result: type.Result;

  result = state.orderInfos;

  return { result };
};
