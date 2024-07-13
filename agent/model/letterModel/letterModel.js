const { ethers } = require('ethers');
const { HfInference } = require('@huggingface/inference');
const axios = require('axios');
const FormData = require('form-data');

const HF_API_TOKEN = process.env.HF_API_TOKEN;
const PINATA_JWT = process.env.PINATA_JWT;
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;

const abi = [
    [
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "string",
              "name": "prompt",
              "type": "string"
            },
            {
              "indexed": false,
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "taskId",
              "type": "uint256"
            }
          ],
          "name": "agentQueried",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "string",
              "name": "output",
              "type": "string"
            },
            {
              "indexed": false,
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "callbackId",
              "type": "uint256"
            }
          ],
          "name": "agentResponed",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "prompt",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "callbackId",
              "type": "uint256"
            }
          ],
          "name": "queryAgent",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "metadata",
              "type": "string"
            },
            {
              "internalType": "bool",
              "name": "isRouter",
              "type": "bool"
            }
          ],
          "name": "registerAgent",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "output",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "taskId",
              "type": "uint256"
            }
          ],
          "name": "respond",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "metadata",
              "type": "string"
            },
            {
              "internalType": "bool",
              "name": "isRouter",
              "type": "bool"
            }
          ],
          "name": "updateAgent",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "name": "agentMetadata",
          "outputs": [
            {
              "internalType": "string",
              "name": "metadata",
              "type": "string"
            },
            {
              "internalType": "bool",
              "name": "isRouter",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "name": "tasks",
          "outputs": [
            {
              "internalType": "string",
              "name": "prompt",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "from",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "callbackId",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ]
];

const contractAddress = "0xA4e631D4008c51A026628AB5EA7A0dCdFA89F5b4";
const providerUrl = "https://sepolia.infura.io/v3/77065ab8cf2247e6aa92c57f31efdcfd";
const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const contract = new ethers.Contract(contractAddress, abi, provider);

console.log("Listening for query events...");

contract.on("agentQueried", async (prompt, to, taskId) => {
  if ( to !== contract.address) {
      console.log("Found an event, but not for me:(");
      return;
  }

  console.log("New prompt recieved: ", prompt);

  const routerPrompt = "Split this word into different letters using spaces as a seperator: " + prompt;

  try {
      const response = await runInference(routerPrompt);

      console.log("Generated text: ", response);

      //const ipfsUrl = await uploadToPinata(response);

      const tx = await contract.respond(response, taskId);
      await tx.wait();
      console.log("Transaction successful");

  } catch (error) {
      console.error("Error handling query event:", error);
  }
});

async function runInference(prompt) {
    const hf = new HfInference(HF_API_TOKEN); 
    
    const model = 'microsoft/Phi-3-mini-4k-instruct';
  
    try {
      const result = await hf.textGeneration({
        model,
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          do_sample: true,
        },
      });
  
      console.log('Generated text:', result.generated_text);
      return result.generated_text;
    } catch (error) {
        console.error('Error during inference:', error);
        return 'Inference error';
    }
}

async function uploadToPinata(text) {
    const formData = new FormData();
    formData.append('file', Buffer.from(text, 'utf-8'), { filename: 'result.txt' });

    const pinataMetadata = JSON.stringify({
        name: 'AI Result',
    });
    formData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({
        cidVersion: 0,
    });
    formData.append('pinataOptions', pinataOptions);

    try {
        const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
            maxBodyLength: "Infinity",
            headers: {
                'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                'Authorization': `Bearer ${PINATA_JWT}`
            }
        });
        return `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
    } catch (error) {
        console.error('Error uploading to Pinata:', error);
        throw new Error('Failed to upload to Pinata');
    }
}