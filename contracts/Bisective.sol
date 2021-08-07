//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Bisective is ERC20 {
  using SafeMath for uint256;

  uint256 public genesis;
  uint256 public initialReward;
  uint256 public bisectionInterval;

  uint public numMinerSnapshots;
  struct minerSnapshot {
    uint256 blockNumber;
    uint256 numMiners;
  }
  mapping(uint256 => minerSnapshot) public minerSnapshots;

  mapping(address => uint256) public minerStartingSnapshot;
  mapping(address => uint256) public minerLastReward;

  constructor(uint256 _initialReward, uint256 _bisectionInterval) ERC20("Bisective", "BSCT") {
    initialReward = _initialReward;
    bisectionInterval = _bisectionInterval;
    genesis = block.number.add(bisectionInterval); // start distributing rewards in 30 days
  }

  function becomeMiner() public {
    require(minerStartingSnapshot[msg.sender] == 0, "already a miner");

    // use genesis as block until it has passed
    uint256 blockNumber = block.number >= genesis ? block.number : genesis;

    if(minerSnapshots[numMinerSnapshots].blockNumber == blockNumber) {
      // there is already a snapshot for this block, increase the miner count at this block
      minerSnapshots[numMinerSnapshots].numMiners++;
    } else {
      numMinerSnapshots++;
      minerSnapshots[numMinerSnapshots].blockNumber = blockNumber;
      minerSnapshots[numMinerSnapshots].numMiners++;
    }

    minerStartingSnapshot[msg.sender] = numMinerSnapshots;
  }

  function calculateAvailableReward(address miner) public view returns (uint256){
    uint256 startingSnapshot = minerLastReward[miner] != 0 ? minerLastReward[miner] : minerStartingSnapshot[miner];

    if(startingSnapshot == 0) {
      return 0;
    }


    if(block.number < genesis) {
      return 0;
    }

    uint256 availableReward = 0;

    for(uint256 i = startingSnapshot; i <= numMinerSnapshots; i++) {
      uint256 rewardForSnapshot = 0;
      console.log('SNAPSHOT', i);
      console.log('--------------------------');


      minerSnapshot memory thisSnapshot = minerSnapshots[i];
      // if there is another snapshot after this one
      console.log('i', i);
      console.log('numMinerSnapshots', numMinerSnapshots);
      minerSnapshot memory nextSnapshot = i <= numMinerSnapshots.sub(1) ? minerSnapshots[i.add(1)] : minerSnapshot({
        blockNumber: block.number,
        numMiners: thisSnapshot.numMiners
      });


      console.log('thisSnapshot.blockNumber', thisSnapshot.blockNumber);
      console.log('nextSnapshot.blockNumber', nextSnapshot.blockNumber);
      console.log('genesis', genesis);
      // console.log('bisectionInterval', bisectionInterval);
      console.log('block.number', block.number);
      // console.log('intial reward', initialReward);

      // the section which this snapshot started in
      uint256 thisSection = thisSnapshot.blockNumber.sub(genesis).div(bisectionInterval);
      // console.log('this section', thisSection);
      // how many blocks this address mined during this section
      uint256 blocksMinedThisSection = bisectionInterval.sub(thisSnapshot.blockNumber.sub(genesis).mod(bisectionInterval));

      // if there was a full section mined, ignore it because it will get accounted in full section calculation next
      uint256 rewardThisSection = initialReward.div(2**thisSection);

      console.log('blocks mined presection', blocksMinedThisSection);
      console.log('presection reward rate', rewardThisSection);
      console.log('presection reward', rewardThisSection.mul(blocksMinedThisSection));
      rewardForSnapshot = rewardForSnapshot.add(rewardThisSection.mul(blocksMinedThisSection));
      // console.log('blocks mined this section', blocksMinedThisSection);

      console.log('blocksMinedThisSection', blocksMinedThisSection);
      // total number of blocks between snapshots
      uint256 blocksAfterFirstSection = nextSnapshot.blockNumber
        .sub(thisSnapshot.blockNumber)
        .sub(blocksMinedThisSection);

      console.log('blocks between snapshots', blocksAfterFirstSection);
      // number of full sections between current snapshot and next
      uint256 fullSectionsAfterThisSection = blocksAfterFirstSection.div(bisectionInterval);
            console.log('fullSectionsAfterThisSection', fullSectionsAfterThisSection);
      for(uint256 j = 0; j < fullSectionsAfterThisSection; j++) {
        uint256 section = thisSection.add(j.add(1));
        uint256 reward = initialReward.div(2**section);

        console.log('reward rate at section', section, ': ', reward);
        console.log('reward for section', section, ': ', reward.mul(bisectionInterval));
        rewardForSnapshot = rewardForSnapshot.add(reward.mul(bisectionInterval));
      }

      // number of blocks into final section of snapshot
      uint256 finalSection = thisSection.add(fullSectionsAfterThisSection).add(1);
      uint256 blocksInFinalSection = blocksAfterFirstSection.sub(fullSectionsAfterThisSection.mul(bisectionInterval));

      // dont double count if the first section this snapshot is the final section
      if(finalSection != thisSection) {
        uint256 rewardInFinalSection = initialReward.div(2**finalSection);

        console.log('postsection blocks mined', blocksInFinalSection);
        console.log('postsection reward rate', rewardInFinalSection);
        console.log('postsection reward', rewardInFinalSection.mul(blocksInFinalSection));
        rewardForSnapshot = rewardForSnapshot.add(rewardInFinalSection.mul(blocksInFinalSection));
      }

      availableReward = availableReward.add(rewardForSnapshot.div(thisSnapshot.numMiners));
    }

    return availableReward;
  }
}
