import React, { useState, useEffect } from 'react';
import './App.css';
const { ethers } = require('ethers');

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedAgentAddress, setSelectedAgentAddress] = useState('');
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [queryQuestion, setQueryQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [agentData, setAgentData] = useState([]);
  const [popUp, setPopUp] = useState(false);
  const [contractInstance, setContractInstance] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const abi = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"prompt","type":"string"},{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"taskId","type":"uint256"}],"name":"agentQueried","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"output","type":"string"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"callbackId","type":"uint256"}],"name":"agentResponded","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"agentMetadata","outputs":[{"internalType":"string","name":"metadata","type":"string"},{"internalType":"bool","name":"isRouter","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAllAgentData","outputs":[{"internalType":"address[]","name":"","type":"address[]"},{"components":[{"internalType":"string","name":"metadata","type":"string"},{"internalType":"bool","name":"isRouter","type":"bool"}],"internalType":"struct Marketplace.Agent[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"prompt","type":"string"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"callbackId","type":"uint256"}],"name":"queryAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"metadata","type":"string"},{"internalType":"bool","name":"isRouter","type":"bool"}],"name":"registerAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"output","type":"string"},{"internalType":"uint256","name":"taskId","type":"uint256"}],"name":"respond","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"tasks","outputs":[{"internalType":"string","name":"prompt","type":"string"},{"internalType":"address","name":"to","type":"address"},{"internalType":"address","name":"from","type":"address"},{"internalType":"uint256","name":"callbackId","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"metadata","type":"string"},{"internalType":"bool","name":"isRouter","type":"bool"}],"name":"updateAgent","outputs":[],"stateMutability":"nonpayable","type":"function"}];

  const contractAddress = '0xA4e631D4008c51A026628AB5EA7A0dCdFA89F5b4';

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);
        const signer = await provider.getSigner();
        setSigner(signer);
        setContractInstance(new ethers.Contract(contractAddress, abi, signer));
        const address = await signer.getAddress();
        setWalletAddress(address);
      } catch (error) {
        console.error("User denied account access or an error occurred:", error);
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
        setErrorMessage("transaction failed.");
        setPopUp(true);
      }
    } else {
      setErrorMessage("wallet not connected.");
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
        console.log(agentData);
      } catch (error) {
        console.error("Failed to fetch agent data:", error);
      }
    }
  };
  
  const parseMetadata = (metadataString) => {
    try {
      // Check if metadataString is in JSON format
      if (metadataString.startsWith('{') && metadataString.endsWith('}')) {
        return JSON.parse(metadataString);
      }

    } catch (error) {
      console.error("Failed to parse metadata:", error);
      return { description: "Invalid metadata" };
    }
  };
  

  useEffect(() => {
    if (contractInstance) {
      const handleResultReceived = (output, from, to, callbackId) => {
        console.log("Result Received");
        if(to === walletAddress) {
          setAnswer(output);
          setMessages(prevMessages => [...prevMessages, { text: output, sender: 'bot' }]);
        }
      };

      contractInstance.on("agentResponded", handleResultReceived);

      return () => {
        contractInstance.off("agentResponded", handleResultReceived);
      };
    }

    if (popUp) {
      const timer = setTimeout(() => {
        setPopUp(false);
      }, 7000); 
      return () => clearTimeout(timer);
    }

  }, [contractInstance, popUp]);

  const handleOpenMarketplace = () => {
    if(signer) {
    setIsDropdownOpen(!isDropdownOpen);
    fetchAgentData();
    } else{
      setErrorMessage("please connect wallet.");
      setPopUp(true);
    }
  };

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

        <div className={`message-container ${isSubmitted ? 'submitted' : ''}`}>
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
