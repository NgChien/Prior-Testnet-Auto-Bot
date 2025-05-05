require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const { ethers } = require('ethers');
const { HttpsProxyAgent } = require('https-proxy-agent');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

const CHAIN_ID = 84532;
const RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/0ZrQkXT0VRk85z7RPf6MR-sERZCV3rR0';
const EXPLORER_URL = 'https://base-sepolia.blockscout.com/';

const PRIOR_TOKEN_ADDRESS = '0xeFC91C5a51E8533282486FA2601dFfe0a0b16EDb';
const USDC_TOKEN_ADDRESS = '0xdB07b0b4E88D9D5A79A08E91fEE20Bb41f9989a2';
const SWAP_ROUTER_ADDRESS = '0x8957e1988905311EE249e679a29fc9deCEd4D910';
const FAUCET_CONTRACT_ADDRESS = '0xa206dC56F1A56a03aEa0fCBB7c7A62b5bE1Fe419';

const API_BASE_URL = "https://priortestnet.xyz/api";

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const FAUCET_ABI = [
  'function claim() external'
];

function displayBanner() {
  const bannerWidth = 60;
  const line = '-'.repeat(bannerWidth);
  console.log(`\n${colors.cyan}${line}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}BOT TESTNET PRIOR - AIRDROP INSIDERS${colors.reset}`);
  console.log(`${colors.cyan}${line}${colors.reset}`);
}

function loadWallets() {
  try {
    const keyFile = fs.readFileSync('./keys.txt', 'utf8');
    const wallets = keyFile.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    if (wallets.length === 0) {
      throw new Error('Không tìm thấy private key nào trong file keys.txt');
    }

    console.log(`${colors.green}✅ Đã tải ${wallets.length} ví từ file keys.txt${colors.reset}`);
    return wallets;
  } catch (error) {
    throw new Error(`Lỗi khi đọc file keys.txt: ${error.message}`);
  }
}

function loadProxies() {
  try {
    const proxyFile = fs.readFileSync('./proxies.txt', 'utf8');
    const proxies = proxyFile.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    
    console.log(`${colors.green}✅ Loaded ${proxies.length} proxies from proxies.txt${colors.reset}`);
    return proxies;
  } catch (error) {
    console.log(`${colors.yellow}⚠️ Không tìm thấy file proxies.txt hoặc lỗi khi tải proxies: ${error.message}${colors.reset}`);
    return [];
  }
}

