import { MyOrders } from './MyOrders';

export const My = (props) => {
  if (!props.walletConnect) {
    return (
      <div className='darkRow'>
        Please connect wallet first!
      </div>
    );
  }
  
  return (
    <>
      <MyOrders />
    </>
  );
};