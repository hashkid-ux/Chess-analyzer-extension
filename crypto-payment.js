// CRYPTO PAYMENT SYSTEM - WEB3 SUBSCRIPTION FOR CHESS ANALYZER
// Direct wallet integration - No website needed!
// Supports: MetaMask, WalletConnect, Coinbase Wallet, Trust Wallet

(function() {
    'use strict';

    console.log('💰 Chess Analyzer Pro - Crypto Payment System Loaded');

    // SUBSCRIPTION PLANS (prices in USD, converted to crypto)
    const SUBSCRIPTION_PLANS = {
        trial: {
            name: "Free Trial",
            duration: 7,
            price: 0,
            features: ["50 analyses/day", "Basic engines", "No auto-move"],
            icon: "🎯"
        },
        monthly: {
            name: "Monthly Pro",
            duration: 30,
            price: 9.99,
            features: ["Unlimited analyses", "All engines", "Auto-move", "Priority support"],
            icon: "⚡"
        },
        quarterly: {
            name: "Quarterly Pro",
            duration: 90,
            price: 24.99,
            savings: "17% OFF",
            features: ["Everything in Monthly", "3 months access", "Save $5"],
            icon: "🔥"
        },
        yearly: {
            name: "Yearly Pro",
            duration: 365,
            price: 79.99,
            savings: "33% OFF",
            features: ["Everything in Monthly", "12 months access", "Save $40"],
            icon: "👑",
            popular: true
        }
    };

    // SUPPORTED CRYPTOCURRENCIES
    const SUPPORTED_CRYPTOS = {
        ETH: {
            name: "Ethereum",
            symbol: "ETH",
            icon: "Ξ",
            chainId: "0x1", // Mainnet
            decimals: 18,
            paymentAddress: "0x0ef07a35cf6102b7aea434d9171a69bbea7c30b3" // Replace with your wallet
        },
        MATIC: {
            name: "Polygon",
            symbol: "MATIC",
            icon: "⬡",
            chainId: "0x89", // Polygon Mainnet
            decimals: 18,
            paymentAddress: "0x0ef07a35cf6102b7aea434d9171a69bbea7c30b3" // Replace with your wallet
        },
        BNB: {
            name: "BNB Chain",
            symbol: "BNB",
            icon: "◆",
            chainId: "0x38", // BSC Mainnet
            decimals: 18,
            paymentAddress: "0x0ef07a35cf6102b7aea434d9171a69bbea7c30b3" // Replace with your wallet
        },
        USDT: {
            name: "Tether (ERC-20)",
            symbol: "USDT",
            icon: "₮",
            chainId: "0x1",
            decimals: 6,
            contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT on Ethereum
            paymentAddress: "0x0ef07a35cf6102b7aea434d9171a69bbea7c30b3"
        },
        USDC: {
            name: "USD Coin",
            symbol: "USDC",
            icon: "$",
            chainId: "0x1",
            decimals: 6,
            contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC on Ethereum
            paymentAddress: "0x0ef07a35cf6102b7aea434d9171a69bbea7c30b3"
        }
    };

    // PAYMENT STATE
    let paymentState = {
        walletConnected: false,
        walletAddress: null,
        walletType: null,
        selectedPlan: null,
        selectedCrypto: "ETH",
        cryptoPrice: null,
        subscriptionStatus: null,
        expiryDate: null,
        analysisCount: 0,
        dailyLimit: 50
    };

    // WEB3 PROVIDER
    let web3Provider = null;

    // ============================================
    // SUBSCRIPTION CHECK & ENFORCEMENT
    // ============================================

    async function checkSubscription() {
        try {
            const stored = await chrome.storage.sync.get(['subscription', 'subscriptionExpiry', 'analysisCount', 'lastResetDate']);
            
            const now = Date.now();
            const expiry = stored.subscriptionExpiry || 0;
            
            // Reset daily count if new day
            const today = new Date().toDateString();
            if (stored.lastResetDate !== today) {
                await chrome.storage.sync.set({
                    analysisCount: 0,
                    lastResetDate: today
                });
                paymentState.analysisCount = 0;
            } else {
                paymentState.analysisCount = stored.analysisCount || 0;
            }

            if (expiry > now) {
                // Active subscription
                paymentState.subscriptionStatus = stored.subscription || 'monthly';
                paymentState.expiryDate = expiry;
                return true;
            } else {
                // Expired or no subscription
                paymentState.subscriptionStatus = 'trial';
                paymentState.expiryDate = null;
                return false;
            }

        } catch (error) {
            console.error('Error checking subscription:', error);
            return false;
        }
    }

    async function canAnalyze() {
        const hasActiveSubscription = await checkSubscription();

        if (hasActiveSubscription) {
            return true; // Unlimited for paid users
        }

        // Trial users - check daily limit
        if (paymentState.analysisCount >= paymentState.dailyLimit) {
            return false;
        }

        return true;
    }

    async function incrementAnalysisCount() {
        const hasActiveSubscription = await checkSubscription();
        
        if (!hasActiveSubscription) {
            paymentState.analysisCount++;
            await chrome.storage.sync.set({ analysisCount: paymentState.analysisCount });
        }
    }

    function getRemainingAnalyses() {
        if (paymentState.subscriptionStatus !== 'trial') {
            return Infinity; // Unlimited
        }
        return Math.max(0, paymentState.dailyLimit - paymentState.analysisCount);
    }

    // ============================================
    // WALLET CONNECTION
    // ============================================

    async function detectWallets() {
        const wallets = [];

        if (typeof window.ethereum !== 'undefined') {
            if (window.ethereum.isMetaMask) {
                wallets.push({ name: 'MetaMask', type: 'metamask', icon: '🦊', provider: window.ethereum });
            } else if (window.ethereum.isCoinbaseWallet) {
                wallets.push({ name: 'Coinbase Wallet', type: 'coinbase', icon: '💙', provider: window.ethereum });
            } else if (window.ethereum.isTrust) {
                wallets.push({ name: 'Trust Wallet', type: 'trust', icon: '🛡️', provider: window.ethereum });
            } else {
                wallets.push({ name: 'Web3 Wallet', type: 'generic', icon: '🔗', provider: window.ethereum });
            }
        }

        // WalletConnect support (requires library)
        if (typeof window.WalletConnect !== 'undefined') {
            wallets.push({ name: 'WalletConnect', type: 'walletconnect', icon: '🔗', provider: null });
        }

        return wallets;
    }

    async function connectWallet(walletType = 'metamask') {
        try {
            if (typeof window.ethereum === 'undefined') {
                throw new Error('No Web3 wallet detected! Please install MetaMask or another Web3 wallet.');
            }

            // Request account access
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found. Please unlock your wallet.');
            }

            web3Provider = window.ethereum;
            paymentState.walletConnected = true;
            paymentState.walletAddress = accounts[0];
            paymentState.walletType = walletType;

            console.log('✅ Wallet connected:', paymentState.walletAddress);
            
            // Save wallet info
            await chrome.storage.local.set({ 
                lastWalletAddress: paymentState.walletAddress,
                lastWalletType: walletType
            });

            return paymentState.walletAddress;

        } catch (error) {
            console.error('❌ Wallet connection failed:', error);
            throw error;
        }
    }

    async function disconnectWallet() {
        paymentState.walletConnected = false;
        paymentState.walletAddress = null;
        paymentState.walletType = null;
        web3Provider = null;

        await chrome.storage.local.remove(['lastWalletAddress', 'lastWalletType']);
        console.log('👋 Wallet disconnected');
    }

    async function switchNetwork(chainId) {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId }],
            });
            return true;
        } catch (error) {
            // Chain not added yet
            if (error.code === 4902) {
                console.log('Chain not added, please add it manually');
            }
            throw error;
        }
    }

    // ============================================
    // CRYPTO PRICE FETCHING
    // ============================================

    async function getCryptoPrice(crypto = 'ETH') {
        try {
            // Use CoinGecko API (free, no API key needed)
            const coinIds = {
                ETH: 'ethereum',
                MATIC: 'matic-network',
                BNB: 'binancecoin',
                USDT: 'tether',
                USDC: 'usd-coin'
            };

            const coinId = coinIds[crypto];
            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
            );

            const data = await response.json();
            const price = data[coinId]?.usd;

            if (!price) {
                throw new Error('Failed to fetch price');
            }

            paymentState.cryptoPrice = price;
            return price;

        } catch (error) {
            console.error('Error fetching crypto price:', error);
            // Fallback prices
            const fallbackPrices = {
                ETH: 3500,
                MATIC: 0.80,
                BNB: 320,
                USDT: 1.00,
                USDC: 1.00
            };
            return fallbackPrices[crypto] || 1;
        }
    }

    function calculateCryptoAmount(usdPrice, cryptoPrice) {
        return (usdPrice / cryptoPrice).toFixed(6);
    }

    // ============================================
    // PAYMENT PROCESSING
    // ============================================

    async function processPayment(plan, crypto) {
        try {
            if (!paymentState.walletConnected) {
                throw new Error('Please connect your wallet first!');
            }

            const planData = SUBSCRIPTION_PLANS[plan];
            const cryptoData = SUPPORTED_CRYPTOS[crypto];

            if (!planData || !cryptoData) {
                throw new Error('Invalid plan or crypto selection');
            }

            // Switch to correct network
            await switchNetwork(cryptoData.chainId);

            // Get current crypto price
            const cryptoPrice = await getCryptoPrice(crypto);
            const cryptoAmount = calculateCryptoAmount(planData.price, cryptoPrice);

            // Convert to wei (smallest unit)
            const amountInWei = (parseFloat(cryptoAmount) * Math.pow(10, cryptoData.decimals)).toString(16);

            let txHash;

            if (cryptoData.contractAddress) {
                // ERC-20 token transfer (USDT, USDC)
                txHash = await sendTokenPayment(
                    cryptoData.contractAddress,
                    cryptoData.paymentAddress,
                    amountInWei
                );
            } else {
                // Native crypto transfer (ETH, MATIC, BNB)
                txHash = await sendNativePayment(
                    cryptoData.paymentAddress,
                    amountInWei
                );
            }

            console.log('✅ Payment successful! TX:', txHash);

            // Activate subscription
            await activateSubscription(plan, txHash);

            return { success: true, txHash };

        } catch (error) {
            console.error('❌ Payment failed:', error);
            throw error;
        }
    }

    async function sendNativePayment(toAddress, amountInWei) {
        const transactionParameters = {
            to: toAddress,
            from: paymentState.walletAddress,
            value: '0x' + amountInWei,
        };

        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [transactionParameters],
        });

        return txHash;
    }

    async function sendTokenPayment(contractAddress, toAddress, amountInWei) {
        // ERC-20 transfer function signature
        const transferFunctionSignature = '0xa9059cbb';
        
        // Encode parameters
        const paddedAddress = toAddress.slice(2).padStart(64, '0');
        const paddedAmount = amountInWei.padStart(64, '0');
        
        const data = transferFunctionSignature + paddedAddress + paddedAmount;

        const transactionParameters = {
            to: contractAddress,
            from: paymentState.walletAddress,
            data: data,
        };

        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [transactionParameters],
        });

        return txHash;
    }

    async function activateSubscription(plan, txHash) {
        const planData = SUBSCRIPTION_PLANS[plan];
        const expiryDate = Date.now() + (planData.duration * 24 * 60 * 60 * 1000);

        await chrome.storage.sync.set({
            subscription: plan,
            subscriptionExpiry: expiryDate,
            subscriptionTxHash: txHash,
            subscriptionActivatedAt: Date.now()
        });

        paymentState.subscriptionStatus = plan;
        paymentState.expiryDate = expiryDate;

        console.log(`✅ ${planData.name} activated until ${new Date(expiryDate).toLocaleDateString()}`);
    }

    // ============================================
    // SUBSCRIPTION UI
    // ============================================

    function createSubscriptionOverlay() {
        if (document.getElementById('chess-analyzer-subscription')) {
            return; // Already exists
        }

        const overlay = document.createElement('div');
        overlay.id = 'chess-analyzer-subscription';

        overlay.innerHTML = `
            <style>
                #chess-analyzer-subscription {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.95);
                    backdrop-filter: blur(10px);
                    z-index: 10000000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Segoe UI', -apple-system, system-ui, sans-serif;
                    color: #fff;
                }

                .sub-modal {
                    background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%);
                    border-radius: 20px;
                    max-width: 900px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .sub-header {
                    padding: 30px;
                    text-align: center;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .sub-header h1 {
                    font-size: 32px;
                    margin-bottom: 10px;
                    background: linear-gradient(135deg, #00e676 0%, #00c853 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .sub-header p {
                    color: #888;
                    font-size: 14px;
                }

                .sub-status {
                    padding: 20px 30px;
                    background: rgba(0, 230, 118, 0.1);
                    border-bottom: 1px solid rgba(0, 230, 118, 0.2);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .sub-plans {
                    padding: 30px;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                }

                .plan-card {
                    background: rgba(0, 0, 0, 0.3);
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 24px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                }

                .plan-card:hover {
                    border-color: #00e676;
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(0, 230, 118, 0.3);
                }

                .plan-card.popular {
                    border-color: #00e676;
                    background: linear-gradient(145deg, rgba(0, 230, 118, 0.1) 0%, rgba(0, 200, 100, 0.05) 100%);
                }

                .plan-card.popular::before {
                    content: 'POPULAR';
                    position: absolute;
                    top: -12px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #00e676;
                    color: #000;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 1px;
                }

                .plan-icon {
                    font-size: 48px;
                    text-align: center;
                    margin-bottom: 16px;
                }

                .plan-name {
                    font-size: 18px;
                    font-weight: 700;
                    text-align: center;
                    margin-bottom: 8px;
                }

                .plan-price {
                    font-size: 32px;
                    font-weight: 900;
                    text-align: center;
                    color: #00e676;
                    margin-bottom: 4px;
                }

                .plan-duration {
                    text-align: center;
                    color: #888;
                    font-size: 12px;
                    margin-bottom: 16px;
                }

                .plan-features {
                    list-style: none;
                    padding: 0;
                    margin: 16px 0;
                }

                .plan-features li {
                    padding: 8px 0;
                    font-size: 13px;
                    color: #ccc;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .plan-features li::before {
                    content: '✓';
                    color: #00e676;
                    font-weight: 700;
                }

                .plan-savings {
                    background: rgba(255, 193, 7, 0.2);
                    border: 1px solid rgba(255, 193, 7, 0.4);
                    border-radius: 8px;
                    padding: 6px 12px;
                    text-align: center;
                    font-size: 11px;
                    font-weight: 700;
                    color: #ffc107;
                    margin-top: 12px;
                }

                .crypto-selector {
                    padding: 30px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .crypto-selector h3 {
                    font-size: 16px;
                    margin-bottom: 16px;
                    color: #00e676;
                }

                .crypto-options {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                    gap: 12px;
                }

                .crypto-option {
                    background: rgba(255, 255, 255, 0.05);
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 16px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: center;
                }

                .crypto-option:hover {
                    border-color: #00e676;
                    background: rgba(0, 230, 118, 0.1);
                }

                .crypto-option.selected {
                    border-color: #00e676;
                    background: rgba(0, 230, 118, 0.2);
                }

                .crypto-icon {
                    font-size: 32px;
                    margin-bottom: 8px;
                }

                .crypto-name {
                    font-size: 13px;
                    font-weight: 600;
                    margin-bottom: 4px;
                }

                .crypto-price {
                    font-size: 11px;
                    color: #888;
                }

                .wallet-section {
                    padding: 30px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .wallet-btn {
                    width: 100%;
                    padding: 16px;
                    background: linear-gradient(135deg, #00e676 0%, #00c853 100%);
                    border: none;
                    border-radius: 12px;
                    color: #000;
                    font-size: 16px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .wallet-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0, 230, 118, 0.4);
                }

                .wallet-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .close-btn {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    color: #fff;
                    font-size: 20px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .close-btn:hover {
                    background: rgba(255, 107, 107, 0.8);
                }

                .info-banner {
                    padding: 16px;
                    background: rgba(33, 150, 243, 0.1);
                    border: 1px solid rgba(33, 150, 243, 0.3);
                    border-radius: 12px;
                    margin-bottom: 20px;
                    font-size: 13px;
                    color: #2196f3;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .warning-banner {
                    padding: 16px;
                    background: rgba(255, 152, 0, 0.1);
                    border: 1px solid rgba(255, 152, 0, 0.3);
                    border-radius: 12px;
                    margin-bottom: 20px;
                    font-size: 12px;
                    color: #ff9800;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
            </style>

            <div class="sub-modal">
                <button class="close-btn" onclick="document.getElementById('chess-analyzer-subscription').remove()">✕</button>
                
                <div class="sub-header">
                    <h1>♟️ Upgrade to Pro</h1>
                    <p>Choose your plan and pay with crypto - No credit card needed!</p>
                </div>

                <div class="sub-status" id="sub-status">
                    <div>
                        <strong>Current Plan:</strong> <span id="current-plan">Trial</span>
                    </div>
                    <div>
                        <strong>Analyses Left:</strong> <span id="analyses-left">--</span>
                    </div>
                </div>

                <div class="sub-plans" id="sub-plans">
                    <!-- Plans will be injected here -->
                </div>

                <div class="crypto-selector">
                    <div class="warning-banner">
                        <span>⚠️</span>
                        <span><strong>Educational Use Only:</strong> This tool is designed for learning and practicing against bots. Using auto-move in live/rated games violates fair play policies.</span>
                    </div>
                    
                    <h3>💰 Select Payment Method</h3>
                    <div class="info-banner">
                        <span>ℹ️</span>
                        <span>Crypto payments are instant, secure, and anonymous. Connect your wallet to continue.</span>
                    </div>
                    <div class="crypto-options" id="crypto-options">
                        <!-- Crypto options will be injected here -->
                    </div>
                </div>

                <div class="wallet-section">
                    <button class="wallet-btn" id="payment-btn" disabled>
                        🔗 Connect Wallet to Continue
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        populateSubscriptionUI();
    }

    async function populateSubscriptionUI() {
        const plansContainer = document.getElementById('sub-plans');
        const cryptoContainer = document.getElementById('crypto-options');
        const currentPlanEl = document.getElementById('current-plan');
        const analysesLeftEl = document.getElementById('analyses-left');
        const paymentBtn = document.getElementById('payment-btn');

        // Update current status
        await checkSubscription();
        currentPlanEl.textContent = SUBSCRIPTION_PLANS[paymentState.subscriptionStatus]?.name || 'Trial';
        analysesLeftEl.textContent = getRemainingAnalyses() === Infinity ? '∞' : getRemainingAnalyses();

        // Render plans
        plansContainer.innerHTML = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => `
            <div class="plan-card ${plan.popular ? 'popular' : ''}" data-plan="${key}">
                <div class="plan-icon">${plan.icon}</div>
                <div class="plan-name">${plan.name}</div>
                <div class="plan-price">$${plan.price.toFixed(2)}</div>
                <div class="plan-duration">${plan.duration} days</div>
                <ul class="plan-features">
                    ${plan.features.map(f => `<li>${f}</li>`).join('')}
                </ul>
                ${plan.savings ? `<div class="plan-savings">${plan.savings}</div>` : ''}
            </div>
        `).join('');

        // Render crypto options
        cryptoContainer.innerHTML = Object.entries(SUPPORTED_CRYPTOS).map(([key, crypto]) => `
            <div class="crypto-option" data-crypto="${key}">
                <div class="crypto-icon">${crypto.icon}</div>
                <div class="crypto-name">${crypto.name}</div>
                <div class="crypto-price" id="price-${key}">Loading...</div>
            </div>
        `).join('');

        // Load crypto prices
        for (const [key] of Object.entries(SUPPORTED_CRYPTOS)) {
            getCryptoPrice(key).then(price => {
                document.getElementById(`price-${key}`).textContent = `$${price.toFixed(2)}`;
            });
        }

        // Event listeners
        document.querySelectorAll('.plan-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.plan-card').forEach(c => c.style.borderColor = 'rgba(255, 255, 255, 0.1)');
                card.style.borderColor = '#00e676';
                paymentState.selectedPlan = card.dataset.plan;
                updatePaymentButton();
            });
        });

        document.querySelectorAll('.crypto-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.crypto-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                paymentState.selectedCrypto = option.dataset.crypto;
                updatePaymentButton();
            });
        });

        // Select first crypto by default
        document.querySelector('.crypto-option')?.click();

        // Payment button
        paymentBtn.addEventListener('click', handlePaymentClick);
    }

    function updatePaymentButton() {
        const btn = document.getElementById('payment-btn');
        
        if (!paymentState.selectedPlan || paymentState.selectedPlan === 'trial') {
            btn.disabled = true;
            btn.textContent = '🔗 Select a Plan';
            return;
        }

        const plan = SUBSCRIPTION_PLANS[paymentState.selectedPlan];

        if (!paymentState.walletConnected) {
            btn.disabled = false;
            btn.textContent = `🔗 Connect Wallet - $${plan.price}`;
        } else {
            btn.disabled = false;
            btn.textContent = `💳 Pay $${plan.price} with ${paymentState.selectedCrypto}`;
        }
    }

    async function handlePaymentClick() {
        const btn = document.getElementById('payment-btn');
        const originalText = btn.textContent;

        try {
            btn.disabled = true;

            if (!paymentState.walletConnected) {
                // Step 1: Connect wallet
                btn.textContent = '🔗 Connecting wallet...';
                await connectWallet();
                btn.textContent = '✅ Wallet Connected!';
                setTimeout(() => updatePaymentButton(), 1000);
                return;
            }

            // Step 2: Process payment
            const plan = SUBSCRIPTION_PLANS[paymentState.selectedPlan];
            btn.textContent = `⏳ Processing payment... (${plan.price})`;

            const result = await processPayment(paymentState.selectedPlan, paymentState.selectedCrypto);

            if (result.success) {
                btn.textContent = '✅ Payment Successful!';
                btn.style.background = 'linear-gradient(135deg, #00e676 0%, #00c853 100%)';
                
                setTimeout(() => {
                    showSuccessMessage(result.txHash);
                    document.getElementById('chess-analyzer-subscription').remove();
                    
                    // Reload analyzer with pro features
                    if (window.chessSmartAnalyzer) {
                        window.chessSmartAnalyzer.enableAutoMove();
                    }
                }, 2000);
            }

        } catch (error) {
            console.error('Payment error:', error);
            btn.textContent = '❌ ' + (error.message || 'Payment failed');
            btn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ff4646 100%)';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
                btn.disabled = false;
            }, 3000);
        }
    }

    function showSuccessMessage(txHash) {
        const success = document.createElement('div');
        success.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%);
            border: 2px solid #00e676;
            border-radius: 20px;
            padding: 40px;
            z-index: 10000001;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 230, 118, 0.4);
            min-width: 400px;
        `;

        success.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
            <h2 style="font-size: 24px; color: #00e676; margin-bottom: 10px;">Payment Successful!</h2>
            <p style="color: #888; margin-bottom: 20px;">Your subscription is now active</p>
            <div style="background: rgba(0, 230, 118, 0.1); padding: 12px; border-radius: 10px; margin-bottom: 20px;">
                <div style="font-size: 12px; color: #00e676; margin-bottom: 6px;">Transaction Hash:</div>
                <div style="font-size: 10px; color: #ccc; font-family: monospace; word-break: break-all;">${txHash}</div>
            </div>
            <button onclick="this.parentElement.remove()" style="
                padding: 12px 32px;
                background: linear-gradient(135deg, #00e676 0%, #00c853 100%);
                border: none;
                border-radius: 10px;
                color: #000;
                font-weight: 700;
                cursor: pointer;
                font-size: 14px;
            ">Start Analyzing! 🚀</button>
        `;

        document.body.appendChild(success);

        setTimeout(() => success.remove(), 10000);
    }

    // ============================================
    // INTEGRATE WITH ANALYZER
    // ============================================

    // Override analyze function to check subscription
    const originalAnalyze = window.chessSmartAnalyzer?.analyze;
    if (originalAnalyze) {
        window.chessSmartAnalyzer.analyze = async function() {
            const canUse = await canAnalyze();
            
            if (!canUse) {
                showUpgradePrompt();
                return;
            }

            await incrementAnalysisCount();
            return originalAnalyze.call(this);
        };
    }

    function showUpgradePrompt() {
        const prompt = document.createElement('div');
        prompt.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%);
            border: 2px solid #ff9800;
            border-radius: 20px;
            padding: 40px;
            z-index: 10000001;
            text-align: center;
            box-shadow: 0 20px 60px rgba(255, 152, 0, 0.4);
            min-width: 400px;
        `;

        const remaining = getRemainingAnalyses();

        prompt.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
            <h2 style="font-size: 24px; color: #ff9800; margin-bottom: 10px;">Daily Limit Reached</h2>
            <p style="color: #888; margin-bottom: 20px;">You've used all ${paymentState.dailyLimit} free analyses for today</p>
            <div style="background: rgba(0, 230, 118, 0.1); padding: 16px; border-radius: 10px; margin-bottom: 20px;">
                <p style="color: #00e676; font-size: 14px; font-weight: 600;">✨ Upgrade to Pro for:</p>
                <ul style="list-style: none; padding: 0; margin: 12px 0 0 0; color: #ccc; font-size: 13px;">
                    <li style="padding: 6px 0;">✓ Unlimited analyses</li>
                    <li style="padding: 6px 0;">✓ All engines available</li>
                    <li style="padding: 6px 0;">✓ Auto-move feature</li>
                    <li style="padding: 6px 0;">✓ Priority support</li>
                </ul>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="this.parentElement.parentElement.remove()" style="
                    padding: 12px 24px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                    color: #fff;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 14px;
                ">Maybe Later</button>
                <button id="upgrade-now-btn" style="
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #00e676 0%, #00c853 100%);
                    border: none;
                    border-radius: 10px;
                    color: #000;
                    font-weight: 700;
                    cursor: pointer;
                    font-size: 14px;
                ">Upgrade Now 🚀</button>
            </div>
        `;

        document.body.appendChild(prompt);

        document.getElementById('upgrade-now-btn').addEventListener('click', () => {
            prompt.remove();
            createSubscriptionOverlay();
        });

        setTimeout(() => prompt.remove(), 15000);
    }

    // ============================================
    // SUBSCRIPTION STATUS BADGE
    // ============================================

    function createSubscriptionBadge() {
        if (document.getElementById('subscription-badge')) return;

        const badge = document.createElement('div');
        badge.id = 'subscription-badge';
        badge.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%);
            border: 1px solid rgba(0, 230, 118, 0.3);
            border-radius: 12px;
            padding: 12px 16px;
            z-index: 999998;
            font-family: 'Segoe UI', -apple-system, system-ui, sans-serif;
            color: #fff;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        `;

        badge.addEventListener('mouseenter', () => {
            badge.style.transform = 'translateY(-2px)';
            badge.style.boxShadow = '0 8px 24px rgba(0, 230, 118, 0.3)';
        });

        badge.addEventListener('mouseleave', () => {
            badge.style.transform = 'translateY(0)';
            badge.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
        });

        badge.addEventListener('click', () => {
            createSubscriptionOverlay();
        });

        updateSubscriptionBadge(badge);
        document.body.appendChild(badge);

        // Update every 30 seconds
        setInterval(() => updateSubscriptionBadge(badge), 30000);
    }

    async function updateSubscriptionBadge(badge) {
        await checkSubscription();

        const remaining = getRemainingAnalyses();
        const plan = SUBSCRIPTION_PLANS[paymentState.subscriptionStatus];

        if (paymentState.subscriptionStatus === 'trial') {
            badge.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 20px;">${plan.icon}</div>
                    <div>
                        <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Free Trial</div>
                        <div style="font-size: 14px; font-weight: 700; color: ${remaining < 10 ? '#ff9800' : '#00e676'};">
                            ${remaining} / ${paymentState.dailyLimit} left
                        </div>
                    </div>
                    <div style="font-size: 16px; opacity: 0.5;">⚡</div>
                </div>
            `;
            badge.style.borderColor = remaining < 10 ? 'rgba(255, 152, 0, 0.5)' : 'rgba(255, 255, 255, 0.1)';
        } else {
            const daysLeft = Math.ceil((paymentState.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
            badge.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 20px;">${plan.icon}</div>
                    <div>
                        <div style="font-size: 11px; color: #00e676; text-transform: uppercase; letter-spacing: 0.5px;">Pro Active</div>
                        <div style="font-size: 14px; font-weight: 700; color: #fff;">
                            ${daysLeft} days left
                        </div>
                    </div>
                    <div style="font-size: 16px;">✓</div>
                </div>
            `;
            badge.style.borderColor = 'rgba(0, 230, 118, 0.5)';
        }
    }

    // ============================================
    // AUTO-MOVE LOCK FOR NON-SUBSCRIBERS
    // ============================================

    const originalEnableAutoMove = window.chessSmartAnalyzer?.enableAutoMove;
    if (originalEnableAutoMove) {
        window.chessSmartAnalyzer.enableAutoMove = async function() {
            const hasSubscription = await checkSubscription();
            
            if (!hasSubscription || paymentState.subscriptionStatus === 'trial') {
                showFeatureLockedPrompt('Auto-Move');
                return false;
            }

            return originalEnableAutoMove.call(this);
        };
    }

    function showFeatureLockedPrompt(featureName) {
        const prompt = document.createElement('div');
        prompt.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%);
            border: 2px solid #8b5cf6;
            border-radius: 20px;
            padding: 40px;
            z-index: 10000001;
            text-align: center;
            box-shadow: 0 20px 60px rgba(139, 92, 246, 0.4);
            min-width: 400px;
        `;

        prompt.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 20px;">🔒</div>
            <h2 style="font-size: 24px; color: #8b5cf6; margin-bottom: 10px;">${featureName} - Pro Feature</h2>
            <p style="color: #888; margin-bottom: 20px;">This feature requires a Pro subscription</p>
            <div style="background: rgba(139, 92, 246, 0.1); padding: 16px; border-radius: 10px; margin-bottom: 20px;">
                <p style="color: #8b5cf6; font-size: 14px; margin-bottom: 10px;">
                    ${featureName} helps you learn by playing against bots automatically
                </p>
                <p style="color: #888; font-size: 12px;">
                    ⚠️ Educational use only - Never use in live/rated games
                </p>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="this.parentElement.parentElement.remove()" style="
                    padding: 12px 24px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                    color: #fff;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 14px;
                ">Cancel</button>
                <button id="unlock-feature-btn" style="
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                    border: none;
                    border-radius: 10px;
                    color: #fff;
                    font-weight: 700;
                    cursor: pointer;
                    font-size: 14px;
                ">Unlock with Pro 🔓</button>
            </div>
        `;

        document.body.appendChild(prompt);

        document.getElementById('unlock-feature-btn').addEventListener('click', () => {
            prompt.remove();
            createSubscriptionOverlay();
        });

        setTimeout(() => prompt.remove(), 10000);
    }

    // ============================================
    // PUBLIC API
    // ============================================

    window.chessAnalyzerPayment = {
        // Subscription management
        checkSubscription,
        canAnalyze,
        getRemainingAnalyses,
        
        // Wallet management
        connectWallet,
        disconnectWallet,
        getWalletAddress: () => paymentState.walletAddress,
        isWalletConnected: () => paymentState.walletConnected,
        
        // Payment
        processPayment,
        getCryptoPrice,
        
        // UI
        showSubscriptionModal: createSubscriptionOverlay,
        showUpgradePrompt,
        
        // Status
        getSubscriptionStatus: () => ({
            status: paymentState.subscriptionStatus,
            expiryDate: paymentState.expiryDate,
            analysisCount: paymentState.analysisCount,
            dailyLimit: paymentState.dailyLimit,
            remainingAnalyses: getRemainingAnalyses(),
            walletConnected: paymentState.walletConnected,
            walletAddress: paymentState.walletAddress
        })
    };

    // ============================================
    // INITIALIZATION
    // ============================================

    async function initializePaymentSystem() {
        console.log('💰 Initializing crypto payment system...');
        
        await checkSubscription();
        createSubscriptionBadge();
        
        // Try to reconnect last wallet
        const lastWallet = await chrome.storage.local.get(['lastWalletAddress', 'lastWalletType']);
        if (lastWallet.lastWalletAddress && typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.includes(lastWallet.lastWalletAddress)) {
                    paymentState.walletConnected = true;
                    paymentState.walletAddress = lastWallet.lastWalletAddress;
                    paymentState.walletType = lastWallet.lastWalletType;
                    console.log('✅ Wallet reconnected:', paymentState.walletAddress);
                }
            } catch (error) {
                console.log('Could not reconnect wallet');
            }
        }

        // Add keyboard shortcut to open subscription
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                createSubscriptionOverlay();
            }
        });

        console.log('✅ Payment system ready');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💡 SUBSCRIPTION SYSTEM FEATURES:');
        console.log('   💳 Crypto payments (ETH, MATIC, BNB, USDT, USDC)');
        console.log('   🔒 Auto-move locked for trial users');
        console.log('   📊 Daily limits enforced');
        console.log('   ⚡ Web3 wallet integration');
        console.log('   🎯 No website needed - all in extension');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔑 Keyboard Shortcut: Ctrl+Shift+P to open subscription');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    // Wait for analyzer to load, then initialize
    if (window.chessSmartAnalyzer) {
        initializePaymentSystem();
    } else {
        const checkInterval = setInterval(() => {
            if (window.chessSmartAnalyzer) {
                clearInterval(checkInterval);
                initializePaymentSystem();
            }
        }, 500);
    }

})();