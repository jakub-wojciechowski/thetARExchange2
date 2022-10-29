import React from 'react';
import { calculatePriceWithDecimals, orderInfo, readState, txInfo } from '../lib/api';

export const OrderList = (props) => {
  const [refreshDisabled, setRefreshDisabled] = React.useState(false);
  const [orders, setOrders] = React.useState(props.orders);

  function onRefreshButtonClicked() {
    setRefreshDisabled(true);
    readState(); //debug
    // txInfo(); //debug
    orderInfo(parseInt(props.pairId)).then(async ret => {
      console.log('onRefreshButtonClicked, orderInfo: ', ret);
      setRefreshDisabled(false);
      if (ret.status === true) {
        setOrders(ret.result);
      }
    });
  }

  function renderOrders() {
    const buys = orders.orders.filter(e=>e.direction === 'buy').
        sort((a, b)=>a.price < b.price ? 1 : -1).slice(0, 10);
    const sells = orders.orders.filter(e=>e.direction === 'sell').
        sort((a, b)=>a.price > b.price ? 1 : -1).slice(0, 10);
    
    let orderItems = [];

    const sz = buys.length > sells.length ? buys.length : sells.length;
    for (let i = 0; i < sz; i ++) {
      const orderItem = [
        '-', // buy price
        '-', // buy quantity
        '-', // sell price
        '-', // sell quantity
      ];
      if (buys[i]) {
        orderItem[0] = buys[i].price;
        orderItem[1] = buys[i].quantity;
      }
      if (sells[i]) {
        orderItem[2] = sells[i].price;
        orderItem[3] = sells[i].quantity;
      }

      orderItems.push(orderItem);
    }

    return orderItems.map(item=>
      <tr>
        <td className='tableCol'>{item[0]}</td>
        <td className='tableCol'>{item[1]}</td>
        <td className='tableCol'>{item[2]}</td>
        <td className='tableCol'>{item[3]}</td>
      </tr>
    );
  }

  return (
    <>
      <div className='ordersText'>
        <div className='blue'>
          Token Price: {orders.currentPrice ? calculatePriceWithDecimals(orders.currentPrice, props.decimals) : 'N/A'}
        </div>
        &nbsp;&nbsp;
        <button 
          className='refreshButton' 
          disabled={refreshDisabled} 
          onClick={onRefreshButtonClicked}
        >Refresh</button>
      </div>
      
      <table>
        <tr>
          <td className='tableTitle' colspan='2'>Buy</td>
          <td className='tableTitle' colspan='2'>Sell</td>
        </tr>
        <tr>
          <td className='tableTitle'>Price</td>
          <td className='tableTitle'>Amount</td>
          <td className='tableTitle'>Price</td>
          <td className='tableTitle'>Amount</td>
        </tr>
        {renderOrders()}
      </table>
      <br /><br />
    </>
  );
};