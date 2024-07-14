import lighthouse from '@lighthouse-web3/sdk';
import fs from 'fs';
import fetch from 'node-fetch';
import { HfInference } from '@huggingface/inference';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';

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

export async function runInference(prompt, tokenCount) {
  const hf = new HfInference(HF_API_TOKEN);

  const model = 'microsoft/Phi-3-mini-4k-instruct';

  try {
    const result = await hf.textGeneration({
      model,
      inputs: prompt,
      parameters: {
        max_new_tokens: tokenCount,
        do_sample: true,
      },
    });

    return result.generated_text;
  } catch (error) {
    console.error('Error during inference:', error);
    return 'Inference error';
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