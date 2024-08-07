import lighthouse from '@lighthouse-web3/sdk';
import fs from 'fs';
import fetch from 'node-fetch';
import { HfInference } from '@huggingface/inference';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const HF_API_TOKEN = process.env.HF_API_TOKEN;
const PINATA_JWT = process.env.PINATA_JWT;

export function downloadFile(cid, outputPath) {
  fetch(`https://gateway.lighthouse.storage/ipfs/${cid}`)
    .then(response => {
      if (response.ok) return response.buffer();
      throw new Error('Network response was not ok.');
    })
    .then(buffer => {
      fs.writeFile(path, buffer, () => {
        console.log(`File saved to ${path}`);
      });
    })
    .catch(error => {
      console.error('Failed to save the file:', error);
    });
}

export async function uploadViaLighthouse(text, apiKey, name = "") {
  const response = await lighthouse.uploadText(text, apiKey, name);
  console.log("upload via lighthouse completed: ", response);
  return response.data.Hash;
}

export async function runInference(prompt, tokenCount, systemPrompt = 'You are a helpful assistant.') {
  const openai = new OpenAI({
    apiKey: 'dummy', // LM Studio doesn't require an API key, but the library expects one
    baseURL: 'http://localhost:1234/v1', // Your local LM Studio server URL
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: tokenCount,
      temperature: 0,
      stream: false // Set to true if you want to handle streaming responses
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error during inference:', error);
    throw error;
  }
}

export async function uploadToPinata(text) {
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