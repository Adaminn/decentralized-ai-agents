const { ethers } = require('ethers');
const { HfInference } = require('@huggingface/inference');
const axios = require('axios');
const FormData = require('form-data');

const HF_API_TOKEN = process.env.HF_API_TOKEN;
const PINATA_JWT = process.env.PINATA_JWT;
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;

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

const contractAddress = "0xDee55f108c99C16e29757c2F7b5dc30934108888";
const providerUrl = "https://sepolia.infura.io/v3/77065ab8cf2247e6aa92c57f31efdcfd";
const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const contract = new ethers.Contract(contractAddress, abi, provider);

console.log("Listening for query events...");

let gptAnswer = "GPT Answer";

const handleResultSubmission = async () => {
    try {
        const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
        const signingContract = new ethers.Contract(contractAddress, abi, wallet);
        const tx = await signingContract.resultGPT(gptAnswer);
        await tx.wait();
        console.log("Transaction successful");
    } catch (error) {
        console.error("Error submitting answer", error);
    }
};

contract.on("QuerySent", async (prompt, event) => {
    console.log("New query received:");
    console.log("prompt:", prompt);

    try {
        const generatedText = await runInference(prompt);
        console.log("Generated text:", generatedText);

        gptAnswer = await uploadToPinata(generatedText);
        console.log("Pinata Link:", gptAnswer);

        await handleResultSubmission();
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