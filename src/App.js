import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { 
  connectContract, 
  connectWallet,
} from './lib/api';
import 'rsuite/dist/rsuite.css';
import './App.css';
import { Home } from './components/Home';
import { AddPair } from './components/AddPair';
import { My } from './components/My';
import { PairDetail } from './components/PairDetail';

connectContract();

const App = () => {
  const [isWalletConnected, setIsWalletConnected] = React.useState(false);

  React.useEffect(async () => {
    if (isWalletConnected) {
      await connectWallet('use_wallet');
    }
  }, [isWalletConnected]);

  return (
    <div id="app">
      <div id="content">
        <Navigation setIsWalletConnected={setIsWalletConnected}/>
        <main>
          <Routes>
            <Route path="/" name="" element={<HomeFrame />} />
            <Route path="/addPair" element={<AddPairFrame />} />
            <Route path="/about" element={<AboutFrame />} />
            <Route path="/my" element={<MyFrame walletConnect={isWalletConnected}/>} />
            <Route path="/pair/:pairId" element={<PairDetailFrame />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const HomeFrame = (props) => {
  return (
    <>
      <Home />
    </>
  );
};

const AddPairFrame = (props) => {
  return (
    <>
      <AddPair />
    </>
  );
};

const MyFrame = (props) => {
  return (
    <>
      <My walletConnect={props.walletConnect}/>
    </>
  );
};

const AboutFrame = () => {
  return (
    <>
      <p>about</p>
    </>
  );
};

const PairDetailFrame = () => {
  return (
    <>
      <PairDetail />
    </>
  );
};

export default App;