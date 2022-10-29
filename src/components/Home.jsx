import React from 'react';
import { 
  pairInfos,
  orderInfos,
} from '../lib/api';
import { PageLoading } from './PageLoading/PageLoading';
import { PairList } from './PairList';
import { SearchFrame } from './SearchFrame/SearchFrame';

const trustPairIds = [0];

export const Home = (props) => {
  const [pairs, setPairInfos] = React.useState();
  const [orders, setOrderInfos] = React.useState();
  const [pairFilter, setPairFilter] = React.useState('');

  async function searchPairs() {
    let status = true;
    let result = '';

    const pairInfosRet = await pairInfos();
    if (pairInfosRet.status === false) {
      setPairInfos(pairInfosRet);
      return pairInfosRet;
    }

    const orderInfosRet = await orderInfos();
    if (orderInfosRet.status === false) {
      setOrderInfos(orderInfosRet);
      return orderInfosRet;
    }

    setPairInfos(pairInfosRet);
    setOrderInfos(orderInfosRet);

    result = 'Pair list pre-load success!';

    return {status: status, result: result};
  }

  function trigger(inputContent) {
    setPairFilter(inputContent);
  }

  function renderPairList() {
    console.log('render pair list: ',
        'pairs: ', pairs,
        'filter: ', pairFilter
    );

    // parse type and filter
    let type = 'address';
    let parsedFilter = pairFilter;
    if (pairFilter.length >= 1 && pairFilter[0] === '$') {
      type = 'ticker';
      parsedFilter = pairFilter.substring(1);
    }
    if (pairFilter.length >= 1 && pairFilter[0] === '#') {
      type = 'id';
      parsedFilter = pairFilter.substring(1);
    }
    if (pairFilter.length === 0) {
      type = 'all';
    }

    // convert 'ticker' & 'address' type to 'id' type...
    let cvtFilter = [];

    // case1: ticker type
    let addrFilter = [];
    if (type === 'ticker') {
      addrFilter = addrFilter.concat(
          pairs.result.filter(i=>i.symbol.toLowerCase().includes(parsedFilter.toLowerCase())).
          map(i=>i.tokenAddress));
    }

    // case2: address type
    if (type === 'address') {
      addrFilter = [parsedFilter];
    }

    // for case1 & 2: convert token address to pairId
    addrFilter.forEach(addr => {
      cvtFilter = cvtFilter.concat(
          pairs.result.filter(i=>i.tokenAddress === addr).
          map(i=>parseInt(i.pairId))
    )});

    // case3: id type
    if (type === 'id') {
      const nParsedFilter = parseInt(parsedFilter);
      if (!Number.isInteger(nParsedFilter)) return;
      if (nParsedFilter >= pairs.result.length) return;
      cvtFilter = [nParsedFilter];
    }

    // case4: all type
    if (type === 'all') {
      cvtFilter = pairs.result.map(i=>parseInt(i.pairId));
    }

    console.log(
      'cvtFilter: ', cvtFilter,
      'addrFilter: ', addrFilter,
    );
    // collect detailed pair infos
    let aggregatedPairInfos = [];
    cvtFilter.forEach(pairId => {
      if (pairId === undefined) return;
      const info = pairs.result.filter(i=>i.pairId === pairId)[0];
      console.log('info: ', pairs.result.filter(i=>i.pairId === pairId));
      const targetPair = pairs.result.filter(i=>i.tokenAddress === info.tokenAddress)[0];
      const dmntTicker = 'TAR';
      const price = orders.result[pairId].currentPrice;
      const trusted = trustPairIds.includes(pairId);
      aggregatedPairInfos.push({
        pairId,
        pstTicker: targetPair.symbol,
        logo: targetPair.logo,
        description: targetPair.description,
        decimals: targetPair.decimals,
        dmntTicker,
        price,
        trusted,
      });
    });

    console.log('aggregatedPairInfos: ', aggregatedPairInfos);

    return (
      <PairList 
        pairList={aggregatedPairInfos}
      />
    );
  }
  
  return (
    <>
      <SearchFrame
        prompt={`Enter '$ticker' OR '#pairId' OR 'pstAddress'`}
        onSearch={trigger}
      />
      <PageLoading 
        submitTask={searchPairs}
      />
      { 
        pairs && pairs.result && 
        orders && orders.result &&
        renderPairList() 
      }
    </>
  );
};