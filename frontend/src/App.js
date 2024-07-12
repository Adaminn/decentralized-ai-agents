import React, { useState, useEffect } from 'react';
import './App.css';
const { ethers } = require('ethers');

function App() {

  const [walletAddress, setWalletAddress] = useState('');
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [popUp, setPopUp] = useState(null);
  const [queryQuestion, setQueryQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [contractInstance, setContractInstance] = useState(null);

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

  const ethers = require("ethers");

  const contractAddress = '0xDee55f108c99C16e29757c2F7b5dc30934108888';
  
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

  const submitQuery = async () => {
    setPopUp(true);
  };

  const handleQuerySubmission = async () => {
    if (signer) {
      try {
        const tx = await contractInstance.queryGPT(queryQuestion);
        setPopUp(false);
        await tx.wait();
      } catch (error) {
        console.error("Error submitting query", error);
      }
    }
  };

  useEffect(() => {
    if (contractInstance) {

      const handleResultReceived = (result, event) => {
        console.log("Result Received");
        setAnswer(result);
      };

      contractInstance.on("ResultReceived", handleResultReceived);
    }
  }, [contractInstance]);

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="Title">Zarathustra Experiment ❤️</h1>
  
        <button className={`ConnectWalletButton ${walletAddress ? 'connected' : ''}`} onClick={connectWallet}>
          {walletAddress ? `${walletAddress}` : 'Connect Wallet'}
        </button>

        {popUp && (
          <div className="Popup">
            <h3>Enter GPT Question</h3>
            <input
              className="inputField"
              type="text"
              value={queryQuestion}
              onChange={(e) => setQueryQuestion(e.target.value)}
            />
            <button className="SubmitButton" onClick={handleQuerySubmission}>Submit</button>
            <button className="CancelButton" onClick={() => setPopUp(false)}>Cancel</button>
          </div>
        )}

        <h1 className="answer">Answer: {answer}</h1>
  
        <button className="NewModel" onClick={submitQuery}>Submit New Query</button>

      </header>
    </div>
  );
}

export default App;