export interface addPairParam {
  tokenAddress: string;
  logo: string;
  description: string;
}

export interface createOrderParam {
  pairId: number;
  direction: 'buy' | 'sell';
  price?: number;
}

export interface cancelOrderParam {
  pairId: number;
  orderId: string;
}

export interface pairInfoParam {
  pairId: number;
}

export interface tokenInfoParam {
  pstAddress: string;
}

export interface addTokenHashParam {
  hash: number;
}

export type orderInfoParam = pairInfoParam;

export interface userOrderParam {
  address: string;
}

export interface currentPriceResult {
  currentPrice: number;
}

export interface userOrderResult {
  [pairId: number]: orderInterface[];
}

export type pairInfoResult = pairInfoInterface;

export type tokenInfoResult = tokenInfoInterface;

export interface orderInfoResult {
  currentPrice: number;
  orders: orderInterface[];
}

export interface orderInfosResult {
  [pairId: number]: { 
    currentPrice: number;
    orders: orderInterface[];
  };
}

export interface Action {
  input: Input;
  caller: string;
}

export interface Input {
  function: Function;
  params: Params;
}

export interface tokenInfoInterface {
  tokenAddress: string;
  logo: string;
  description: string;
}

export interface orderInterface {
  creator: string;
  direction: 'sell' | 'buy';
  quantity: number;
  price: number;
  orderId: string;
}

export interface pairInfoInterface {
  pairId: number;
  tokenAddress: string;
  logo: string;
  description: string;
  name: string;
  symbol: string;
  decimals: string;
}

export interface State {
  owner: string;
  feeRatio: number;
  tokenSrcTemplateHashs: number[];
  thetarTokenAddress: string;
  maxPairId: number;

  pairInfos: pairInfoInterface[];
  userOrders: {
    [walletAddress: string]: {
      [pairId: number]: orderInterface[];
    }
  }
  orderInfos: {
    [pairId: number]: { 
      currentPrice: number;
      orders: orderInterface[];
    };
  };
}

export type Function = 
    'createOrder' | 
    'cancelOrder' | 
    'addPair' | 
    'pairInfo' |
    'tokenInfo' |
    'pairInfos' |
    'tokenInfos' |
    'orderInfo' |
    'orderInfos' |
    'addTokenHash' |
    'userOrder';

export type Params = 
    createOrderParam |
    addPairParam |
    cancelOrderParam |
    pairInfoParam |
    tokenInfoParam |
    orderInfoParam |
    addTokenHashParam |
    userOrderParam;

export type Result = 
    pairInfoResult |
    tokenInfoResult |
    pairInfoResult[] |
    tokenInfoResult[] |
    orderInfoResult |
    orderInfosResult |
    userOrderResult;
    
export type ContractResult = { state: State } | { result: Result };
