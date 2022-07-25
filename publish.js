/*

  The core bot that chooses a random named color,
  creates a 2D canvas, uploads it to imgur, changes
  the avatar URL to that image, and then publishes
  a new cast with all the data.

*/

import 'dotenv/config';
import namedColors from "color-name-list/dist/colornames.esm.mjs";
import { ethers } from "ethers";
import axios from "axios";
import imgurUploader from "imgur-uploader";
import {
  Web3UserRegistry,
  Farcaster,
  FarcasterGuardianContentHost,
} from "@standard-crypto/farcaster-js";
import * as URL from "url";
import { createCanvas } from "canvas";

const Wallet = ethers.Wallet;
const InfuraProvider = ethers.providers.InfuraProvider;

const private_key = process.env.PRIVATE_KEY;
if (!private_key) throw new Error("Must specify PRIVATE_KEY env variable");

// setup providers and signers
const network = process.env.NETWORK || "rinkeby";
const provider = new InfuraProvider(network, process.env.INFURA_API_KEY);
const userRegistry = new Web3UserRegistry(provider);
const signer = new Wallet(private_key, provider);
const address = signer.address;
const contentHost = new FarcasterGuardianContentHost(private_key);
const farcaster = new Farcaster();

const LOG = String(process.env.LOGGING) !== "0";

export default async function publish() {
  // fetch current user details
  const user = await userRegistry.lookupByAddress(address);
  if (user == null) {
    throw new Error(`No user for address ${address}`);
  }

  // current username of address
  const username = user.username;

  if (LOG) console.log(`User: ${username} / Address: ${address}`);

  // get a random color
  const color = namedColors[Math.floor(Math.random() * namedColors.length)];

  // generate a canvas for it
  const canvas = createCanvas(400, 200);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color.hex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // get a PNG Buffer from that canvas
  const buf = canvas.toBuffer();

  // Upload PNG to imgur
  if (LOG) console.log(`Uploading ${color.hex}...`);
  const { link } = await imgurUploader(buf, { title: color.hex });

  // construct the cast text
  const text = [color.name, color.hex, link].join("\n");
  if (LOG) console.log(`Casting:\n${text}`);

  // get a new directory with updated avatar image URL
  const oldDirectory = (await axios.get(user.directoryUrl)).data;
  const newDirectoryBody = {
    ...oldDirectory.body,
    avatarUrl: link,
  };

  // sign it to generate the directory data
  const newDirectory = await Farcaster.signDirectory(newDirectoryBody, signer);

  // now we prepare and sign the cast message
  const unsignedCast = await farcaster.prepareCast({
    fromUsername: username,
    text,
  });
  const signedCast = await Farcaster.signCast(unsignedCast, signer);

  // we can attach openGraph manually here, not sure if needed
  const domain = URL.parse(link).hostname;
  signedCast.attachments = {
    openGraph: [
      {
        url: link,
        title: color.name,
        description: color.hex,
        domain,
        image: link,
        imageId: null,
        logo: link,
        useLargeImage: true,
        strippedCastText: text.replace(link, ""),
      },
    ],
  };

  if (LOG) console.log("Publishing...");

  // publish the cast first
  await contentHost.publishCast(signedCast);

  // then update the directory to new avatar
  await contentHost.updateDirectory(newDirectory);
}
