import { ethers } from 'ethers';
import { HfInference } from '@huggingface/inference';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
import { runInference } from '../utils/utils.js';
import { promises as fs } from 'fs';
import fetch from 'node-fetch';


dotenv.config({ path: '../../.env' });

const HF_API_TOKEN = process.env.HF_API_TOKEN;
const PINATA_JWT = process.env.PINATA_JWT;
const WALLET_PRIVATE_KEY = process.env.ROUTER1_PRIVATE_KEY;
const LIGHTHOUSE_API_KEY = process.env.ROUTER1_LIGHTHOUSE_API_KEY;

console.log(HF_API_TOKEN)

const abi = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"AddressEmptyCode","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"AddressInsufficientBalance","type":"error"},{"inputs":[],"name":"FailedInnerCall","type":"error"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"SafeERC20FailedOperation","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"prompt","type":"string"},{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"taskId","type":"uint256"}],"name":"agentQueried","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"output","type":"string"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"callbackId","type":"uint256"}],"name":"agentResponded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"tokensDeposited","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"tokensWithdrawn","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"agentMetadata","outputs":[{"internalType":"string","name":"metadata","type":"string"},{"internalType":"uint256","name":"reputation","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"depositTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"agentAddress","type":"address"},{"internalType":"address","name":"token","type":"address"}],"name":"getAgentPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAllAgentData","outputs":[{"internalType":"address[]","name":"","type":"address[]"},{"components":[{"internalType":"string","name":"metadata","type":"string"},{"components":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"internalType":"struct Marketplace.Price[]","name":"prices","type":"tuple[]"},{"internalType":"uint256","name":"reputation","type":"uint256"}],"internalType":"struct Marketplace.Agent[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"prompt","type":"string"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"callbackId","type":"uint256"},{"internalType":"address","name":"token","type":"address"}],"name":"queryAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"metadata","type":"string"}],"name":"registerAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"output","type":"string"},{"internalType":"uint256","name":"taskId","type":"uint256"}],"name":"respond","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"price","type":"uint256"}],"name":"setAgentPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"tasks","outputs":[{"internalType":"string","name":"prompt","type":"string"},{"internalType":"address","name":"to","type":"address"},{"internalType":"address","name":"from","type":"address"},{"internalType":"uint256","name":"callbackId","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"metadata","type":"string"}],"name":"updateAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"userBalances","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdrawTokens","outputs":[],"stateMutability":"nonpayable","type":"function"}];

const contractAddress = "0xF3e2c05911376E10fEed59f7d0381CE78Fd9b993";
const providerUrl = "https://sepolia.infura.io/v3/77065ab8cf2247e6aa92c57f31efdcfd";
const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const contract = new ethers.Contract(contractAddress, abi, provider);
const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
const contractWithSigner = new ethers.Contract(contractAddress, abi, wallet);

