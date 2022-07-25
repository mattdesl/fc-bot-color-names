import 'dotenv/config';
import { utils } from 'ethers';
import getStdin from 'get-stdin';

const phrase = await getStdin();
if (!phrase) throw new Error("stdin must be a mnemonic phrase")

const signer = utils.HDNode.fromMnemonic(phrase).derivePath("m/44'/60'/0'/0/1230940800");

console.log([
  `PRIVATE_KEY=${signer.privateKey}`,
  `ADDRESS=${signer.address}`
].join('\n'))