import { ethers } from 'ethers';
import { HfInference } from '@huggingface/inference';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
import { runInference, uploadViaLighthouse } from '../utils/utils.js';

dotenv.config();


const HF_API_TOKEN = process.env.HF_API_TOKEN;
const PINATA_JWT = process.env.PINATA_JWT;
const WALLET_PRIVATE_KEY = process.env.LETTER_PRIVATE_KEY;

const abi = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"prompt","type":"string"},{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"taskId","type":"uint256"}],"name":"agentQueried","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"output","type":"string"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"callbackId","type":"uint256"}],"name":"agentResponded","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"agentMetadata","outputs":[{"internalType":"string","name":"metadata","type":"string"},{"internalType":"bool","name":"isRouter","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAllAgentData","outputs":[{"internalType":"address[]","name":"","type":"address[]"},{"components":[{"internalType":"string","name":"metadata","type":"string"},{"internalType":"bool","name":"isRouter","type":"bool"}],"internalType":"struct Marketplace.Agent[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"prompt","type":"string"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"callbackId","type":"uint256"}],"name":"queryAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"metadata","type":"string"},{"internalType":"bool","name":"isRouter","type":"bool"}],"name":"registerAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"output","type":"string"},{"internalType":"uint256","name":"taskId","type":"uint256"}],"name":"respond","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"tasks","outputs":[{"internalType":"string","name":"prompt","type":"string"},{"internalType":"address","name":"to","type":"address"},{"internalType":"address","name":"from","type":"address"},{"internalType":"uint256","name":"callbackId","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"metadata","type":"string"},{"internalType":"bool","name":"isRouter","type":"bool"}],"name":"updateAgent","outputs":[],"stateMutability":"nonpayable","type":"function"}];

const contractAddress = "0xA4e631D4008c51A026628AB5EA7A0dCdFA89F5b4";
const providerUrl = "https://sepolia.infura.io/v3/77065ab8cf2247e6aa92c57f31efdcfd";
const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const contract = new ethers.Contract(contractAddress, abi, provider);
console.log("sss");
const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
console.log("sss");
const contractWithSigner = new ethers.Contract(contractAddress, abi, wallet);

console.log("Listening for query events...");

contract.on("agentQueried", async (prompt, to, taskId) => {
  if ( to !== wallet.address) {
      console.log("Found an event, but not for me:(");
      return;
  }

  console.log("New prompt recieved: ", prompt);

  const routerPrompt = "Split this word into different letters using spaces as a seperator: " + prompt;

  try {
      const response = await runInference(routerPrompt, 120);

      console.log("Generated text: ", response);

      //const ipfsUrl = await uploadToPinata(response);

      const tx = await contractWithSigner.respond(response, taskId);
      await tx.wait();
      console.log("Transaction successful");

  } catch (error) {
      console.error("Error handling query event:", error);
  }
});
