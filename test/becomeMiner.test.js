const { expect } = require("chai");
const { mineBlocks } = require("./utils");
const { BigNumber } = hre.ethers;

const initialReward = BigNumber.from('50').mul(BigNumber.from(10).pow(18));
const bisectionInterval = 5

describe("becomeMiner", function () {
  it("Should successfully become a miner before genesis", async function () {
    const [signer] = await hre.ethers.getSigners();
    const Bisective = await ethers.getContractFactory("Bisective");
    const bisective = await Bisective.deploy(initialReward.toString(), bisectionInterval.toString());

    await bisective.deployed();

    await bisective.connect(signer).becomeMiner();

    const numMinerSnapshots = await bisective.numMinerSnapshots();
    expect(numMinerSnapshots).to.eql(BigNumber.from(1));

    const minerStartingSnapshot = await bisective.minerStartingSnapshot(signer.address);
    expect(minerStartingSnapshot).to.eql(BigNumber.from(1));


    const blockNumber = await hre.ethers.provider.getBlock();
    const genesis = await bisective.genesis();
    const minerSnapshot = await bisective.minerSnapshots(numMinerSnapshots);
    expect(minerSnapshot.blockNumber).to.eql(genesis);
    expect(minerSnapshot.numMiners).to.eql(BigNumber.from(1));
  });

  it("Should successfully become a miner after genesis", async function () {
    const [signer] = await hre.ethers.getSigners();
    const Bisective = await ethers.getContractFactory("Bisective");
    const bisective = await Bisective.deploy(initialReward.toString(), bisectionInterval.toString());

    await bisective.deployed();

    await mineBlocks(hre, bisectionInterval * 2);

    await bisective.connect(signer).becomeMiner();

    const numMinerSnapshots = await bisective.numMinerSnapshots();
    expect(numMinerSnapshots).to.eql(BigNumber.from(1));

    const minerStartingSnapshot = await bisective.minerStartingSnapshot(signer.address);
    expect(minerStartingSnapshot).to.eql(BigNumber.from(1));


    const blockNumber = await hre.ethers.provider.getBlock();
    const minerSnapshot = await bisective.minerSnapshots(numMinerSnapshots);
    expect(minerSnapshot.blockNumber).to.eql(BigNumber.from(blockNumber.number));
    expect(minerSnapshot.numMiners).to.eql(BigNumber.from(1));
  });

  it("Should revert if already a miner", async function () {
    const [signer] = await hre.ethers.getSigners();
    const Bisective = await ethers.getContractFactory("Bisective");
    const bisective = await Bisective.deploy(initialReward.toString(), bisectionInterval.toString());
    await hre.ethers.provider.send("evm_mine");

    await bisective.deployed();

    await bisective.connect(signer).becomeMiner();

    await hre.ethers.provider.send("evm_mine");

    await expect(bisective.connect(signer).becomeMiner())
    .to.be.revertedWith('already a miner');
  });

  it("Should successfully register two miners", async function () {
    const [signer1, signer2] = await hre.ethers.getSigners();
    const Bisective = await ethers.getContractFactory("Bisective");
    const bisective = await Bisective.deploy(initialReward.toString(), bisectionInterval.toString());

    await bisective.deployed();

    await mineBlocks(hre, bisectionInterval * 2);

    await network.provider.send("evm_setAutomine", [false]);

    await bisective.connect(signer1).becomeMiner();
    await bisective.connect(signer2).becomeMiner();

    await network.provider.send("evm_setAutomine", [true]);

    await hre.ethers.provider.send("evm_mine");

    const numMinerSnapshots = await bisective.numMinerSnapshots();
    expect(numMinerSnapshots).to.eql(BigNumber.from(1));

    const miner1StartingSnapshot = await bisective.minerStartingSnapshot(signer1.address);
    expect(miner1StartingSnapshot).to.eql(BigNumber.from(1));

    const miner2StartingSnapshot = await bisective.minerStartingSnapshot(signer2.address);
    expect(miner2StartingSnapshot).to.eql(BigNumber.from(1));

    const blockNumber = await hre.ethers.provider.getBlock();
    const minerSnapshot = await bisective.minerSnapshots(numMinerSnapshots);
    expect(minerSnapshot.blockNumber).to.eql(BigNumber.from(blockNumber.number));
    expect(minerSnapshot.numMiners).to.eql(BigNumber.from(2));
  });
});
