import { ethers } from 'ethers';
import { HfInference } from '@huggingface/inference';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
import fs from 'fs';
import { runInference, uploadViaLighthouse } from '../utils/utils.js';


dotenv.config();

// Disable SSL certificate verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const HF_API_TOKEN = process.env.HF_API_TOKEN;
const PINATA_JWT = process.env.PINATA_JWT;
const WALLET_PRIVATE_KEY = process.env.ROUTER1_PRIVATE_KEY;
const LIGHTHOUSE_API_KEY = process.env.ROUTER1_LIGHTHOUSE_API_KEY;

console.log(LIGHTHOUSE_API_KEY);

// upload the description.json that is in the same directory via uploadViaLighthouse  
const description = fs.readFileSync('description.json', 'utf8');
const descriptionCID = await uploadViaLighthouse(description, LIGHTHOUSE_API_KEY, "router1.json");
console.log("router1 CID: ", descriptionCID);



