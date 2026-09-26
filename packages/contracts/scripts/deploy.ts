import { ethers, network } from "hardhat";

async function main() {
  const chainId = network.config.chainId;
  console.log(`Deploying on network: ${network.name} (${chainId})`);

  if (network.name === "arbitrumSepolia") {
    const routerAddress = "0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165";
    console.log(`Deploying BridgeGuardReceiver with router ${routerAddress}...`);
    const Receiver = await ethers.getContractFactory("BridgeGuardReceiver");
    const receiver = await Receiver.deploy(routerAddress);
    await receiver.waitForDeployment();
    console.log(`BridgeGuardReceiver deployed to: ${await receiver.getAddress()}`);
  } else if (network.name === "sepolia") {
    const routerAddress = "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59";
    console.log(`Deploying BridgeGuardSender with router ${routerAddress}...`);
    const Sender = await ethers.getContractFactory("BridgeGuardSender");
    const sender = await Sender.deploy(routerAddress);
    await sender.waitForDeployment();
    console.log(`BridgeGuardSender deployed to: ${await sender.getAddress()}`);
  } else {
    console.log("Unsupported network for this script.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
