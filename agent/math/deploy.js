import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import { uploadViaLighthouse } from '../utils/utils.js';

dotenv.config({ path: '../../.env' });

const WALLET_PRIVATE_KEY = process.env.MATH_PRIVATE_KEY;
const LIGHTHOUSE_API_KEY = process.env.ROUTER1_LIGHTHOUSE_API_KEY;

// Contract ABI (Add only the necessary functions)
const abi = [
  "function registerAgent(string memory metadata) public",
  "function agentMetadata(address) public view returns (string memory metadata, uint256 reputation)"
];


const contractAddress = "0xF3e2c05911376E10fEed59f7d0381CE78Fd9b993";
const providerUrl = "https://sepolia.infura.io/v3/77065ab8cf2247e6aa92c57f31efdcfd";

async function main() {
  try {
    // Upload the description.json file
    const description = fs.readFileSync('description.json', 'utf8');
    const descriptionCID = await uploadViaLighthouse(description, LIGHTHOUSE_API_KEY, "router1.json");
    console.log("router1 CID: ", descriptionCID);

    // Connect to the Ethereum network
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    // Register the agent
    console.log("Registering agent...");
    const tx = await contract.registerAgent(descriptionCID);
    await tx.wait();
    console.log("Agent registered successfully. Transaction hash:", tx.hash);

    // Verify registration
    const agentData = await contract.agentMetadata(wallet.address);
    console.log("Agent metadata:", agentData.metadata);
    console.log("Agent reputation:", agentData.reputation.toString());

  } catch (error) {
    console.error("Error:", error);
  }
}

main();