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

const contractAddress = "TOOD: registerd ai agents contract address";
const providerUrl = "https://sepolia.infura.io/v3/77065ab8cf2247e6aa92c57f31efdcfd";
const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const contract = new ethers.Contract(contractAddress, abi, provider);

console.log("Listening for query events...");



// fetch all the registerd models and their descrition in the contract
const modelsIpfs = contract.getModelsIpfs();

// retrive the data saved on model ipfs and sotre it into array for each ipfs in modelsIpfs array
const models = modelsIpfs.map(async (ipfs) => {
    const res = await axios.get(`https://gateway.pinata.cloud/ipfs/${ipfs}`);
    return res.data;
})

// model is a json that has a description, price, and an address where you can prompt it

const modelDescriptions = models.map((model, index) => `${index + 1}. ${model.description}`).join(", "); 

// model addresses with their ordinal number
const modelAdresses = models.map((model, index) => `${index + 1}. ${model.address}`).join(", ");

// get count of the models
const modelCount = models.length;

contract.on("agentQueried", async (prompt, to, taskId) => {
    if ( to !== contract.address) {
        return;
    }

    console.log("New prompt recieved:", prompt);

    const routerPrompt = "Which description out of theese best descrbes the nature of this query? The query: " + prompt + " The description with their ordinal number are: " + modelDescriptions + ". Reply just with the ordinal number. Nothing else! Strictly just the ONE number!"

    try {
        const response = await runInference(routerPrompt);

        console.log("Generated text:", response);

        // get the first number from the response
        const number = response.match(/\d+/)[0];

        // check if respone is an intager and in bounds of 1 to modelCount
        const responseInt = parseInt(number);
        if (isNaN(responseInt) || responseInt < 1 || responseInt > modelCount) {
            throw new Error("Invalid response");
        }

        const agentEndpoint = models[responseInt - 1].endpoint;

        // send the prompt to the agent specified by agentEndpoint. Callback will be added in the SC
        const tx = await contract.queryIntelligence(prompt, agentEndpoint);
        await tx.wait();
        console.log("Transaction successful");

    } catch (error) {
        console.error("Error handling query event:", error);
    }
});

const handleResultSubmission = async (output) => {
    try {
        const tx = await contract.resultGPT(output);
        await tx.wait();
        console.log("Transaction successful");
    } catch (error) {
        console.error("Error submitting answer", error);
    }
};

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