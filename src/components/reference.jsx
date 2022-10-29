import React from "react";
import { connectWallet, deployPst, getWalletAddress } from "../lib/api";
import { Selector } from "./Selector/Selector";
import { SubmitButton } from "./SubmitButton/SubmitButton";
import { TextInput } from "./TextInput/TextInput";
import { WalletSelectButton } from "./WalletSelectButton/WalletSelectButton";

export const Mint = (props) => {
  const [walletConnected, setWalletConnected] = React.useState(false);

  const [tokenName, setTokenName] = React.useState("");
  const [ticker, setTicker] = React.useState("");
  const [maxSupply, setMaxSupply] = React.useState("");
  const [type, setType] = React.useState("");
  const [initSupply, setInitSupply] = React.useState("");
  const [donate, setDonate] = React.useState("0.1");
  const [disabled, setDisabled] = React.useState(true);
  const [mintPrice, setMintPrice] = React.useState("");

  React.useEffect(async () => {
    if (walletConnected) {
      connectWallet('use_wallet');
    }
  }, [walletConnected]);

  React.useEffect(async () => {
    if (tokenName !== '' && ticker !== '' && maxSupply !== '' &&
        type !== '' && donate !== '') {
      if (type === 'fixed_supply') {
        setDisabled(false);
        return;
      }
      if (type === 'mintable') {
        if (mintPrice !== '' && initSupply !== '') {
          setDisabled(false);
          return;
        }
      }
    } else {
      setDisabled(true);
    }
  }, [tokenName, ticker, maxSupply, type, initSupply, donate, mintPrice]);

  async function onSubmit() {
    const walletAddr = getWalletAddress();
    var initialState;
    if (type === 'fixed_supply') {
      initialState = {
        type: type,
        maxSupply: parseInt(maxSupply),
        ticker: ticker,
        name: tokenName,
        owner: walletAddr,
        balances: {}
      };
      initialState.balances[walletAddr] = initialState.maxSupply;
    } else {
      initialState = {
        type: type,
        maxSupply: parseInt(maxSupply),
        ticker: ticker,
        name: tokenName,
        owner: walletAddr,
        mintPrice: Number(mintPrice),
        mintable: parseInt(maxSupply) - parseInt(initSupply),
        balances: {}
      };
      initialState.balances[walletAddr] = parseInt(initSupply);
    }
    return await deployPst(initialState, donate);
  }

  return (
    <>
      <div className='textBlock'>
        <div className='textMidiumKey'>Create your Profit Sharing Token(PST) on Arweave</div>
      </div>
      <div className='textBlock'>
        <div className='textSmallValue'>Easily deploy standard & different type of Profit Sharing Token(PST) on Arweave chain with several clicks.</div>
        <div className='textSmallValue'>No coding skills are required.</div>
        <div className='textSmallValue'>After deployed, you can find your PST infos and make transactions <a href='https://arweave.net/s7ksIBcS3fPMuKcoQEGNg0R-QyDmx5sZria00t9ydDw'><b>HERE</b></a>.</div>
      </div>
      <TextInput 
        title='Token name:'
        tip='Choose a name for your token.'
        onChange={setTokenName}
        placeholder='e.g. MARS Coin'
      />
      <TextInput 
        title='Ticker:'
        tip='Choose a symbol for your token (usually 2-5 chars).'
        onChange={setTicker}
        placeholder='e.g. MARS'
      />
      <TextInput 
        title='Max supply:'
        tip='Maximum number of tokens available.'
        onChange={setMaxSupply}
        placeholder='e.g. 66000000'
      />
      <Selector 
        title='Type:'
        tip='Select for Fixed-supply token or Mintable token.'
        options={[{value: 'fixed_supply', label: 'Fixed-supply'}, {value: 'mintable', label: 'Mintable'}]}
        onChange={setType}
      />
      { type === 'mintable' &&
        <>
          <TextInput 
            title='Initial supply:'
            tip='Initial number of tokens available. Will send to your wallet.'
            onChange={setInitSupply}
            placeholder='e.g. 55000000'
          />
          <TextInput 
            title='Mint price($AR):'
            tip='When tokens are minted, fee in $AR will send to your wallet.'
            onChange={setMintPrice}
            placeholder='e.g. 0.01'
          />
        </>
      }
      <TextInput 
        title='Donate($AR):'
        tip='Donation will be transferred to $WMINT holders. Donation will support WeaveMint to keep it constantly updated.'
        onChange={setDonate}
        placeholder='e.g. 0.1'
        default='0.1'
      />
      { !walletConnected &&
        <div className='centerButton'>
          <WalletSelectButton 
          setIsConnected={setWalletConnected}
          />
        </div>
      }
      { walletConnected &&
        <SubmitButton 
          buttonText='Mint'
          submitTask={onSubmit}
          buttonSize='Large'
          disabled={disabled}
        />
      }
    </>
  );
}