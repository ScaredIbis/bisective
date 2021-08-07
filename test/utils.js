const goToBlock = async (_hre, target) => {
  const currentBlock = await hre.ethers.provider.getBlock();
  const blocksToMine = BigNumber.from(target).sub(currentBlock).toNumber;
  await mineBlocks(blocksToMine)
}

const mineBlocks = async (_hre, numBlocks) => {
  for (let i = 0; i < numBlocks; i++) {
    await hre.ethers.provider.send("evm_mine");
  }
}
module.exports = {
  goToBlock,
  mineBlocks
};