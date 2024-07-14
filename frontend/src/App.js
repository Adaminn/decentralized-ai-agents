import React, { useState, useEffect, useRef } from 'react';
import './App.css';
const { ethers } = require('ethers');

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [signer, setSigner] = useState(null);
  const [contractInstance, setContractInstance] = useState(null);
  const [queryQuestion, setQueryQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [agentData, setAgentData] = useState([]);
  const [popUp, setPopUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const messageContainerRef = useRef(null);

  const abi = [
    // Your ABI definition here
  ];

  const contractAddress = '0xA4e631D4008c51A026628AB5EA7A0dCdFA89F5b4';

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = provider.getSigner();
        setProvider(provider);
        setSigner(signer);
        setContractInstance(new ethers.Contract(contractAddress, abi, signer));
        const address = await signer.getAddress();
        setWalletAddress(address);
      } catch (error) {
        console.error('User denied account access or an error occurred:', error);
      }
    } else {
      alert('Please install a Web3 wallet like MetaMask or Rainbow Wallet');
    }
  };

  const handleQuerySubmission = async () => {
    if (signer) {
      try {
        const tx = await contractInstance.queryAgent(queryQuestion, '0xc92915e144Fc8aEf1F4acDC5ABa6C3206F23d336', 0);
        setIsSubmitted(true);
        setMessages(prevMessages => [...prevMessages, { text: queryQuestion, sender: 'user' }]);
        setQueryQuestion('');
        await tx.wait();
      } catch (error) {
        setErrorMessage('Transaction failed.');
        setPopUp(true);
      }
    } else {
      setErrorMessage('Wallet not connected.');
      setPopUp(true);
    }
  };

  const fetchAgentData = async () => {
    if (contractInstance) {
      try {
        const [addresses, agents] = await contractInstance.getAllAgentData();
        const agentData = addresses.map((address, index) => {
          const parsedMetadata = parseMetadata(agents[index].metadata);
          return {
            address,
            metadata: parsedMetadata,
            isRouter: agents[index].isRouter
          };
        });
        setAgentData(agentData);
      } catch (error) {
        console.error('Failed to fetch agent data:', error);
      }
    }
  };

  const parseMetadata = (metadataString) => {
    try {
      return JSON.parse(metadataString);
    } catch (error) {
      console.error('Failed to parse metadata:', error);
      return { description: 'Invalid metadata' };
    }
  };

  useEffect(() => {
    if (contractInstance) {
      const handleResultReceived = (output, from, to, callbackId) => {
        if (to === walletAddress) {
          setMessages(prevMessages => [...prevMessages, { text: output, sender: 'bot' }]);
        }
      };

      contractInstance.on('agentResponded', handleResultReceived);

      return () => {
        contractInstance.off('agentResponded', handleResultReceived);
      };
    }

    if (popUp) {
      const timer = setTimeout(() => {
        setPopUp(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [contractInstance, popUp, walletAddress]);

  const handleOpenMarketplace = () => {
    if (signer) {
      setIsDropdownOpen(!isDropdownOpen);
      fetchAgentData();
    } else {
      setErrorMessage('Please connect wallet.');
      setPopUp(true);
    }
  };

  useEffect(() => {
    // Scroll to bottom of message container when new message is added
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="App">
      <header className="App-header">
        <h1 className={`Welcome ${isSubmitted ? 'submitted' : ''}`}>Welcome to Zarathustra.</h1>
        <h3 className={`subtitle ${isSubmitted ? 'submitted' : ''}`}>The world's first distributed AI.</h3>
        <button className={`ConnectWalletButton ${walletAddress ? 'connected' : ''}`} onClick={connectWallet}>
          {walletAddress ? `${walletAddress}` : 'Connect Wallet'}
        </button>

        <div className={`openMarketplaceContainer ${isSubmitted ? 'submitted' : ''}`}>
          <button className={`openMarketplaceButton ${isSubmitted ? 'submitted' : ''}`} onClick={handleOpenMarketplace}>Marketplace</button>
          {isDropdownOpen && (
            <ul className={`dropdown-menu ${isDropdownOpen ? 'submitted' : ''} ${isSubmitted ? 'submitted-menu' : ''}`}>
              {agentData.map((agent, index) => (
                <li key={index} className="dropdown-item">
                  <div className="routerName">{agent.metadata?.name || 'Unnamed Agent'}</div>
                  <div className="routerDescription">{agent.metadata?.description?.expertise || 'No description'}</div>
                  <div className="routerPrice">4 Eth</div>
                  <div className="routerReputation">
                    {Array(agent.metadata?.reputation || 0).fill().map((_, i) => (
                      <div key={i} className={`point${i + 1}`}></div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button className={`SubmitButton ${isSubmitted ? 'submitted' : ''}`} onClick={handleQuerySubmission}>Submit</button>

        <input
          className={`inputField ${isSubmitted ? 'submitted' : ''}`}
          type="text"
          value={queryQuestion}
          onChange={(e) => setQueryQuestion(e.target.value)}
        />

        <div className={`Popup ${popUp ? 'submitted' : ''}`}>
          <h3 className="errorMessage">Error, {errorMessage}</h3>
        </div>

        <div ref={messageContainerRef} className={`message-container ${isSubmitted ? 'submitted' : ''}`}>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'answer-message'}`}
            >
              {msg.text}
            </div>
          ))}
        </div>
      </header>
    </div>
  );
}

export default App;
