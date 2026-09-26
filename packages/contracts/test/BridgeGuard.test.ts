import { expect } from "chai";
import { ethers } from "hardhat";

describe("BridgeGuard Contracts", function () {
  it("Should deploy Sender and correctly format data", async function () {
    const [owner] = await ethers.getSigners();
    const Sender = await ethers.getContractFactory("BridgeGuardSender");
    const sender = await Sender.deploy(owner.address); 
    await sender.waitForDeployment();
    expect(await sender.getAddress()).to.be.properAddress;
    expect(await sender.router()).to.equal(owner.address);
  });

  it("Should deploy Receiver and correctly initialize", async function () {
    const [owner, fakeSender] = await ethers.getSigners();
    const Receiver = await ethers.getContractFactory("BridgeGuardReceiver");
    const receiver = await Receiver.deploy(owner.address, fakeSender.address); 
    await receiver.waitForDeployment();
    expect(await receiver.getAddress()).to.be.properAddress;
  });
});
