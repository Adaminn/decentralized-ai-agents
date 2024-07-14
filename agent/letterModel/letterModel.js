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

const abi = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"AddressEmptyCode","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"AddressInsufficientBalance","type":"error"},{"inputs":[],"name":"FailedInnerCall","type":"error"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"SafeERC20FailedOperation","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"prompt","type":"string"},{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"taskId","type":"uint256"}],"name":"agentQueried","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"output","type":"string"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"callbackId","type":"uint256"}],"name":"agentResponded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"tokensDeposited","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"tokensWithdrawn","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"agentMetadata","outputs":[{"internalType":"string","name":"metadata","type":"string"},{"internalType":"uint256","name":"reputation","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"depositTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"agentAddress","type":"address"},{"internalType":"address","name":"token","type":"address"}],"name":"getAgentPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAllAgentData","outputs":[{"internalType":"address[]","name":"","type":"address[]"},{"components":[{"internalType":"string","name":"metadata","type":"string"},{"components":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"internalType":"struct Marketplace.Price[]","name":"prices","type":"tuple[]"},{"internalType":"uint256","name":"reputation","type":"uint256"}],"internalType":"struct Marketplace.Agent[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"prompt","type":"string"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"callbackId","type":"uint256"},{"internalType":"address","name":"token","type":"address"}],"name":"queryAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"metadata","type":"string"}],"name":"registerAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"output","type":"string"},{"internalType":"uint256","name":"taskId","type":"uint256"}],"name":"respond","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"price","type":"uint256"}],"name":"setAgentPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"tasks","outputs":[{"internalType":"string","name":"prompt","type":"string"},{"internalType":"address","name":"to","type":"address"},{"internalType":"address","name":"from","type":"address"},{"internalType":"uint256","name":"callbackId","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"metadata","type":"string"}],"name":"updateAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"userBalances","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdrawTokens","outputs":[],"stateMutability":"nonpayable","type":"function"}];

const contractAddress = "0xF3e2c05911376E10fEed59f7d0381CE78Fd9b993";
const providerUrl = "https://sepolia.infura.io/v3/77065ab8cf2247e6aa92c57f31efdcfd";
const provider = new ethers.providers.JsonRpcProvider(providerUrl);
const contract = new ethers.Contract(contractAddress, abi, provider);
const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
const contractWithSigner = new ethers.Contract(contractAddress, abi, wallet);

console.log("Listening for query events...");

contract.on("agentQueried", async (prompt, to, taskId) => {
  if ( to !== wallet.address) {
      console.log("Found an event, but not for me:(");
      return;
  }

  console.log("New prompt recieved: ", prompt);

  //const routerPrompt = "Split this word into different letters using spaces as a seperator: " + prompt;
  const routerPrompt = prompt;

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
