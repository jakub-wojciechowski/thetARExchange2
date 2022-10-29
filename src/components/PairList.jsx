import React from 'react';
import { Link } from 'react-router-dom';
import { calculatePriceWithDecimals, tarDecimals } from '../lib/api';

const verifiedIcon = <svg width="18px" height="18px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-labelledby="verifiedIconTitle" stroke="#50a2ff" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" fill="none" color="#50a2ff"> <title id="verifiedIconTitle">Verified</title> <path d="M8 12.5L10.5 15L16 9.5"/> <path d="M12 22C13.2363 22 14.2979 21.2522 14.7572 20.1843C14.9195 19.8068 15.4558 19.5847 15.8375 19.7368C16.9175 20.1672 18.1969 19.9453 19.0711 19.0711C19.9452 18.1969 20.1671 16.9175 19.7368 15.8376C19.5847 15.4558 19.8068 14.9195 20.1843 14.7572C21.2522 14.2979 22 13.2363 22 12C22 10.7637 21.2522 9.70214 20.1843 9.24282C19.8068 9.08046 19.5847 8.54419 19.7368 8.16246C20.1672 7.08254 19.9453 5.80311 19.0711 4.92894C18.1969 4.05477 16.9175 3.83286 15.8376 4.26321C15.4558 4.41534 14.9195 4.1932 14.7572 3.8157C14.2979 2.74778 13.2363 2 12 2C10.7637 2 9.70214 2.74777 9.24282 3.81569C9.08046 4.19318 8.54419 4.41531 8.16246 4.26319C7.08254 3.83284 5.80311 4.05474 4.92894 4.92891C4.05477 5.80308 3.83286 7.08251 4.26321 8.16243C4.41534 8.54417 4.1932 9.08046 3.8157 9.24282C2.74778 9.70213 2 10.7637 2 12C2 13.2363 2.74777 14.2979 3.81569 14.7572C4.19318 14.9195 4.41531 15.4558 4.26319 15.8375C3.83284 16.9175 4.05474 18.1969 4.92891 19.0711C5.80308 19.9452 7.08251 20.1671 8.16243 19.7368C8.54416 19.5847 9.08046 19.8068 9.24282 20.1843C9.70213 21.2522 10.7637 22 12 22Z"/> </svg>
const tarTokenIcon = <svg></svg>;
const defaultTokenIcon = <svg></svg>;

export const PairList = (props) => {
  if (props.pairList) {
    return (
      <div>
        {props.pairList.map(item =>
          <PairItem pairInfo={item} />
        )}
      </div>
    );
  }
  return (<></>);
};

const PairItem = (props) => {
  function renderDesc() {
    const desc = props.pairInfo.description ? props.pairInfo.description : 'N/A';
    let abbrDesc = desc;
    if (desc.length >= 40) {
      const firstWords = desc.substring(0,29);
      const lastWords = desc.substring(desc.length-9);
      abbrDesc = `${firstWords}..${lastWords}`;
    }
    return abbrDesc;
  }

  function renderPrice() {
    if (props.pairInfo.price === undefined) {
      return 'N/A';
    }
    return calculatePriceWithDecimals(props.pairInfo.price, props.pairInfo.decimals);
  }

  if (props.pairInfo) {
    return (
      <div className="item">
        <div className="layout">
          <div>
            <div className="itemRow"> 
              <Link to={`/pair/${props.pairInfo.pairId}`} className="pairId">
                # {props.pairInfo.pairId} &nbsp;&nbsp; 
                {props.pairInfo.trusted ? verifiedIcon : ''}
              </Link>
            </div>
            <div className="itemRow"> 
              Pair: {props.pairInfo.pstTicker} / {props.pairInfo.dmntTicker} 
            </div>
            <div className="itemRow"> 
              Price: {renderPrice()} 
            </div>
            <div className="itemRow"> 
              Description: {renderDesc()} 
            </div>
          </div>
        </div>
      </div>
    );
  }
}