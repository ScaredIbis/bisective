const { expect } = require("chai");
const { BigNumber } = hre.ethers;
const { goToBlock, mineBlocks } = require('./utils')

const initialReward = BigNumber.from('50').mul(BigNumber.from(10).pow(18));
const bisectionInterval = 5

describe("calculateAvailableReward", function () {
  it("Should be 0 for a non-miner", async function () {
    const [signer] = await hre.ethers.getSigners();
    const Bisective = await ethers.getContractFactory("Bisective");
    const bisective = await Bisective.deploy(initialReward.toString(), bisectionInterval.toString());

    await bisective.deployed();

    const availableReward = await bisective.calculateAvailableReward(signer.address);

    expect(availableReward).to.eql(BigNumber.from(0));
  });

  it("Should be 0 if rewards haven't started yet", async function () {
    const [signer] = await hre.ethers.getSigners();
    const Bisective = await ethers.getContractFactory("Bisective");
    const bisective = await Bisective.deploy(initialReward.toString(), bisectionInterval.toString());

    await bisective.deployed();

    await bisective.connect(signer).becomeMiner();

    const availableReward = await bisective.calculateAvailableReward(signer.address);

    expect(availableReward).to.eql(BigNumber.from(0));
  });

  it("[miner before genesis] calculates correctly", async function () {
    const [signer] = await hre.ethers.getSigners();
    const Bisective = await ethers.getContractFactory("Bisective");


    const bisective = await Bisective.deploy(initialReward.toString(), bisectionInterval.toString());

    await bisective.deployed();

    // become a miner before the genesis
    await bisective.connect(signer).becomeMiner();

    // mine blocks up to genesis
    const genesis = await bisective.genesis();
    const currentBlock = await hre.ethers.provider.getBlock();
    await mineBlocks(hre, genesis.sub(currentBlock.number).toNumber());

    // mine all blocks for the first section
    await mineBlocks(hre, bisectionInterval);
    // mine 3 more blocks of the second section
    await mineBlocks(hre, 3);

    // availableReward should be all blocks at initial reward
    const expectedFirstSectionReward = initialReward.mul(bisectionInterval);
    // plus 3 blocks at second reward
    const expectedSecondSectionReward = initialReward.div(2).mul(3);

    const expectedReward = expectedFirstSectionReward.add(expectedSecondSectionReward);
    const availableReward = await bisective.calculateAvailableReward(signer.address);
    expect(availableReward.toString()).to.eql(expectedReward.toString());
  });

  it("[become miner part way through first section] calculates correctly", async function () {
    const [signer] = await hre.ethers.getSigners();
    const Bisective = await ethers.getContractFactory("Bisective");

    const bisective = await Bisective.deploy(initialReward.toString(), bisectionInterval.toString());

    await bisective.deployed();

    // mine blocks up to genesis
    const genesis = await bisective.genesis();
    const currentBlock = await hre.ethers.provider.getBlock();
    await mineBlocks(hre, genesis.sub(currentBlock.number).toNumber());

    // mine 2 blocks into the first section
    await mineBlocks(hre, 2);
    await bisective.connect(signer).becomeMiner();
    // mine 2 blocks as a miner
    await mineBlocks(hre, 2);

    // plus 3 blocks at second reward
    const expectedReward = initialReward.mul(2);

    const availableReward = await bisective.calculateAvailableReward(signer.address);
    expect(availableReward.toString()).to.eql(expectedReward.toString());
  });

  it("[mining over partial, full and then partial sections 1/1] calculates correctly", async function () {
    const [signer] = await hre.ethers.getSigners();
    const Bisective = await ethers.getContractFactory("Bisective");

    const bisective = await Bisective.deploy(initialReward.toString(), bisectionInterval.toString());

    await bisective.deployed();

    // mine blocks up to genesis
    const genesis = await bisective.genesis();
    const currentBlock = await hre.ethers.provider.getBlock();
    await mineBlocks(hre, genesis.sub(currentBlock.number).toNumber());

    // mine 2 blocks into the first section
    await mineBlocks(hre, 2);
    // this counts as 1 block of mining
    await bisective.connect(signer).becomeMiner();
    // mine 10 blocks
    await mineBlocks(hre, 10);

    // the remaining 2 blocks @ initial reward
    const expectedFirstSectionReward = initialReward.mul(2);
    // all 5 blocks @ initial reward / 2
    const expectedSecondSectionReward = initialReward.div(2).mul(bisectionInterval);
    // 2 blocks at @ initial reward / 4
    const expectedThirdSectionReward = initialReward.div(4).mul(3);

    const expectedReward = expectedFirstSectionReward
      .add(expectedSecondSectionReward)
      .add(expectedThirdSectionReward);


    const availableReward = await bisective.calculateAvailableReward(signer.address);
    expect(availableReward.toString()).to.eql(expectedReward.toString());
  });

  it("[mining over partial, full and then partial sections 2/2] calculates correctly", async function () {
    const [signer] = await hre.ethers.getSigners();
    const Bisective = await ethers.getContractFactory("Bisective");

    const bisective = await Bisective.deploy(initialReward.toString(), bisectionInterval.toString());

    await bisective.deployed();

    // mine blocks up to genesis
    const genesis = await bisective.genesis();
    const currentBlock = await hre.ethers.provider.getBlock();
    await mineBlocks(hre, genesis.sub(currentBlock.number).toNumber());

    // mine the entire first section and 2 into the next section without being a miner
    await mineBlocks(hre, bisectionInterval + 2);
    // this counts as 1 block of mining
    await bisective.connect(signer).becomeMiner();
    // mine 10 blocks
    await mineBlocks(hre, 10);

    // the remaining 2 blocks @ initial reward /2
    const expectedFirstSectionReward = initialReward.div(2).mul(2);
    // all 5 blocks @ initial reward / 4
    const expectedSecondSectionReward = initialReward.div(4).mul(bisectionInterval);
    // 2 blocks at @ initial reward / 8
    const expectedThirdSectionReward = initialReward.div(8).mul(3);

    const expectedReward = expectedFirstSectionReward
      .add(expectedSecondSectionReward)
      .add(expectedThirdSectionReward);


    const availableReward = await bisective.calculateAvailableReward(signer.address);
    expect(availableReward.toString()).to.eql(expectedReward.toString());
  });

  it.skip("[mining rewards get shared] calculates correctly", async function () {
    const [signer1, signer2] = await hre.ethers.getSigners();
    const Bisective = await ethers.getContractFactory("Bisective");

    const bisective = await Bisective.deploy(initialReward.toString(), bisectionInterval.toString());

    await bisective.deployed();

    // first miner joins
    await bisective.connect(signer1).becomeMiner();

    // mine blocks up to genesis
    const genesis = await bisective.genesis();
    const currentBlock = await hre.ethers.provider.getBlock();
    await mineBlocks(hre, genesis.sub(currentBlock.number).toNumber());

    // mine 2 blocks into the first section and then second miner joins
    await mineBlocks(hre, 2);
    // this counts as 1 block of mining
    await bisective.connect(signer2).becomeMiner();
    // mine 2 more blocks
    await mineBlocks(hre, 2);

    // first miner should have 100% share of 3 blocks plus 50% share of 2 blocks
    const expectedSigner1Reward = initialReward.mul(3).add(initialReward.div(2).mul(2))
    // second miner should have 50% share of 2 blocks
    const expectedSigner2Reward = initialReward.div(2).mul(2)

    const signer1AvailableReward = await bisective.calculateAvailableReward(signer1.address);
    // const signer2AvailableReward = await bisective.calculateAvailableReward(signer2.address);

    expect(expectedSigner1Reward.toString()).to.eql(signer1AvailableReward.toString());
    // expect(expectedSigner2Reward.toString()).to.eql(signer2AvailableReward.toString());
  });

  it("[all of first section and part way through second] calculates correctly", async function () {
    const [signer] = await hre.ethers.getSigners();
    const Bisective = await ethers.getContractFactory("Bisective");
    const bisective = await Bisective.deploy(initialReward.toString(), bisectionInterval.toString());

    await bisective.deployed();

    await bisective.connect(signer).becomeMiner();

    // mine blocks up to genesis
    const genesis = await bisective.genesis();
    const currentBlock = await hre.ethers.provider.getBlock();
    await mineBlocks(hre, genesis.sub(currentBlock.number).toNumber());

    await mineBlocks(hre, Number(bisectionInterval)+1);

    const availableReward = await bisective.calculateAvailableReward(signer.address);

    // the remaining 2 blocks @ initial reward /2
    const expectedFirstSectionReward = initialReward.mul(bisectionInterval);
    // all 5 blocks @ initial reward / 4
    const expectedSecondSectionReward = initialReward.div(2).mul(1);

    const expectedReward = expectedFirstSectionReward
      .add(expectedSecondSectionReward)

    expect(availableReward.toString()).to.eql(expectedReward.toString());

    // all blocks of the first section = 5 blocks @ 50 reward
    // // plus 1 block of the second section = 1 block @ 25 reward
    // expect(availableReward).to.eql(BigNumber.from('250'));
  });
});
