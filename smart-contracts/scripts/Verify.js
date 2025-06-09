const hre = require("hardhat");

async function main() {
  const contractAddress = "0xYourDeployedContractAddress"; // Replace with actual address

  console.log("Verifying contract on Flare Network...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });