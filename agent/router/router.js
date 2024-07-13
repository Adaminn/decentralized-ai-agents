const { ethers } = require('ethers');
const { HfInference } = require('@huggingface/inference');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const HF_API_TOKEN = process.env.HF_API_TOKEN;
const PINATA_JWT = process.env.PINATA_JWT;
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
console.log(HF_API_TOKEN)

const abi = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"prompt","type":"string"},{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"taskId","type":"uint256"}],"name":"agentQueried","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"output","type":"string"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"callbackId","type":"uint256"}],"name":"agentResponded","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"agentMetadata","outputs":[{"internalType":"string","name":"metadata","type":"string"},{"internalType":"bool","name":"isRouter","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAllAgentData","outputs":[{"internalType":"address[]","name":"","type":"address[]"},{"components":[{"internalType":"string","name":"metadata","type":"string"},{"internalType":"bool","name":"isRouter","type":"bool"}],"internalType":"struct Marketplace.Agent[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"prompt","type":"string"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"callbackId","type":"uint256"}],"name":"queryAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"metadata","type":"string"},{"internalType":"bool","name":"isRouter","type":"bool"}],"name":"registerAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"output","type":"string"},{"internalType":"uint256","name":"taskId","type":"uint256"}],"name":"respond","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"tasks","outputs":[{"internalType":"string","name":"prompt","type":"string"},{"internalType":"address","name":"to","type":"address"},{"internalType":"address","name":"from","type":"address"},{"internalType":"uint256","name":"callbackId","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"metadata","type":"string"},{"internalType":"bool","name":"isRouter","type":"bool"}],"name":"updateAgent","outputs":[],"stateMutability":"nonpayable","type":"function"}];

const contractAddress = "0xA4e631D4008c51A026628AB5EA7A0dCdFA89F5b4";
const providerUrl = "https://sepolia.infura.io/v3/77065ab8cf2247e6aa92c57f31efdcfd";
const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const contract = new ethers.Contract(contractAddress, abi, provider);
const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

console.log("Listening for query events...");


async function main() {

    // fetch all the registerd models and their descrition in the contract
    const addressesAndagents = await contract.getAllAgentData();
    const [addressesAll, agentsAll] = addressesAndagents;
    console.log("All agents: ", addressesAll);

    const otherAgents = addressesAndagents.filter(([address, agentData]) => address !== wallet.address);

    const [addresses, agents] = otherAgents;

    console.log("Other agents: ", addresses);
    // this will do console log all items in agents[0]


    // retrive the data saved on model ipfs and sotre it into array for each ipfs in modelsIpfs array
    /*
    const models = agents.map(async (agent) => {
        const ipfs = agent.metadata;
        const res = await axios.get(`https://gateway.pinata.cloud/ipfs/${ipfs}`);
        return res.data;
    })
    */
    const models = agents.map(agent => agent.metadata);

    const modelDescriptions = models.map((model, index) => `${index + 1}. ${model.description}`).join(", "); 

    const agentAddresses = addresses.map((agent, index) => ({ [index + 1]: agent.address }));


    // save history for each query for specific task id
    const callbacksState = {};
    let lastCallbackId = 0;

    const callbackToTask = {};

    // get count of the models
    const modelCount = models.length;

    contract.on("agentQueried", async (prompt, to, taskId) => {
        if ( to !== contract.address) {
            return;
        }

        console.log("New prompt recieved:", prompt);

        const routerPrompt = "Which description out of theese best descrbes the nature of this query? The query: " + prompt + " The description with their ordinal number are: " + modelDescriptions + ". Reply just with the ordinal number. Strictly the ONE oridnal number that is avalible!. After you write this ONE number write space and after the space write the prompt you want to send to the agent.";

        try {
            const response = await runInference(routerPrompt);

            console.log("Generated text: ", response);

            // get the first number from the response
            const number = response.match(/\d+/)[0];

            // check if respone is an intager and in bounds of 1 to modelCount
            const responseInt = parseInt(number);
            if (isNaN(responseInt) || responseInt < 1 || responseInt > modelCount) {
                throw new Error("Invalid response");
            }

            const agentAddress = agentAddresses[responseInt];

            const callbackId = lastCallbackId++ ;
            const tx = await contract.queryAgent(prompt, agentAddress, callbackId);
            callbacksState[callbackId] = prompt;
            callbackToTask[callbackId] = taskId;
            await tx.wait();
            console.log("Transaction successful");

        } catch (error) {
            console.error("Error handling query event:", error);
        }
    });

    // listen to the agentResponded event
    contract.on("agentResponded", async (output, to, callbackId) => {
        if (to !== contract.address) {
            return;
        }

        console.log("Result recieved (context: " + callbackId, + "): ", output);

        const history = callbacksState[callbackId];
        const taskId = callbackToTask[callbackId];

        const routerPrompt = "User submited this query: " + history + 
        ". The answer to this query from an assitent who is expert on this field is: " + output + 
        ". Whit all this information, respond to the user query.";

        try {
            const response = await runInference(routerPrompt);

            console.log("Respond of the router after considering the help of other agent: ", response);
            const tx = await contract.respond(response, taskId);
            await tx.wait();
            console.log("Transaction successful");
        } catch (error) {
            console.error("Error handling response event:", error);
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
}

main().catch(console.error);