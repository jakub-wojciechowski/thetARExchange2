import React from 'react';
import Select from 'react-select';
import TextareaAutosize from 'react-textarea-autosize';
import { 
  arLessThan,
  createOrder
} from '../lib/api';
import { SubmitButton } from './SubmitButton/SubmitButton';

export const MakeOrder = (props) => {
  const orderTypeOption = [
    {value: 'limit', label: 'Limit'},
    {value: 'market', label: 'Market'},
  ];
  const directionOption = [
    {value: 'buy', label: 'Buy'}, 
    {value: 'sell', label: 'Sell'}
  ];
  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      background: '#fff',
      borderColor: '#9e9e9e',
      minHeight: '30px',
      height: '30px',
      boxShadow: state.isFocused ? null : null,
    }),

    valueContainer: (provided, state) => ({
      ...provided,
      height: '30px',
      padding: '0 8px'
    }),

    input: (provided, state) => ({
      ...provided,
      margin: '0px',
    }),
    indicatorSeparator: state => ({
      display: 'none',
    }),
    indicatorsContainer: (provided, state) => ({
      ...provided,
      height: '30px',
    }),
  };

  const [orderTypeText, setOrderTypeText] = React.useState(orderTypeOption[0]);
  const [dirTypeText, setDirTypeText] = React.useState(directionOption[0]);
  const [volumeText, setVolumeText] = React.useState();
  const [priceText, setPriceText] = React.useState();

  async function onMakeOrder() {
    // check for order type
    if (orderTypeText.value === 'market' && props.orders.length === 0) {
      return {status: false, result: 'No orders in orderbook, cannot create market order now!'};
    }

    const volume = parseInt(volumeText);
    const price = orderTypeText.value === 'limit' ? parseInt(priceText) : undefined;

    // check for funds amout
    let targetAmout = 0;
    if (orderTypeText.value === 'market' || dirTypeText.value === 'sell') {
      targetAmout = volume;
    } else {
      targetAmout = volume * price;
    }
    if ((dirTypeText.value === 'buy' && targetAmout > props.dominentBalance) ||
        (dirTypeText.value === 'sell' && targetAmout > props.pstBalance)) {
      return {status: false, result: 'Insuffient funds!'};
    }
    if (arLessThan(props.arBalance, '0.02')) {
      return {status: false, result: 'You should have at least 0.02$AR in your wallet to pay for fees!'};
    }

    const ret = await createOrder(dirTypeText.value, targetAmout, price, parseInt(props.pairId));
    await props.onUpdateBalance();
    return ret;
  }

  function checkTextValidation(text) {
    if (text === '') return true;
    return /^[0-9\.]{1,21}$/.test(text);
  }

  function setVolume(value) {
    if (checkTextValidation(value)) {
      setVolumeText(value);
    }
  }

  function setPrice(value) {
    if (checkTextValidation(value)) {
      setPriceText(value);
    }
  }

  return (
    <>
      <div className='MakeOrderLine'>
        <div className='blue'> Order Type: &nbsp;</div>
        <Select 
          className='select'
          value={orderTypeText}
          options={orderTypeOption}
          onChange={setOrderTypeText}
          styles={customSelectStyles}
        /> &nbsp;&nbsp;
        <div className='blue'>Direction: &nbsp;</div>
        <Select 
          className='select'
          value={dirTypeText}
          options={directionOption}
          onChange={setDirTypeText}
          styles={customSelectStyles}
        />
      </div>

      <div className='MakeOrderLine'>
        <div className='blue'>Volume: &nbsp;</div>
        <TextareaAutosize
          className='textInput'
          value={volumeText}
          onChange={e => setVolume(e.target.value)}
          rows="1" 
        />
        <div className='gray'>$
          {
            orderTypeText.value==='market'&&dirTypeText.value==='buy' ? 
            props.dominentTicker : props.pstTicker
          }
        </div>
        
        &nbsp;&nbsp;&nbsp;

        { orderTypeText.value === 'limit' &&
          <>
            <div className='blue'>Price: &nbsp;</div>
            <TextareaAutosize
              className='textInput'
              value={priceText}
              onChange={e => setPrice(e.target.value)}
              rows="1" 
            />
            <div className='gray'>${props.dominentTicker}&nbsp;</div>
          </>
        }
      </div>

      <SubmitButton 
        buttonText='Create Order'
        buttonSize='Medium'
        submitTask={onMakeOrder}
        disabled={!dirTypeText || !volumeText || (orderTypeText.value === 'limit' && !priceText)}
      />
    </>
  );
};