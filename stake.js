require('dotenv').config();
const axios = require('axios');
const { ethers } = require('ethers');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
};

function displayBanner() {
  const bannerWidth = 54;
  const line = '-'.repeat(bannerWidth);
  console.log(`${colors.cyan}${line}${colors.reset}`);
  console.log(`${colors.cyan}PRIOR TESTNET MINING ACTIVATOR - AIRDROP INSIDERS${colors.reset}`);
  console.log(`${colors.cyan}${line}${colors.reset}`);
}

function loadWallets() {
  const wallets = [];
  let i = 1;
  
  while (process.env[`WALLET_PK_${i}`]) {
    wallets.push(process.env[`WALLET_PK_${i}`]);
    i++;
  }
  
  if (wallets.length === 0) {
    throw new Error('No wallet private keys found in .env file');
  }
  
  console.log(`${colors.green}✅ Loaded ${wallets.length} wallets from .env${colors.reset}`);
  return wallets;
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
    console.log(`${colors.yellow}⚠️ No proxies.txt file found or error loading proxies: ${error.message}${colors.reset}`);
    return [];
  }
}

function createAxiosInstance(proxy = null) {
  const config = {
    timeout: 30000,
    headers: {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'content-type': 'application/json',
      'priority': 'u=1, i',
      'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'Referer': 'https://priornftstake.xyz/',
      'Referrer-Policy': 'no-referrer-when-downgrade'
    }
  };
  
  if (proxy) {
    let proxyUrl = proxy;

    if (proxy.includes('@') && !proxy.startsWith('http')) {
      proxyUrl = `http://${proxy}`;
    } 
    else if (!proxy.includes('@') && !proxy.startsWith('http')) {
      proxyUrl = `http://${proxy}`;
    }
    
    config.httpsAgent = new HttpsProxyAgent(proxyUrl);
    console.log(`${colors.cyan}ℹ️ Using proxy: ${proxy}${colors.reset}`);
  }
  
  return axios.create(config);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function activateMining(address, proxy = null) {
  try {
    const axiosInstance = createAxiosInstance(proxy);
    const url = 'https://prior-stake-priorprotocol.replit.app/api/activate';
    
    const payload = {
      walletAddress: address.toLowerCase(),
      hasNFT: true
    };
    
    const response = await axiosInstance.post(url, payload);
    console.log(`${colors.green}✅ Mining activated for ${address}${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Error activating mining: ${error.message}${colors.reset}`);
    return false;
  }
}

async function deactivateMining(address, proxy = null) {
  try {
    const axiosInstance = createAxiosInstance(proxy);
    const url = 'https://prior-stake-priorprotocol.replit.app/api/deactivate';
    
    const payload = {
      walletAddress: address.toLowerCase()
    };
    
    const response = await axiosInstance.post(url, payload);
    console.log(`${colors.yellow}🔄 Mining deactivated for ${address}${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Error deactivating mining: ${error.message}${colors.reset}`);
    return false;
  }
}

async function getUserData(address, proxy = null) {
  try {
    const axiosInstance = createAxiosInstance(proxy);
    const url = 'https://prior-stake-priorprotocol.replit.app/api/user';
    
    const config = {
      params: {
        walletAddress: address.toLowerCase()
      }
    };
    
    const response = await axiosInstance.get(url, config);
    return response.data;
  } catch (error) {
    console.error(`${colors.red}❌ Error fetching user data: ${error.message}${colors.reset}`);
    return null;
  }
}

async function processMining(walletPk, proxy = null, index) {
  try {
    const wallet = new ethers.Wallet(walletPk);
    const address = wallet.address;
    const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    
    console.log(`\n${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}🔹 WALLET #${index+1}: ${shortAddress}${colors.reset}`);
    console.log(`${colors.cyan}${'-'.repeat(60)}${colors.reset}`);

    console.log(`${colors.white}ℹ️ Current status: ASSUMING INACTIVE${colors.reset}`);

    try {
      console.log(`${colors.yellow}🔄 Deactivating mining first...${colors.reset}`);
      await deactivateMining(address, proxy);
      await sleep(3000); 
    } catch (err) {

    }
    
    console.log(`${colors.yellow}🔄 Activating mining...${colors.reset}`);
    const activated = await activateMining(address, proxy);
    
    if (activated) {
      console.log(`${colors.green}✅ Mining successfully activated for ${shortAddress}${colors.reset}`);

      try {
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp} - Activated mining for ${address}\n`;
        fs.appendFileSync('./mining_activations.log', logEntry);
      } catch (err) {
      }
      
      return true;
    } else {
      console.log(`${colors.red}❌ Failed to activate mining for ${shortAddress}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error processing mining: ${error.message}${colors.reset}`);
    return false;
  }
}

async function processAllWallets() {
  try {
    const wallets = loadWallets();
    const proxies = loadProxies();
    
    console.log(`\n${colors.cyan}🔹 MINING ACTIVATION PROCESS${colors.reset}`);
    console.log(`${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
    
    let successCount = 0;
    
    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null;
      
      const success = await processMining(wallet, proxy, i);
      
      if (success) {
        successCount++;
      }
      
      if (i < wallets.length - 1) {
        const delay = 5000 + Math.floor(Math.random() * 10000);
        console.log(`${colors.yellow}⏳ Waiting ${delay/1000} seconds before next wallet...${colors.reset}`);
        await sleep(delay);
      }
    }
    
    console.log(`\n${colors.bright}${colors.green}=== Mining activation completed ===${colors.reset}`);
    console.log(`${colors.green}🎉 Successfully activated mining for ${successCount}/${wallets.length} wallets${colors.reset}`);
    
    return successCount;
  } catch (error) {
    console.error(`${colors.red}❌ Processing error: ${error}${colors.reset}`);
    return 0;
  }
}

async function displayUserBalances() {
  try {
    const wallets = loadWallets();
    const proxies = loadProxies();
    
    console.log(`\n${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}🔹 USER BALANCES AND MINING STATUS${colors.reset}`);
    console.log(`${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
    
    for (let i = 0; i < wallets.length; i++) {
      const wallet = new ethers.Wallet(wallets[i]);
      const address = wallet.address;
      const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
      const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null;
      
      const userData = await getUserData(address, proxy);
      
      if (userData) {
        console.log(`${colors.cyan}Wallet #${i+1}: ${shortAddress}${colors.reset}`);
        console.log(`${colors.green}Points: ${parseFloat(userData.realtimePoints).toFixed(2)}${colors.reset}`);
        console.log(`${colors.green}Session Points: ${parseFloat(userData.sessionPoints).toFixed(2)}${colors.reset}`);
        console.log(`${colors.yellow}Last Active: ${new Date(userData.lastActive).toLocaleString()}${colors.reset}`);
        console.log(`${colors.yellow}Activation Count: ${userData.activationCount}${colors.reset}`);
        console.log(`${colors.cyan}${'-'.repeat(40)}${colors.reset}`);
      } else {
        console.log(`${colors.red}❌ Failed to fetch data for wallet #${i+1}: ${shortAddress}${colors.reset}`);
      }

      await sleep(1000);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error displaying user balances: ${error.message}${colors.reset}`);
  }
}

async function main() {
  try {
    displayBanner();

    await processAllWallets();

    let lastActivationTime = Date.now();
    const reactivationIntervalMs = 12 * 60 * 60 * 1000; 

    console.log(`\n${colors.bright}${colors.cyan}=== Starting continuous balance monitoring ===${colors.reset}`);
    console.log(`${colors.yellow}ℹ️ User balances will be checked every 25 seconds${colors.reset}`);
    console.log(`${colors.yellow}ℹ️ Mining will be reactivated every 12 hours${colors.reset}`);

    const balanceCheckIntervalMs = 25000; 

    while (true) {
      await displayUserBalances();

      const currentTime = Date.now();
      const timeSinceLastActivation = currentTime - lastActivationTime;
      const timeUntilNextActivation = reactivationIntervalMs - timeSinceLastActivation;
      
      if (timeSinceLastActivation >= reactivationIntervalMs) {
        console.log(`\n${colors.bright}${colors.yellow}=== 12 hours passed - Reactivating mining ===${colors.reset}`);
        await processAllWallets();
        lastActivationTime = Date.now();
      } else {
        const hoursRemaining = Math.floor(timeUntilNextActivation / (60 * 60 * 1000));
        const minutesRemaining = Math.floor((timeUntilNextActivation % (60 * 60 * 1000)) / (60 * 1000));
        
        console.log(`\n${colors.yellow}⏳ Next balance check in 25 seconds...${colors.reset}`);
        console.log(`${colors.yellow}⏱️ Next mining reactivation in ${hoursRemaining}h ${minutesRemaining}m${colors.reset}`);
        
        await sleep(balanceCheckIntervalMs);
      }
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Main process error: ${error}${colors.reset}`);
    console.log(`${colors.yellow}⏳ Restarting mining activator in 1 minute...${colors.reset}`);
    await sleep(60000);
    main();
  }
}

process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Mining activator stopped by user.${colors.reset}`);
  process.exit(0);
});

main().catch(error => {
  console.error(`${colors.red}❌ Fatal error: ${error}${colors.reset}`);
});