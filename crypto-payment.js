// CRYPTO PAYMENT SYSTEM - WEB3 SUBSCRIPTION FOR CHESS ANALYZER
// Fixed version - Works in browser without Chrome extension APIs
// Direct wallet integration - No website needed!

(function() {
    'use strict';

    console.log('💰 Chess Analyzer Pro - Crypto Payment System Loaded');

    // SUBSCRIPTION PLANS
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
            chainId: "0xaa36a7",
            decimals: 18,
            paymentAddress: "0x616af75f01af269d6306a97a2e4b44edc84b5a08"
        },
        MATIC: {
            name: "Polygon",
            symbol: "MATIC",
            icon: "⬡",
            chainId: "0x89",
            decimals: 18,
            paymentAddress: "0x0ef07a35cf6102b7aea434d9171a69bbea7c30b3"
        },
        BNB: {
            name: "BNB Chain",
            symbol: "BNB",
            icon: "◆",
            chainId: "0x38",
            decimals: 18,
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

    let web3Provider = null;

    // ============================================
    // BROWSER STORAGE HELPERS (Replaces chrome.storage)
    // ============================================

    const Storage = {
        // Get data from localStorage
        get: async (keys) => {
            const result = {};
            const keyArray = Array.isArray(keys) ? keys : [keys];
            
            keyArray.forEach(key => {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    try {
                        result[key] = JSON.parse(value);
                    } catch {
                        result[key] = value;
                    }
                }
            });
            
            return result;
        },
        
        // Set data in localStorage
        set: async (data) => {
            Object.entries(data).forEach(([key, value]) => {
                localStorage.setItem(key, JSON.stringify(value));
            });
        },
        
        // Remove from localStorage
        remove: async (keys) => {
            const keyArray = Array.isArray(keys) ? keys : [keys];
            keyArray.forEach(key => localStorage.removeItem(key));
        }
    };

    // ============================================
    // SUBSCRIPTION CHECK & ENFORCEMENT
    // ============================================

    async function checkSubscription() {
        try {
            const stored = await Storage.get(['subscription', 'subscriptionExpiry', 'analysisCount', 'lastResetDate']);
            
            const now = Date.now();
            const expiry = stored.subscriptionExpiry || 0;
            
            // Reset daily count if new day
            const today = new Date().toDateString();
            if (stored.lastResetDate !== today) {
                await Storage.set({
                    analysisCount: 0,
                    lastResetDate: today
                });
                paymentState.analysisCount = 0;
            } else {
                paymentState.analysisCount = stored.analysisCount || 0;
            }

            if (expiry > now) {
                paymentState.subscriptionStatus = stored.subscription || 'monthly';
                paymentState.expiryDate = expiry;
                return true;
            } else {
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
            return true;
        }

        if (paymentState.analysisCount >= paymentState.dailyLimit) {
            return false;
        }

        return true;
    }

    async function incrementAnalysisCount() {
        const hasActiveSubscription = await checkSubscription();
        
        if (!hasActiveSubscription) {
            paymentState.analysisCount++;
            await Storage.set({ analysisCount: paymentState.analysisCount });
        }
    }

    function getRemainingAnalyses() {
        if (paymentState.subscriptionStatus !== 'trial') {
            return Infinity;
        }
        return Math.max(0, paymentState.dailyLimit - paymentState.analysisCount);
    }

    // ============================================
    // WALLET CONNECTION
    // ============================================

    async function connectWallet(walletType = 'metamask') {
        try {
            if (typeof window.ethereum === 'undefined') {
                throw new Error('No Web3 wallet detected! Please install MetaMask or another Web3 wallet.');
            }

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
            
            await Storage.set({ 
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

        await Storage.remove(['lastWalletAddress', 'lastWalletType']);
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
            const coinIds = {
                ETH: 'ethereum',
                MATIC: 'matic-network',
                BNB: 'binancecoin'
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
            const fallbackPrices = {
                ETH: 3500,
                MATIC: 0.80,
                BNB: 320
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

            await switchNetwork(cryptoData.chainId);

            const cryptoPrice = await getCryptoPrice(crypto);
            const cryptoAmount = calculateCryptoAmount(planData.price, cryptoPrice);

            const amountInWei = (parseFloat(cryptoAmount) * Math.pow(10, cryptoData.decimals)).toString(16);

            const txHash = await sendNativePayment(
                cryptoData.paymentAddress,
                amountInWei
            );

            console.log('✅ Payment successful! TX:', txHash);

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

    async function activateSubscription(plan, txHash) {
        const planData = SUBSCRIPTION_PLANS[plan];
        const expiryDate = Date.now() + (planData.duration * 24 * 60 * 60 * 1000);

        await Storage.set({
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
    // UI FUNCTIONS
    // ============================================

    function createSubscriptionOverlay() {
        if (document.getElementById('chess-analyzer-subscription')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'chess-analyzer-subscription';
        overlay.innerHTML = `
            <style>
                #chess-analyzer-subscription {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.95);
                    backdrop-filter: blur(10px);
                    z-index: 10000000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: system-ui, -apple-system, sans-serif;
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
                    position: relative;
                }
                .close-btn {
                    position: absolute;
                    top: 20px; right: 20px;
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    width: 40px; height: 40px;
                    border-radius: 50%;
                    color: #fff;
                    font-size: 20px;
                    cursor: pointer;
                }
                .close-btn:hover { background: rgba(255, 107, 107, 0.8); }
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
                    margin-top: 20px;
                }
                .wallet-btn:hover { transform: translateY(-2px); }
                .wallet-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            </style>
            <div class="sub-modal">
                <button class="close-btn" onclick="document.getElementById('chess-analyzer-subscription').remove()">✕</button>
                <div class="sub-header">
                    <h1>♟️ Upgrade to Pro</h1>
                    <p style="color: #888;">Choose your plan and pay with crypto</p>
                </div>
                <div style="padding: 30px;">
                    <div id="status-display"></div>
                    <div id="plans-display"></div>
                    <button class="wallet-btn" id="payment-btn">🔗 Connect Wallet to Continue</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        populateSubscriptionUI();
    }

    async function populateSubscriptionUI() {
        await checkSubscription();
        
        const statusDiv = document.getElementById('status-display');
        const remaining = getRemainingAnalyses();
        
        statusDiv.innerHTML = `
            <div style="background: rgba(0, 230, 118, 0.1); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between;">
                    <div><strong>Current Plan:</strong> ${SUBSCRIPTION_PLANS[paymentState.subscriptionStatus]?.name || 'Trial'}</div>
                    <div><strong>Analyses Left:</strong> ${remaining === Infinity ? '∞' : remaining}</div>
                </div>
            </div>
        `;

        const plansDiv = document.getElementById('plans-display');
        plansDiv.innerHTML = Object.entries(SUBSCRIPTION_PLANS)
            .filter(([key]) => key !== 'trial')
            .map(([key, plan]) => `
                <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 12px; margin-bottom: 12px; cursor: pointer; border: 2px solid transparent;" 
                     onclick="window.selectPlan('${key}')" 
                     data-plan="${key}">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 24px;">${plan.icon} ${plan.name}</div>
                            <div style="color: #888; font-size: 12px;">${plan.features.join(' • ')}</div>
                        </div>
                        <div style="font-size: 24px; font-weight: 900; color: #00e676;">$${plan.price}</div>
                    </div>
                    ${plan.savings ? `<div style="color: #ffc107; margin-top: 8px; font-size: 12px;">💰 ${plan.savings}</div>` : ''}
                </div>
            `).join('');

        document.getElementById('payment-btn').addEventListener('click', handlePaymentClick);
    }

    window.selectPlan = (plan) => {
        document.querySelectorAll('[data-plan]').forEach(el => {
            el.style.borderColor = 'transparent';
        });
        document.querySelector(`[data-plan="${plan}"]`).style.borderColor = '#00e676';
        paymentState.selectedPlan = plan;
    };

    async function handlePaymentClick() {
        const btn = document.getElementById('payment-btn');
        
        try {
            btn.disabled = true;

            if (!paymentState.walletConnected) {
                btn.textContent = '🔗 Connecting wallet...';
                await connectWallet();
                btn.textContent = '✅ Wallet Connected! Select a plan above';
                btn.disabled = false;
                return;
            }

            if (!paymentState.selectedPlan) {
                alert('Please select a plan first!');
                btn.disabled = false;
                return;
            }

            const plan = SUBSCRIPTION_PLANS[paymentState.selectedPlan];
            btn.textContent = `⏳ Processing payment... ($${plan.price})`;

            const result = await processPayment(paymentState.selectedPlan, 'ETH');

            if (result.success) {
                btn.textContent = '✅ Payment Successful!';
                setTimeout(() => {
                    document.getElementById('chess-analyzer-subscription').remove();
                    alert('Subscription activated! 🎉');
                }, 2000);
            }

        } catch (error) {
            console.error('Payment error:', error);
            btn.textContent = '❌ ' + (error.message || 'Payment failed');
            setTimeout(() => {
                btn.textContent = '🔗 Try Again';
                btn.disabled = false;
            }, 3000);
        }
    }

    // ============================================
    // BADGE
    // ============================================

    async function createSubscriptionBadge() {
        if (document.getElementById('subscription-badge')) return;

        const badge = document.createElement('div');
        badge.id = 'subscription-badge';
        badge.style.cssText = `
            position: fixed; top: 70px; right: 20px;
            background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%);
            border: 1px solid rgba(0, 230, 118, 0.3);
            border-radius: 12px; padding: 12px 16px;
            z-index: 999998; cursor: pointer;
            font-family: system-ui; color: #fff;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        `;

        badge.addEventListener('click', createSubscriptionOverlay);
        document.body.appendChild(badge);

        await updateSubscriptionBadge(badge);
        setInterval(() => updateSubscriptionBadge(badge), 30000);
    }

    async function updateSubscriptionBadge(badge) {
        await checkSubscription();
        const remaining = getRemainingAnalyses();
        const plan = SUBSCRIPTION_PLANS[paymentState.subscriptionStatus];

        badge.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-size: 20px;">${plan.icon}</div>
                <div>
                    <div style="font-size: 11px; color: #888; text-transform: uppercase;">${plan.name}</div>
                    <div style="font-size: 14px; font-weight: 700; color: ${remaining < 10 ? '#ff9800' : '#00e676'};">
                        ${remaining === Infinity ? '∞ Unlimited' : `${remaining} / ${paymentState.dailyLimit} left`}
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    async function initializePaymentSystem() {
        console.log('💰 Initializing crypto payment system...');
        
        await checkSubscription();
        await createSubscriptionBadge();
        
        // Try reconnect wallet
        const lastWallet = await Storage.get(['lastWalletAddress', 'lastWalletType']);
        if (lastWallet.lastWalletAddress && typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.includes(lastWallet.lastWalletAddress)) {
                    paymentState.walletConnected = true;
                    paymentState.walletAddress = lastWallet.lastWalletAddress;
                    console.log('✅ Wallet reconnected');
                }
            } catch (error) {
                console.log('Could not reconnect wallet');
            }
        }

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                createSubscriptionOverlay();
            }
        });

        console.log('✅ Payment system ready');
        console.log('🔑 Press Ctrl+Shift+P to open subscription');
    }

    // Wait for page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePaymentSystem);
    } else {
        initializePaymentSystem();
    }

    // Export API
    window.chessAnalyzerPayment = {
        checkSubscription,
        canAnalyze,
        connectWallet,
        showSubscriptionModal: createSubscriptionOverlay,
        getStatus: () => ({
            status: paymentState.subscriptionStatus,
            remaining: getRemainingAnalyses(),
            walletConnected: paymentState.walletConnected
        })
    };

})();