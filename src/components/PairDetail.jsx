import React from 'react';
import { useParams } from "react-router-dom";
import { sleep } from 'warp-contracts';
import { 
  pairInfo,
  orderInfo,
  getWalletAddress,
  getBalance,
  tarAddress,
  tarSymbol,
  tarDecimals
} from '../lib/api';
import { MakeOrder } from './MakeOrder';
import { OrderList } from './OrderList';
import { PageLoading } from './PageLoading/PageLoading';

export const PairDetail = (props) => {
  const dominentSymbol = tarSymbol;
  const params = useParams();
  const [walletAddress, setWalletAddress] = React.useState();

  const [arBalance, setArBalance] = React.useState('N/A');
  const [pstBalance, setPstBalance] = React.useState('N/A');
  const [dominentBalance, setDominentBalance] = React.useState('N/A');

  const [pair, setPair] = React.useState();
  const [order, setOrder] = React.useState();
  
  React.useEffect(async () => {
    const tryGetWalletAddress = async () => {
      const walletAddress = getWalletAddress();
      if (!walletAddress) {
        await sleep(5000);
        tryGetWalletAddress();
      } else {
        setWalletAddress(walletAddress);
      }
    }

    tryGetWalletAddress();
  }, []);

  // React.useEffect(async () => {
  //   await fetchBalance();
  // }, [pair&&walletAddress]);

  async function fetchBalance() {
    const arBalanceRet = await getBalance('ar');
    if (!arBalanceRet.status) {
      return;
    }
    setArBalance(arBalanceRet.result);
  
    const pstBalanceRet = await getBalance(pair.tokenAddress);
    if (!pstBalanceRet.status) {
      return;
    }
    setPstBalance(pstBalanceRet.result);

    const dominentBalanceRet = await getBalance(tarAddress);
    if (!dominentBalanceRet.status) {
      return;
    }
    setDominentBalance(dominentBalanceRet.result);
  }

  async function fetchInfos() {
    const pairId = parseInt(params.pairId);
    const pairInfoRet = await pairInfo(pairId);
    if (!pairInfoRet.status) {
      return pairInfoRet;
    }
    setPair(pairInfoRet.result);

    const orderInfoRet = await orderInfo(pairId);
    if (!orderInfoRet.status) {
      return orderInfoRet;
    }
    setOrder(orderInfoRet.result);
    return {status: true, result: "Fetch infos sucessful!"}
  }

  return (
    <>
      <PageLoading 
        submitTask={fetchInfos}
      />
      {pair && order &&
        <>
          <div className='PairDetailTitle'>
            Pair:&nbsp;&nbsp;
            #{pair.pairId}&nbsp;&nbsp;
            ${pair.symbol} / ${dominentSymbol}
          </div>

          <div className='PairDetailInfo'>
            Token Address:&nbsp;&nbsp;
            <a href='https://www.arweave.net/s7ksIBcS3fPMuKcoQEGNg0R-QyDmx5sZria00t9ydDw'> 
              {pair.tokenAddress} 
            </a>
          </div>
          <div className='PairDetailInfo'>Description: {pair.description}</div>
          <div className='PairDetailInfo'>$AR Balance: {arBalance}</div>
          <div className='PairDetailInfo'>${pair.symbol} Balance: 
            {(pstBalance*Math.pow(10, -pair.decimals)).toFixed(pair.decimals)}
          </div>
          <div className='PairDetailInfo'>${dominentSymbol} Balance: 
            {(dominentBalance*Math.pow(10, -tarDecimals)).toFixed(tarDecimals)}
          </div>

          <hr width="90%" SIZE='1' color='#6f7a88'/>
          <MakeOrder 
            pstTicker={pair.symbol}
            pstBalance={pstBalance}
            dominentTicker={dominentSymbol}
            dominentBalance={dominentBalance}
            arBalance={arBalance}
            orders={order}
            pairId={pair.pairId}
            onUpdateBalance={fetchBalance}
          />
          <hr width="90%" SIZE='1' color='#6f7a88'/>

          <OrderList 
            orders={order}
            pairId={pair.pairId}
            decimals={pair.decimals}
          />
        </>
      }
    </>
  );
};