async function downloadFile(cid, outputPath) {
    try {
        const response = await fetch(`https://gateway.lighthouse.storage/ipfs/${cid}`);
        if (!response.ok) {
            throw new Error(`Network response was not ok for CID: ${cid}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(outputPath, buffer);
        console.log(`File saved to ${outputPath}`);
    } catch (error) {
        console.error(`Failed to save the file for CID: ${cid}`, error);
    }
}

async function readJsonFiles(paths) {
    const jsonObjects = await Promise.all(paths.map(async (filePath) => {
        console.log(`Reading file at path: ${filePath}`);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent);
    }));
    return jsonObjects;
}

async function main() {

    // fetch all the registerd models and their descrition in the contract
    const addressesAndagents = await contract.getAllAgentData();
    const [addressesAll, agentsAll] = addressesAndagents;

    console.log("All agents: ", addressesAll);
    console.log("All agents: ", agentsAll);
    
    // Combine addresses and agents into a single array of tuples
    const combinedAgents = addressesAll.map((address, index) => [address, agentsAll[index]]);
    
    // Filter out the wallet address
    const otherAgents = combinedAgents.filter(([address, agentData]) => address !== wallet.address);
    

    const addresses = otherAgents.map(([address, agentData]) => address);
    const agents = otherAgents.map(([address, agentData]) => agentData);

    console.log("Other agents: ", addresses);
    console.log("Other agents: ", agents);
    // this will do console log all items in agents[0]

    const CIDs = agents.map(agent => agent.metadata);

    // Download all JSON files
    const downloadPromises = CIDs.map(async (cid, index) => {
        const filePath = `./model${index}.json`;
        await downloadFile(cid, filePath);
        return filePath;
    });

    console.log("Starting downloads...");
    const paths = await Promise.all(downloadPromises);

    console.log("Downloads completed.");
    // Check if files exist
    for (const filePath of paths) {
        try {
            await fs.access(filePath);
            console.log(`File exists: ${filePath}`);
        } catch (error) {
            console.error(`File not found: ${filePath}`);
            throw error; // Re-throw the error to stop execution
        }
    }

    // Read the JSON files and store the whole JSON objects
    const jsonObjects = await readJsonFiles(paths);

    console.log('JSON Objects:', jsonObjects);

    // Extract descriptions
    const descriptions = jsonObjects.map(jsonData => jsonData.description);

    console.log('Descriptions:', descriptions);



    const modelDescriptionsText = descriptions.map((description, index) => `${index + 1}. ${description}`).join(", "); 
    console.log("Model descriptions in text with ordinals: ", modelDescriptionsText);

    const modelDescriptions = descriptions.map((description, index) => ({ [index + 1]: description }));
    console.log("Model descriptions with ordinals: ", modelDescriptions);

    const agentAddresses = addresses.reduce((acc, address, index) => {
        acc[index + 1] = address;
        return acc;
    }, {});
    console.log("Addressess with ordinals: ", agentAddresses);

    // save history for each query for specific task id
    const callbacksState = {};
    let lastCallbackId = 0;

    const callbackToTask = {};

    // get count of the models
    const modelCount = CIDs.length;

    console.log("Listening for query events...");

    contract.on("agentQueried", async (prompt, to, taskId) => {
        if ( to !== wallet.address) {
            return;
        }

        console.log("New prompt recieved:", prompt);

        const systemPrompt = "You MUST responed with number. The number MUST be in range from 1 to " + modelCount + ". The number represents the description of the agent that best suits the query.";

        const routerPromptToGetId = "Which description out of theese best descrbes the nature of this query? The query: " + prompt + 
        "\nThe description with their ordinal number are: " + modelDescriptionsText + 
        "\n Your answer MUST be just one number in range from 1 to " + modelCount + ". "+
        "\n\n The ordinal number of the description that best suits this task is: "

        try {
            const response = await runInference(routerPromptToGetId, 3);

            console.log("Generated text: ", response);

            // get the first number from the response
            const number = response.match(/\d+/)[0];
            console.log("The selecte4d ordinal: ", number);

            // check if respone is an intager and in bounds of 1 to modelCount
            const responseInt = parseInt(number);
            if (isNaN(responseInt) || responseInt < 1 || responseInt > modelCount) {
                throw new Error("Invalid response");
            }
            const pickedDescription = modelDescriptions[responseInt];
            const agentAddress = agentAddresses[responseInt];

            // TODO: uncomment this line
            const routerPromptToGenerateQuery = `This is the user's query: ${prompt}
            You are using another agent with this description: ${JSON.stringify(pickedDescription)}
            IMPORTANT: Carefully read the agent's description, especially the 'description' field of 'input' field. You must generate input that strictly adheres to the specified format and requirements.
            Your task is to convert the user's query into a valid input for this specific agent.
            Generate ONLY the input for the agent, exactly as specified in the description. DO NOT INCLUDE ANY ADDITIONAL TEXT! Look at the provided example before answering and provide query in the same style as the examples (e.g. 123 * 346).`;
            
            console.log("Router prompt to generate query: ", routerPromptToGenerateQuery);
            const assistantPrompt = await runInference(routerPromptToGenerateQuery, 100, "You don't answer the user's query by yourself. You generate input for the specified agent based on their description. Look at the provided example before answering and provide query in the same style as the examples (e.g. 123 + 346).");
            const callbackId = lastCallbackId++;
            console.log("assistantPrompt: ", assistantPrompt)
            console.log("agentAddress: ", agentAddress)
            console.log("callbackId: ", callbackId)
            const tx = await contractWithSigner.queryAgent(assistantPrompt, agentAddress, callbackId, '0xF3e2c05911376E10fEed59f7d0381CE78Fd9b993');
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
        if (to !== wallet.address) {
            console.log("Someone responded, but not to me")
            return;
        }

        console.log("Result recieved (context: " + callbackId, + "): ", output);

        const history = callbacksState[callbackId];
        const taskId = callbackToTask[callbackId];

        const routerPrompt = "User submited this query: " + history + 
        ". The answer to this query from an assitent who is expert on this field is: " + output + 
        ". With all this information, I can now reposnd to the users query.";

        try {
            // TODO: uncomment this line
            const response = await runInference(routerPrompt, 80, "You answer the user's query based on the information provided by other agents. Provide a clear and concise answer to the user's query. However, don't mention the fact that other agents were used to generate the answer.");
            //const response = output;
            console.log("Respond of the router after considering the help of other agent: ", response);
            const tx = await contractWithSigner.respond(response, taskId);
            await tx.wait();
            console.log("Final transaction successful");
        } catch (error) {
            console.error("Error handling response event:", error);
        }
    });
}

main().catch(console.error);