function createAxiosInstance(proxy = null) {
  const config = {
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.5',
      'priority': 'u=1, i',
      'sec-ch-ua': '"Brave";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'sec-gpc': '1',
      'Referer': 'https://priortestnet.xyz/',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  };
  
  if (proxy) {
    let proxyUrl = proxy;
    if (proxy.includes('@') && !proxy.startsWith('http')) {
      proxyUrl = `http://${proxy}`;
    } else if (!proxy.includes('@') && !proxy.startsWith('http')) {
      proxyUrl = `http://${proxy}`;
    }
    
    config.httpsAgent = new HttpsProxyAgent(proxyUrl);
    console.log(`${colors.yellow}ℹ️ Using proxy: ${proxy}${colors.reset}`);
  }
  
  return axios.create(config);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function countdown(seconds, message) {
  console.log(`\n${colors.yellow}⏱️ Starting countdown for ${formatTime(seconds)} - ${message}${colors.reset}`);
  
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\r${colors.yellow}⏱️ Time remaining: ${formatTime(i)} until ${message}${colors.reset}`);
    await sleep(1000);
  }
  
  console.log(`\n${colors.green}✅ Countdown completed. Starting next action.${colors.reset}`);
}

async function checkAndApproveToken(wallet, provider, walletIndex, proxy = null) {
  const signer = new ethers.Wallet(wallet, provider);
  const address = signer.address;
  const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

  console.log(`\n${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}🔹 WALLET #${walletIndex+1}: ${shortAddress}${colors.reset}`);
  console.log(`${colors.cyan}${'-'.repeat(60)}${colors.reset}`);

  try {
    const priorToken = new ethers.Contract(PRIOR_TOKEN_ADDRESS, ERC20_ABI, signer);
    const priorDecimals = await priorToken.decimals();
    const priorBalance = await priorToken.balanceOf(address);
    const formattedPriorBalance = ethers.utils.formatUnits(priorBalance, priorDecimals);
    
    console.log(`${colors.white}💰 PRIOR Balance: ${formattedPriorBalance} PRIOR${colors.reset}`);

    const usdcToken = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdcToken.decimals();
    const usdcBalance = await usdcToken.balanceOf(address);
    const formattedUsdcBalance = ethers.utils.formatUnits(usdcBalance, usdcDecimals);
    
    console.log(`${colors.white}💰 USDC Balance: ${formattedUsdcBalance} USDC${colors.reset}`);

    const priorSwapAmount = ethers.utils.parseUnits('0.1', priorDecimals);
    const usdcSwapAmount = ethers.utils.parseUnits('1', usdcDecimals);
    
    const hasPriorBalance = priorBalance.gte(priorSwapAmount);
    const hasUsdcBalance = usdcBalance.gte(usdcSwapAmount);
    
    if (!hasPriorBalance && !hasUsdcBalance) {
      console.log(`${colors.red}❌ Insufficient balance for both PRIOR and USDC.${colors.reset}`);
      console.log(`${colors.red}   Required: 0.1 PRIOR or 1 USDC${colors.reset}`);
      return false;
    }

    const axiosInstance = createAxiosInstance(proxy);
    const apiUrl = `${API_BASE_URL}/users/${address.toLowerCase()}`;
    const response = await axiosInstance.get(apiUrl);
    const userData = response.data;

    if (userData.dailySwaps >= 5) {
      console.log(`${colors.red}❌ Daily swap limit reached (5/5). Try again after daily reset.${colors.reset}`);
      return false;
    }

    if (hasPriorBalance) {
      const priorAllowance = await priorToken.allowance(address, SWAP_ROUTER_ADDRESS);
      if (priorAllowance.lt(priorSwapAmount)) {
        console.log(`${colors.yellow}⏳ Approving PRIOR token...${colors.reset}`);
        const maxApproval = ethers.constants.MaxUint256;
        const tx = await priorToken.approve(SWAP_ROUTER_ADDRESS, maxApproval);
        
        console.log(`${colors.yellow}🔄 PRIOR approval transaction sent: ${tx.hash}${colors.reset}`);
        await tx.wait();
        console.log(`${colors.green}✅ PRIOR approval confirmed${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ PRIOR token already approved${colors.reset}`);
      }
    }
    
    if (hasUsdcBalance) {
      const usdcAllowance = await usdcToken.allowance(address, SWAP_ROUTER_ADDRESS);
      if (usdcAllowance.lt(usdcSwapAmount)) {
        console.log(`${colors.yellow}⏳ Approving USDC token...${colors.reset}`);
        const maxApproval = ethers.constants.MaxUint256;
        const tx = await usdcToken.approve(SWAP_ROUTER_ADDRESS, maxApproval);
        
        console.log(`${colors.yellow}🔄 USDC approval transaction sent: ${tx.hash}${colors.reset}`);
        await tx.wait();
        console.log(`${colors.green}✅ USDC approval confirmed${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ USDC token already approved${colors.reset}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Lỗi trong checkAndApproveToken: ${error.message}${colors.reset}`);
    return false;
  }
}

async function executeSwap(wallet, provider, swapCount, walletIndex, proxy = null, swapDirection = null) {
  const signer = new ethers.Wallet(wallet, provider);
  const address = signer.address;
  const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  
  try {
    if (swapDirection === null) {
      swapDirection = Math.random() < 0.5 ? 'PRIOR_TO_USDC' : 'USDC_TO_PRIOR';
    }
    
    if (swapDirection === 'PRIOR_TO_USDC') {
      const priorToken = new ethers.Contract(PRIOR_TOKEN_ADDRESS, ERC20_ABI, signer);
      const priorDecimals = await priorToken.decimals();
      const priorBalance = await priorToken.balanceOf(address);
      const priorAmount = ethers.utils.parseUnits('0.1', priorDecimals);
      
      if (priorBalance.lt(priorAmount)) {
        console.log(`${colors.yellow}⚠️ Insufficient PRIOR balance for PRIOR→USDC swap. Trying USDC→PRIOR instead...${colors.reset}`);
        return executeSwap(wallet, provider, swapCount, walletIndex, proxy, 'USDC_TO_PRIOR');
      }
      
      const priorAllowance = await priorToken.allowance(address, SWAP_ROUTER_ADDRESS);
      if (priorAllowance.lt(priorAmount)) {
        console.log(`${colors.yellow}⏳ Approving PRIOR token for swap...${colors.reset}`);
        const approveTx = await priorToken.approve(SWAP_ROUTER_ADDRESS, ethers.constants.MaxUint256);
        await approveTx.wait();
        console.log(`${colors.green}✅ PRIOR approval confirmed${colors.reset}`);
      }
      
      console.log(`${colors.yellow}🔄 Executing swap #${swapCount} - Swapping 0.1 PRIOR to USDC...${colors.reset}`);
      
      const swapData = '0x8ec7baf1000000000000000000000000000000000000000000000000016345785d8a0000';
      
      const tx = await signer.sendTransaction({
        to: SWAP_ROUTER_ADDRESS,
        data: swapData,
        gasLimit: 300000,
      });
      
      console.log(`${colors.yellow}🔄 Swap transaction sent: ${tx.hash}${colors.reset}`);
      const receipt = await tx.wait();
      console.log(`${colors.green}✅ Swap confirmed in block ${receipt.blockNumber}${colors.reset}`);
      
      await reportSwap(address, tx.hash, receipt.blockNumber, "PRIOR", "USDC", "0.1", proxy);
      
    } else {
      const usdcToken = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, signer);
      const usdcDecimals = await usdcToken.decimals();
      const usdcBalance = await usdcToken.balanceOf(address);
      const usdcAmount = ethers.utils.parseUnits('1', usdcDecimals);
      
      if (usdcBalance.lt(usdcAmount)) {
        console.log(`${colors.yellow}⚠️ Insufficient USDC balance for USDC→PRIOR swap. Trying PRIOR→USDC instead...${colors.reset}`);
        return executeSwap(wallet, provider, swapCount, walletIndex, proxy, 'PRIOR_TO_USDC');
      }
      
      const usdcAllowance = await usdcToken.allowance(address, SWAP_ROUTER_ADDRESS);
      if (usdcAllowance.lt(usdcAmount)) {
        console.log(`${colors.yellow}⏳ Approving USDC token for swap...${colors.reset}`);
        const approveTx = await usdcToken.approve(SWAP_ROUTER_ADDRESS, ethers.constants.MaxUint256);
        await approveTx.wait();
        console.log(`${colors.green}✅ USDC approval confirmed${colors.reset}`);
      }
      
      console.log(`${colors.yellow}🔄 Executing swap #${swapCount} - Swapping 1 USDC to PRIOR...${colors.reset}`);

      const swapData = '0xea0e435800000000000000000000000000000000000000000000000000000000000f4240';
      
      const tx = await signer.sendTransaction({
        to: SWAP_ROUTER_ADDRESS,
        data: swapData,
        gasLimit: 109139, 
      });
      
      console.log(`${colors.yellow}🔄 Swap transaction sent: ${tx.hash}${colors.reset}`);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        throw new Error(`Transaction failed with status 0. Check contract revert reason.`);
      }
      
      console.log(`${colors.green}✅ Swap confirmed in block ${receipt.blockNumber}${colors.reset}`);
      
      await reportSwap(address, tx.hash, receipt.blockNumber, "USDC", "PRIOR", "1", proxy);
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Error in executeSwap: ${error.message}${colors.reset}`);
    if (error.transaction) {
      console.error(`${colors.red}Transaction details: ${JSON.stringify(error.transaction, null, 2)}${colors.reset}`);
    }
    if (error.receipt) {
      console.error(`${colors.red}Receipt details: ${JSON.stringify(error.receipt, null, 2)}${colors.reset}`);
    }
    
    if (swapDirection === 'PRIOR_TO_USDC') {
      console.log(`${colors.yellow}⚠️ PRIOR→USDC swap failed. Trying USDC→PRIOR instead...${colors.reset}`);
      return executeSwap(wallet, provider, swapCount, walletIndex, proxy, 'USDC_TO_PRIOR');
    } else if (swapDirection === 'USDC_TO_PRIOR') {
      console.log(`${colors.yellow}⚠️ USDC→PRIOR swap failed. Trying PRIOR→USDC instead...${colors.reset}`);
      return executeSwap(wallet, provider, swapCount, walletIndex, proxy, 'PRIOR_TO_USDC');
    }
    
    return false;
  }
}

async function reportSwap(walletAddress, txHash, blockNumber, fromToken, toToken, fromAmount, proxy = null) {
  try {
    const apiUrl = `${API_BASE_URL}/swap`;
    const axiosInstance = createAxiosInstance(proxy);
    
    const payload = {
      address: walletAddress.toLowerCase(),
      amount: fromAmount,
      tokenFrom: fromToken,
      tokenTo: toToken,
      txHash: txHash
    };
    
    const response = await axiosInstance.post(apiUrl, payload, {
      headers: {
        "Referer": "https://priortestnet.xyz/swap"
      }
    });
    
    console.log(`${colors.green}✅ Swap reported to API: ${response.status}${colors.reset}`);
    console.log(`${colors.white}📊 Points earned: ${response.data.pointsEarned}, Swaps remaining: ${response.data.swapsRemaining}${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Error reporting swap to API: ${error.message}${colors.reset}`);
    if (error.response && error.response.status === 400) {
      console.log(`${colors.yellow}⚠️ Swap rejected: Likely due to invalid transaction or daily limit${colors.reset}`);
    }
    return false;
  }
}

async function claimFaucet(wallet, provider, walletIndex, proxy = null) {
  const signer = new ethers.Wallet(wallet, provider);
  const address = signer.address;
  const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

  console.log(`\n${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}🔹 WALLET #${walletIndex+1}: ${shortAddress}${colors.reset}`);
  console.log(`${colors.cyan}${'-'.repeat(60)}${colors.reset}`);

  try {
    const axiosInstance = createAxiosInstance(proxy);
    const apiUrl = `${API_BASE_URL}/users/${address.toLowerCase()}`;
    const response = await axiosInstance.get(apiUrl);
    const userData = response.data;

    const lastClaim = userData.lastFaucetClaim;
    if (lastClaim) {
      const lastClaimTime = new Date(lastClaim);
      const currentTime = new Date();
      const timeDiff = (currentTime - lastClaimTime) / (1000 * 60 * 60);
      if (timeDiff < 24) {
        const hoursUntilNextClaim = (24 - timeDiff).toFixed(2);
        console.log(`${colors.cyan}⚠️ Faucet claim on cooldown. Next claim available in ${hoursUntilNextClaim} hours.${colors.reset}`);
        return false;
      }
    }

    console.log(`${colors.blue}🚰 Claiming from faucet contract...${colors.reset}`);
    const faucetContract = new ethers.Contract(FAUCET_CONTRACT_ADDRESS, FAUCET_ABI, signer);
    const tx = await faucetContract.claim();
    
    console.log(`${colors.yellow}🔄 Faucet claim transaction sent: ${tx.hash}${colors.reset}`);
    const receipt = await tx.wait();
    console.log(`${colors.green}✅ Faucet claim confirmed in block ${receipt.blockNumber}${colors.reset}`);

    await reportFaucetClaim(address, proxy);

    const priorToken = new ethers.Contract(PRIOR_TOKEN_ADDRESS, ERC20_ABI, signer);
    const decimals = await priorToken.decimals();
    const balance = await priorToken.balanceOf(address);
    const formattedBalance = ethers.utils.formatUnits(balance, decimals);
    
    console.log(`${colors.white}💰 New balance after claim: ${formattedBalance} PRIOR${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Error in claimFaucet: ${error.message}${colors.reset}`);
    
    try {
      console.log(`${colors.yellow}⚠️ Trying API-only method as fallback...${colors.reset}`);
      await reportFaucetClaim(address, proxy);
      console.log(`${colors.green}✅ API faucet claim request sent${colors.reset}`);
      return true;
    } catch (apiError) {
      console.error(`${colors.red}❌ API faucet claim also failed: ${apiError.message}${colors.reset}`);
      return false;
    }
  }
}

async function reportFaucetClaim(walletAddress, proxy = null) {
  try {
    const apiUrl = `${API_BASE_URL}/faucet/claim`;
    const axiosInstance = createAxiosInstance(proxy);
    
    const payload = {
      address: walletAddress.toLowerCase()
    };
    
    const response = await axiosInstance.post(apiUrl, payload, {
      headers: {
        "Referer": "https://priortestnet.xyz/faucet"
      }
    });
    
    console.log(`${colors.green}✅ Faucet claim reported to API: ${response.status}${colors.reset}`);
    return true;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log(`${colors.yellow}⚠️ Faucet claim rejected: Likely on 24-hour cooldown${colors.reset}`);
    } else {
      console.error(`${colors.red}❌ Error reporting faucet claim to API: ${error.message}${colors.reset}`);
    }
    throw error;
  }
}

async function performAllFaucetClaims(wallets, proxies, provider) {
  let totalClaimsCompleted = 0;
  
  console.log(`\n${colors.bright}${colors.blue}=== Starting faucet claims at ${new Date().toLocaleString()} ===${colors.reset}`);

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null;
    const signer = new ethers.Wallet(wallet, provider);
    const address = signer.address;
    const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

    try {
      const axiosInstance = createAxiosInstance(proxy);
      const apiUrl = `${API_BASE_URL}/users/${address.toLowerCase()}`;
      const response = await axiosInstance.get(apiUrl);
      const userData = response.data;

      console.log(`\n${colors.cyan}🔹 Wallet Info for ${shortAddress}${colors.reset}`);
      console.log(`${colors.white}ID: ${userData.id}${colors.reset}`);
      console.log(`${colors.white}Total Points: ${userData.totalPoints}${colors.reset}`);
      console.log(`${colors.white}Daily Points: ${userData.dailyPoints}${colors.reset}`);
      console.log(`${colors.white}Last Faucet Claim: ${userData.lastFaucetClaim || 'Never'}${colors.reset}`);
      console.log(`${colors.white}Is Admin: ${userData.isAdmin}${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}❌ Error fetching wallet info: ${error.message}${colors.reset}`);
    }

    const claimSuccessful = await claimFaucet(wallet, provider, i, proxy);
    
    if (claimSuccessful) {
      totalClaimsCompleted++;
    }

    if (i < wallets.length - 1) {
      console.log(`${colors.yellow}⏳ Waiting 12 seconds before next claim...${colors.reset}`);
      await sleep(12000);
    }
  }
  
  console.log(`\n${colors.green}🎉 Completed ${totalClaimsCompleted}/${wallets.length} faucet claims${colors.reset}`);
  return totalClaimsCompleted;
}

async function completeAllSwaps(wallets, proxies, provider) {
  const MAX_SWAPS_PER_WALLET = 5;
  let totalSwapsCompleted = 0;
  
  console.log(`\n${colors.bright}${colors.cyan}=== Starting swap session at ${new Date().toLocaleString()} ===${colors.reset}`);
  console.log(`${colors.yellow}🎯 Target: Up to ${MAX_SWAPS_PER_WALLET} swaps per wallet${colors.reset}`);

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null;
    const signer = new ethers.Wallet(wallet, provider);
    const address = signer.address;
    const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

    let walletSwapsCompleted = 0;

    const axiosInstance = createAxiosInstance(proxy);
    const apiUrl = `${API_BASE_URL}/users/${address.toLowerCase()}`;
    const response = await axiosInstance.get(apiUrl);
    const userData = response.data;

    console.log(`\n${colors.cyan}🔹 Wallet #${i+1}: ${shortAddress}${colors.reset}`);
    console.log(`${colors.white}Current daily swaps: ${userData.dailySwaps}/5${colors.reset}`);
    console.log(`${colors.white}Total points: ${userData.totalPoints}${colors.reset}`);

    if (userData.dailySwaps >= MAX_SWAPS_PER_WALLET) {
      console.log(`${colors.yellow}⚠️ Wallet has reached daily swap limit (5/5). Skipping...${colors.reset}`);
      continue;
    }

    const isApproved = await checkAndApproveToken(wallet, provider, i, proxy);
    
    if (isApproved) {
      while (walletSwapsCompleted + userData.dailySwaps < MAX_SWAPS_PER_WALLET) {
        const swapSuccessful = await executeSwap(wallet, provider, totalSwapsCompleted + 1, i, proxy);
        
        if (swapSuccessful) {
          walletSwapsCompleted++;
          totalSwapsCompleted++;

          const updatedResponse = await axiosInstance.get(apiUrl);
          const updatedUserData = updatedResponse.data;
          if (updatedUserData.dailySwaps >= MAX_SWAPS_PER_WALLET) {
            console.log(`${colors.yellow}⚠️ Daily swap limit reached for this wallet. Moving to next wallet...${colors.reset}`);
            break;
          }
        } else {
          console.log(`${colors.yellow}⚠️ Swap failed for wallet #${i+1}. Moving to next wallet...${colors.reset}`);
          break;
        }

        if (walletSwapsCompleted + userData.dailySwaps < MAX_SWAPS_PER_WALLET) {
          console.log(`${colors.yellow}⏳ Waiting 15 seconds before next swap...${colors.reset}`);
          await sleep(15000);
        }
      }
    }

    if (i < wallets.length - 1) {
      console.log(`${colors.yellow}⏳ Waiting 15 seconds before processing next wallet...${colors.reset}`);
      await sleep(15000);
    }
  }
  
  console.log(`\n${colors.green}🎉 Completed ${totalSwapsCompleted} swaps across all wallets${colors.reset}`);
  return totalSwapsCompleted;
}

function displayMenu() {
  console.log(`${colors.cyan}${colors.bright}PRIOR TESTNET BOT MENU ${colors.reset}`);
  console.log(`${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
  console.log(`${colors.white} 1. Claim faucet only ${colors.reset}`);
  console.log(`${colors.white} 2. Perform 5 swaps only ${colors.reset}`);
  console.log(`${colors.white} 3. Claim faucet and then perform 5 swaps ${colors.reset}`);
  console.log(`${colors.white} 4. Start automatic daily routine (faucet + 5 swaps every 24h) ${colors.reset}`);
  console.log(`${colors.white} 0. Exit ${colors.reset}`);
  console.log(`${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`${colors.yellow}Select an option (0-4): ${colors.reset}`, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  try {
    displayBanner();
    
    const wallets = loadWallets();
    const proxies = loadProxies();
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    console.log(`\n${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}🔹 CHAIN INFO${colors.reset}`);
    console.log(`${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
    console.log(`${colors.white}🔗 Network: Base Sepolia Testnet${colors.reset}`);
    console.log(`${colors.white}🔄 Swap Router: ${SWAP_ROUTER_ADDRESS}${colors.reset}`);
    console.log(`${colors.white}💠 PRIOR Token: ${PRIOR_TOKEN_ADDRESS}${colors.reset}`);
    console.log(`${colors.white}💵 USDC Token: ${USDC_TOKEN_ADDRESS}${colors.reset}`);
    console.log(`${colors.white}🚰 Faucet Contract: ${FAUCET_CONTRACT_ADDRESS}${colors.reset}`);
    console.log(`${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
    
    console.log(`${colors.cyan}${colors.bright}🔹 WALLET INFO${colors.reset}`);
    console.log(`${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null;
      const signer = new ethers.Wallet(wallet, provider);
      const address = signer.address;
      const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

      try {
        const axiosInstance = createAxiosInstance(proxy);
        const apiUrl = `${API_BASE_URL}/users/${address.toLowerCase()}`;
        const response = await axiosInstance.get(apiUrl);
        const userData = response.data;

        console.log(`\n${colors.cyan}🔹 Wallet #${i + 1}: ${shortAddress}${colors.reset}`);
        console.log(`${colors.white}Address: ${address}${colors.reset}`);
        console.log(`${colors.white}ID: ${userData.id}${colors.reset}`);
        console.log(`${colors.white}Total Points: ${userData.totalPoints}${colors.reset}`);
        console.log(`${colors.white}Daily Points: ${userData.dailyPoints}${colors.reset}`);
        console.log(`${colors.white}Daily Swaps: ${userData.dailySwaps}/5${colors.reset}`);
        console.log(`${colors.white}Last Faucet Claim: ${userData.lastFaucetClaim || 'Never'}${colors.reset}`);
        console.log(`${colors.white}Is Admin: ${userData.isAdmin}${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}❌ Error fetching wallet info for ${shortAddress}: ${error.message}${colors.reset}`);
      }

      if (i < wallets.length - 1) {
        await sleep(2000);
      }
    }
    console.log(`${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
    
    while (true) {
      const choice = await displayMenu();
      
      switch (choice) {
        case '0':
          console.log(`${colors.green}👋 Exiting application. Goodbye!${colors.reset}`);
          process.exit(0);
          break;
          
        case '1':
          await performAllFaucetClaims(wallets, proxies, provider);
          break;
          
        case '2':
          await completeAllSwaps(wallets, proxies, provider);
          break;
          
        case '3':
          await performAllFaucetClaims(wallets, proxies, provider);
          console.log(`${colors.yellow}⏳ Waiting 30 seconds before starting swaps...${colors.reset}`);
          await sleep(30000);
          await completeAllSwaps(wallets, proxies, provider);
          break;
          
        case '4':
          console.log(`${colors.white}🤖 Starting automatic daily routine...${colors.reset}`);
          while (true) {
            await performAllFaucetClaims(wallets, proxies, provider);
            console.log(`${colors.yellow}⏳ Waiting 30 seconds before starting swaps...${colors.reset}`);
            await sleep(30000);
            await completeAllSwaps(wallets, proxies, provider);
            await countdown(24 * 60 * 60, "next daily routine");
          }
          break;
          
        default:
          console.log(`${colors.red}❌ Invalid option. Please try again.${colors.reset}`);
      }
    }
  } catch (error) {
    console.error(`${colors.red}❌ Main process error: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}⏳ Restarting bot in 1 minute...${colors.reset}`);
    await sleep(60000);
    main();
  }
}

main().catch(error => {
  console.error(`${colors.red}❌ Fatal error: ${error.message}${colors.reset}`);
});
