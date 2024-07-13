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
  const [popUp, setPopUp] = useState(false);
  const [contractInstance, setContractInstance] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  const abi = [
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_query",
          "type": "string"
        }
      ],
      "name": "queryGPT",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "string",
          "name": "query",
          "type": "string"
        }
      ],
      "name": "QuerySent",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_result",
          "type": "string"
        }
      ],
      "name": "resultGPT",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "string",
          "name": "result",
          "type": "string"
        }
      ],
      "name": "ResultReceived",
      "type": "event"
    }
  ];

  const contractAddress = '0xb1A0fF77d13b07A3d70ADA2687EB6802B1207fC1';

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
        const tx = await contractInstance.queryAgent(queryQuestion, selectedAgentAddress, 0);
        setIsSubmitted(true);
        setMessages(prevMessages => [...prevMessages, { text: queryQuestion, sender: 'user' }]);
        setQueryQuestion('');
        await tx.wait();
      } catch (error) {
        setErrorMessage("transaction failed.");
      }
    } else {
      setErrorMessage("wallet not connected.");
      setPopUp(true);
    }
  };

  useEffect(() => {
    if (contractInstance) {
      const handleResultReceived = (result, event) => {
        console.log("Result Received");
        setAnswer(result);
        setMessages(prevMessages => [...prevMessages, { text: result, sender: 'bot' }]);
      };

      contractInstance.on("agentResponed", handleResultReceived);

      // Clean up the event listener when the component is unmounted
      return () => {
        contractInstance.off("ResultReceived", handleResultReceived);
      };
    }
  }, [contractInstance]);

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="Title">Zarathustra Experiment ❤️</h1>

        <h1 className={`Welcome ${isSubmitted ? 'submitted' : ''}`}>Welcome, Thomas.</h1>

        <button className={`ConnectWalletButton ${walletAddress ? 'connected' : ''}`} onClick={connectWallet}>
          {walletAddress ? `${walletAddress}` : 'Connect Wallet'}
        </button>

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
