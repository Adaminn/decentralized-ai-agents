import axios from 'axios';
import { ethers } from 'ethers';
import lighthouse from '@lighthouse-web3/sdk';

// Disable SSL certificate verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const signAuthMessage = async (privateKey, verificationMessage) => {
  const signer = new ethers.Wallet(privateKey);
  const signedMessage = await signer.signMessage(verificationMessage);
  return signedMessage;
};

const getApiKey = async () => {
  const wallet = {
    publicKey: 'p',
    privateKey: 'pr'
  };
  const verificationMessage = (
    await axios.get(
      `https://api.lighthouse.storage/api/auth/get_message?publicKey=${wallet.publicKey}`
    )
  ).data;
  const signedMessage = await signAuthMessage(wallet.privateKey, verificationMessage);
  const response = await lighthouse.getApiKey(wallet.publicKey, signedMessage);
  console.log(response);
};

getApiKey();
