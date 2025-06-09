const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const PropertyToken = await hre.ethers.getContractFactory("PropertyToken");
  const propertyToken = await PropertyToken.deploy();
  await propertyToken.deployed();
  console.log("PropertyToken deployed to:", propertyToken.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

