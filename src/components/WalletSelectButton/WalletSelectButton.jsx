import React from 'react';
import { ArweaveWebWallet } from 'arweave-wallet-connector';
import "./walletSelectButton.css";
import arconnectLogo from './arconnect-logo.svg';
import arweaveLogo from './arweave-ar-logo.svg';
import mathWalletLogo from './mathwallet-logo.png';

const webWallet = new ArweaveWebWallet({
  name: 'jARdge System',
}, 'arweave.app');

const NONE = "None";
const AR_CONNECT = "ArConnect";
const MATH_WALLET = "mathwallet";
const ARWEAVE_APP = "ArweaveApp";

export const WalletSelectButton = (props) => {
  const [showModal, setShowModal] = React.useState(false);
  const [activeWallet, setActiveWallet] = React.useState(NONE);
  const [addressText, setAddressText] = React.useState("xxxxx...xxx");

  async function onWalletSelected(walletName) {
    let address = await window.arweaveWallet.getActiveAddress();
    if (address) {
      const firstFive = address.substring(0,5);
      const lastFour = address.substring(address.length-4);
      setAddressText(`${firstFive}..${lastFour }`);
      props.setIsConnected(true);
    }
    setActiveWallet(walletName);
  }

  async function onWalletDisconnected() {
    setActiveWallet(NONE);
    props.setIsConnected(false);
  }

  return (
    <>
      <WalletButton onClick={() => setShowModal(true)} walletName={activeWallet} walletAddress={addressText} />
      {showModal && <WalletModal 
        onClose={() => setShowModal(false)} 
        onConnected={walletName => onWalletSelected(walletName)}
        onDisconnected={() => onWalletDisconnected()}
      />}
    </>
  );
};

const WalletButton = (props) => {
  switch(props.walletName) {
    case AR_CONNECT:
      return (<div className="walletButton" >
          <img src={arconnectLogo} alt="wallet icon" />
          <p>{props.walletAddress}</p>
        </div>)
    case MATH_WALLET:
      return (<div className="walletButton" >
          <img src={mathWalletLogo} alt="wallet icon" />
          <p>{props.walletAddress}</p>
        </div>)
    case ARWEAVE_APP:
      return (<div className="walletButton altFill" >
          <img src={arweaveLogo} alt="wallet icon" />
          <p>{props.walletAddress}</p>
        </div>)
    default:
      return (<div className="walletButton" onClick={props.onClick}>
          Select Wallet
        </div>)
  }
}

const WalletModal = (props) => {
  async function connectWallet(walletName) {
    switch(walletName) {
      case AR_CONNECT:
      case MATH_WALLET:
        await window.arweaveWallet.connect(['ACCESS_ADDRESS','SIGN_TRANSACTION','DISPATCH']);
        break;
      case ARWEAVE_APP:
        await webWallet.connect();
        webWallet.on('change', () => { if (!webWallet.address && props.onDisconnected) props.onDisconnected(); })
        break;
      default:
        throw new Error(`Attempted to connect unknown wallet ${walletName}`);
    }
    props.onConnected(walletName);
    props.onClose();
  }
  
  return (
  <div className="modal" >
    <div className="scrim" onClick={() => props.onClose()}/>
    <div className="container">
      <div className="popup">
        <h1 className="titleName">Connect Wallet</h1>
        <button className="closeButton" onClick={() => props.onClose()}>
          <svg width="14" height="14"><path d="M14 12.461 8.3 6.772l5.234-5.233L12.006 0 6.772 5.234 1.54 0 0 1.539l5.234 5.233L0 12.006l1.539 1.528L6.772 8.3l5.69 5.7L14 12.461z"></path></svg>
        </button>
        <div className="buttonList">
          <button className="select-button" onClick={() => connectWallet(AR_CONNECT)}>
            <p>ArConnect</p>
            <img src={arconnectLogo} alt="ArConnect icon"/>
          </button>
          <button className="select-button" onClick={() => connectWallet(MATH_WALLET)}>
            <p>MathWallet</p>
            <img src={mathWalletLogo} alt="MathWallet icon"/>
          </button>
          <button className="select-button" onClick={() => connectWallet(ARWEAVE_APP)}>
            <p>Arweave.app</p>
            <img src={arweaveLogo} alt="ArweaveApp icon"/>
          </button>
        </div>
      </div>
    </div>
  </div>
)
}