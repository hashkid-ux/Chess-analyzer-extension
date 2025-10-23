// CHESS SMART ANALYZER PRO - ULTRA-FAST VERSION
// Fixed: Icons display properly, instant FEN detection, no missed moves

!async function() {
    "use strict";
    
    console.log("🚀 Chess Smart Analyzer + Ultra-Fast Auto-Analysis");
    console.warn("⚠️ Auto-move is for LEARNING ONLY - Not for live games!");

    // ENGINE LIMITS
    const ENGINE_LIMITS = {
        stockfish: { maxDepth: 15, maxMoves: 30, name: "Stockfish Online" },
        chessapi: { maxDepth: 20, maxMoves: 20, name: "Chess-API.com" },
        lichess: { maxDepth: 20, maxMoves: 40, name: "Lichess Cloud" },
        chessdb: { maxDepth: 20, maxMoves: 999, name: "ChessDB" },
        custom: { maxDepth: 20, maxMoves: 999, name: "Custom Engine" },
        local: { maxDepth: 25, maxMoves: 999, name: "Local Engine" }
    };

    // CONFIGURATION
    let config = {
        engines: {
            stockfish: {
                name: "Stockfish Online",
                endpoint: "https://stockfish.online/api/s/v2.php",
                color: "#3b82f6",
                icon: "🐟",
                format: "stockfish",
                maxDepth: 24
            },
            lichess: {
                name: "Lichess Cloud",
                endpoint: "https://lichess.org/api/cloud-eval",
                color: "#10b981",
                icon: "♟️",
                format: "lichess",
                maxDepth: 20
            },
            chessdb: {
                name: "ChessDB",
                endpoint: "https://www.chessdb.cn/cdb.php",
                color: "#f59e0b",
                icon: "📚",
                format: "chessdb",
                maxDepth: 18
            },
            chessapi: {
                name: "Chess-API.com",
                endpoint: "https://chess-api.com/v1",
                color: "#00e676",
                icon: "🦆",
                format: "postApi",
                maxDepth: 18
            },
            custom: {
                name: "Custom Engine",
                endpoint: "",
                color: "#8b5cf6",
                icon: "⚙️",
                format: "stockfish",
                maxDepth: 20
            },
            local: {
                name: "Local Engine",
                endpoint: "http://localhost:8080/analyze",
                color: "#ec4899",
                icon: "🏠",
                format: "stockfish",
                maxDepth: 25
            }
        },
        currentEngine: "stockfish",
        
        depthProfiles: {
            bullet: { base: 10, max: 12, timePerMove: 500, color: "#ff5722" },
            blitz: { base: 12, max: 15, timePerMove: 800, color: "#ffc107" },
            rapid: { base: 15, max: 18, timePerMove: 1500, color: "#4caf50" },
            classical: { base: 18, max: 22, timePerMove: 3000, color: "#2196f3" },
            daily: { base: 20, max: 24, timePerMove: 5000, color: "#9c27b0" },
            unlimited: { base: 18, max: 20, timePerMove: 2000, color: "#607d8b" }
        },
        
        // ULTRA-FAST SETTINGS - NO DELAYS!
        debounceMs: 0,  // Was 100ms - NOW INSTANT!
        minTimeBetweenAnalyses: 50,  // Was 150ms - NOW 50ms ONLY!
        fenCheckInterval: 10,  // Check FEN every 10ms!
        
        visualFeedback: "subtle",
        overlayZIndex: 999999,
        autoDetectTimeControl: true,
        
        autoMove: {
            enabled: false,
            onlyMyTurn: true,
            safetyMode: true,
            minDelay: 0,
            maxDelay: 0.2,
            humanize: true,
            confirmFirst: true,
            blockLiveGames: true,
            autoMovesCount: 0,
            moveSpeed: "normal"
        },
        
        moveSpeedProfiles: {
            slow: { dragSteps: 22, stepDelay: 28, arcMultiplier: 1.3, holdTime: 180 },
            normal: { dragSteps: 12, stepDelay: 15, arcMultiplier: 0.9, holdTime: 70 },
            fast: { dragSteps: 7, stepDelay: 8, arcMultiplier: 0.5, holdTime: 30 },
            instant: { dragSteps: 3, stepDelay: 2, arcMultiplier: 0.1, holdTime: 10 }
        }
    };

    // STATE
    let state = {
        overlay: null,
        lastFEN: null,
        lastMoveCount: 0,
        analyzing: false,
        currentTimeControl: "blitz",
        cache: new Map(),
        observers: [],
        isMinimized: false,
        lastBestMove: null,
        myColor: null,
        autoMovePending: false,
        
        // ULTRA-FAST FEN TRACKING
        fenCache: { fen: null, timestamp: 0, ttl: 10 },  // Was 50ms - NOW 10ms!
        boardCache: { element: null, lastCheck: 0, checkInterval: 1000 },
        turnCache: { isMyTurn: false, lastFEN: null },
        
        lastProcessTime: 0,
        analysisController: null,
        currentAnalysisId: 0,
        lastAnalyzedFEN: null,
        
        // NEW: Real-time FEN monitoring
        fenMonitorInterval: null,
        lastKnownFEN: null,
        consecutiveFENChecks: 0
    };

    // ZERO STABILITY WAIT - Analyze IMMEDIATELY!
    const STABILITY_WAIT = {
        bullet: 0,      // Was 80ms - NOW INSTANT!
        blitz: 0,       // Was 120ms - NOW INSTANT!
        rapid: 0,       // Was 180ms - NOW INSTANT!
        classical: 50,  // Was 250ms - NOW 50ms only
        daily: 100,     // Was 300ms - NOW 100ms
        unlimited: 0    // Was 150ms - NOW INSTANT!
    };

    // ============================================
    // ULTRA-FAST FEN DETECTOR
    // ============================================
    function startRealTimeFENMonitor() {
        // Stop existing monitor
        if (state.fenMonitorInterval) {
            clearInterval(state.fenMonitorInterval);
        }

        console.log("🚀 Starting ULTRA-FAST FEN monitor (checks every 10ms)");

        // Check FEN every 10ms for instant detection
        state.fenMonitorInterval = setInterval(() => {
            const currentFEN = extractFEN(true);
            
            if (!currentFEN) return;

            // FEN CHANGED! Process immediately!
            if (currentFEN !== state.lastKnownFEN) {
                console.log("⚡ FEN CHANGED INSTANTLY DETECTED!");
                console.log("Old:", state.lastKnownFEN?.substring(0, 30));
                console.log("New:", currentFEN.substring(0, 30));
                
                state.lastKnownFEN = currentFEN;
                state.consecutiveFENChecks = 0;
                
                // ANALYZE INSTANTLY - NO DELAY!
                processGameStateInstant();
            } else {
                state.consecutiveFENChecks++;
            }
        }, config.fenCheckInterval);
    }

    function stopRealTimeFENMonitor() {
        if (state.fenMonitorInterval) {
            clearInterval(state.fenMonitorInterval);
            state.fenMonitorInterval = null;
            console.log("⏹️ FEN monitor stopped");
        }
    }

    // ============================================
    // INSTANT GAME STATE PROCESSOR (NO DELAYS!)
    // ============================================
    function processGameStateInstant() {
        try {
            const fen = extractFEN(true);
            const moveCount = getMoveCount();
            const turnText = getPlayerToMove(fen);
            
            const moveCountChanged = moveCount !== state.lastMoveCount;
            const fenChanged = fen !== state.lastFEN;

            if (!fen) return;

            // Update immediately
            updateMoveDisplay(moveCount);
            updateDepthDisplay();

            // New game detection
            if (state.lastMoveCount > 0 && moveCount === 0 && fen) {
                console.log("🆕 New game detected - resetting");
                resetAnalyzerState();
                showStatus("New game - ready", turnText);
            }

            // FEN or move changed - ANALYZE INSTANTLY!
            if (fenChanged || moveCountChanged) {
                state.lastFEN = fen;
                state.lastMoveCount = moveCount;
                
                // CANCEL OLD ANALYSIS IMMEDIATELY
                if (state.analysisController) {
                    state.analysisController.abort();
                    state.analysisController = null;
                }
                
                // START NEW ANALYSIS - NO WAITING!
                console.log("⚡ INSTANT ANALYSIS START");
                analyzePosition(fen, moveCount, turnText);
            }

        } catch (error) {
            console.error("Game state processing error:", error);
        }
    }

    // ============================================
    // INSTANT ANALYSIS (NO DEBOUNCE!)
    // ============================================
    async function analyzePosition(fen, moveCount, turnText) {
        if (!fen) return;

        // ABORT OLD ANALYSIS INSTANTLY
        if (state.analysisController) {
            state.analysisController.abort();
            state.analysisController = null;
        }

        state.currentAnalysisId++;
        const thisAnalysisId = state.currentAnalysisId;

        state.analyzing = true;
        state.analysisController = new AbortController();

        try {
            showStatus("Analyzing...", turnText, "analyzing");
            
            const depth = calculateDepth();
            const signal = state.analysisController.signal;

            // ULTRA-FAST MODE: Analyze at lower depth first for instant feedback
            if (state.currentTimeControl === "bullet" || state.currentTimeControl === "blitz") {
                const quickDepth = state.currentTimeControl === "bullet" ? 6 : 8;
                const quickResult = await callEngine(fen, quickDepth, signal);

                // Check if still valid
                if (thisAnalysisId !== state.currentAnalysisId) {
                    console.log("⏭️ Quick analysis outdated - skipping");
                    return;
                }

                const currentFEN = extractFEN();
                if (currentFEN !== fen) {
                    console.log("⏭️ Position changed during quick analysis");
                    return;
                }

                if (quickResult && quickResult.bestMoveUCI) {
                    displayResult(quickResult, turnText, true);
                    state.lastBestMove = quickResult.bestMoveUCI;

                    // Auto-move if enabled
                    if (config.autoMove.enabled && !state.autoMovePending && isMyTurn()) {
                        state.autoMovePending = true;
                        const delay = config.autoMove.minDelay * 1000;
                        setTimeout(async () => {
                            if (config.autoMove.onlyMyTurn && !isMyTurn()) {
                                state.autoMovePending = false;
                                return;
                            }
                            await executeAutoMove(quickResult.bestMoveUCI);
                            state.autoMovePending = false;
                        }, delay);
                    }
                }
            }

            // FULL DEPTH ANALYSIS
            const fullResult = await callEngine(fen, depth, signal);

            // Check if still valid
            if (thisAnalysisId !== state.currentAnalysisId) {
                console.log("⏭️ Full analysis outdated - skipping");
                return;
            }

            const currentFEN = extractFEN();
            if (currentFEN !== fen) {
                console.log("⏭️ Position changed during full analysis");
                return;
            }

            if (fullResult && fullResult.bestMoveUCI) {
                state.lastAnalyzedFEN = fen;
                displayResult(fullResult, turnText, false);
                state.lastBestMove = fullResult.bestMoveUCI;

                // Auto-move for slower time controls
                if (config.autoMove.enabled && !state.autoMovePending && 
                    state.currentTimeControl !== "bullet" && state.currentTimeControl !== "blitz") {
                    
                    if (config.autoMove.onlyMyTurn && !isMyTurn()) {
                        console.log("⏸️ Not our turn - skipping auto-move");
                        return;
                    }

                    state.autoMovePending = true;
                    const randomDelay = config.autoMove.minDelay + 
                        Math.random() * (config.autoMove.maxDelay - config.autoMove.minDelay);
                    
                    setTimeout(async () => {
                        if (config.autoMove.onlyMyTurn && !isMyTurn()) {
                            state.autoMovePending = false;
                            return;
                        }
                        await executeAutoMove(fullResult.bestMoveUCI);
                        state.autoMovePending = false;
                    }, randomDelay * 1000);
                }
            } else {
                showStatus("Analysis failed", turnText, "error");
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log("✅ Analysis cancelled successfully");
            } else {
                console.error("Analysis error:", error);
                showStatus("Analysis error", turnText, "error");
            }
        } finally {
            state.analyzing = false;
            state.analysisController = null;
        }
    }

    // ============================================
    // ENGINE CALL WITH AUTO-SWITCHING
    // ============================================
    async function callEngine(fen, depth, abortSignal = null) {
        const moveCount = getMoveCount();
        
        // Auto-switch engine if needed
        let engineToUse = autoSwitchEngineIfNeeded(config.currentEngine, moveCount, depth);
        
        if (!engineToUse) {
            console.error("❌ No suitable engine available");
            showStatus("Position too complex for available engines", "", "error");
            return null;
        }

        const cacheKey = `${engineToUse}|${fen}|${depth}`;

        // Check cache
        if (state.cache.has(cacheKey)) {
            console.log("💾 Cache hit!");
            return state.cache.get(cacheKey);
        }

        try {
            const engine = config.engines[engineToUse];
            let url = "";
            let options = {
                signal: abortSignal || (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? 
                    AbortSignal.timeout(10000) : undefined),
                headers: { Accept: "application/json" }
            };

            // Build request
            if (engine.format === "postApi" || engineToUse === "chessapi") {
                url = engine.endpoint;
                options.method = "POST";
                options.headers["Content-Type"] = "application/json";
                options.body = JSON.stringify({ fen, depth, variants: 1 });
            } else if (engine.format === "stockfish") {
                url = `${engine.endpoint}?fen=${encodeURIComponent(fen)}&depth=${depth}`;
            } else if (engine.format === "lichess") {
                url = `${engine.endpoint}?fen=${encodeURIComponent(fen)}&multiPv=1`;
            } else if (engine.format === "chessdb") {
                url = `${engine.endpoint}?action=querypv&board=${encodeURIComponent(fen)}`;
            } else {
                url = `${engine.endpoint}?fen=${encodeURIComponent(fen)}&depth=${depth}`;
            }

            const response = await fetch(url, options);

            if (response.status === 204) {
                console.warn("⚠️ API returned 204 No Content");
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            let data;

            // ChessDB special handling with fallback
            if (engine.format === "chessdb") {
                const text = await response.text();
                console.log("📥 CHESSDB Response:", text);

                const textLower = text.trim().toLowerCase();
                if (textLower === "unknown" || textLower === "" || 
                    textLower === "nobestmove" || text.includes("status:unknown")) {
                    
                    console.warn("⚠️ ChessDB no data - switching to Stockfish!");
                    config.currentEngine = "stockfish";
                    updateEngineUI("stockfish");
                    
                    try {
                        return await callEngine(fen, depth, abortSignal);
                    } catch (fallbackError) {
                        console.error("❌ Stockfish fallback failed:", fallbackError);
                        return null;
                    }
                }

                // Parse ChessDB CSV format
                data = {};
                text.split(",").forEach(pair => {
                    const [key, value] = pair.split(":");
                    if (!key || value === undefined) return;
                    
                    if (key === "score" || key === "depth") {
                        data[key] = parseInt(value, 10);
                    } else if (key === "pv") {
                        data[key] = value;
                    } else if (key === "status") {
                        data[key] = value;
                    }
                });

                if (!data.pv || data.pv.trim() === "") {
                    config.currentEngine = "stockfish";
                    updateEngineUI("stockfish");
                    try {
                        return await callEngine(fen, depth, abortSignal);
                    } catch (fallbackError) {
                        return null;
                    }
                }

            } else {
                data = await response.json();
            }

            console.log("📥 API Response:", data);

            // Parse response
            const result = parseEngineResponse(data, engine.format);

            if (!result || !result.bestMoveUCI) {
                console.warn("⚠️ No valid move in response");
                return null;
            }

            // Cache result
            if (state.cache.size > 100) {
                state.cache.delete(state.cache.keys().next().value);
            }
            state.cache.set(cacheKey, result);

            return result;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }

            console.error(`❌ Engine error (${engineToUse}):`, error);
            return null;
        }
    }

    // ============================================
    // PARSE ENGINE RESPONSE
    // ============================================
    function parseEngineResponse(data, format) {
        const result = {
            bestMoveUCI: null,
            evaluation: 0,
            mate: null,
            line: ""
        };

        if (!data) {
            console.warn("⚠️ Empty response");
            return result;
        }

        try {
            // Array response
            if (Array.isArray(data) && data.length > 0) {
                data = data[0];
            }

            // CHESSDB format
            if (data.pv !== undefined) {
                console.log("📋 Parsing ChessDB format...");

                let moves = [];

                if (typeof data.pv === "string") {
                    moves = data.pv.split("|").filter(Boolean);
                } else if (Array.isArray(data.pv)) {
                    moves = data.pv.filter(Boolean);
                }

                if (moves.length > 0) {
                    result.bestMoveUCI = moves[0].trim();
                    result.line = moves.join(" ");
                } else {
                    console.warn("⚠️ ChessDB: No moves in PV");
                    return result;
                }

                if (data.score !== undefined) {
                    const numericScore = parseInt(data.score, 10);
                    if (!isNaN(numericScore)) {
                        result.evaluation = numericScore / 100;
                    }
                }

                if (data.depth !== undefined) {
                    result.depth = Number(data.depth);
                }

                console.log("✅ CHESSDB parsed:", result);
                return result;
            }

            // STOCKFISH format
            if (data.bestmove && typeof data.bestmove === "string") {
                let move = data.bestmove;

                if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) {
                    result.bestMoveUCI = move;
                } else {
                    let match = move.match(/bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
                    if (match) result.bestMoveUCI = match[1];
                }

                if (data.evaluation !== undefined) result.evaluation = parseFloat(data.evaluation);
                if (data.mate !== undefined) result.mate = parseInt(data.mate);
                if (data.continuation) result.line = data.continuation;

                console.log("✅ STOCKFISH parsed");
                return result;
            }

            // LICHESS format
            if (data.pvs && Array.isArray(data.pvs) && data.pvs.length > 0) {
                let pv = data.pvs[0];
                if (pv.moves) {
                    result.bestMoveUCI = pv.moves.split(" ")[0];
                    result.line = pv.moves;
                }
                if (pv.cp !== undefined) result.evaluation = pv.cp / 100;
                if (pv.mate !== undefined) result.mate = pv.mate;

                console.log("✅ LICHESS parsed");
                return result;
            }

            // GENERIC format
            if (data.move || data.lan || data.bestMove || data.best_move) {
                let move = data.move || data.lan || data.bestMove || data.best_move;
                if (move) {
                    result.bestMoveUCI = typeof move === "string" ?
                        (move.match(/([a-h][1-8][a-h][1-8][qrbn]?)/)?.[1] || move) : move;
                }

                if (data.eval !== undefined) result.evaluation = parseFloat(data.eval);
                else if (data.evaluation !== undefined) result.evaluation = parseFloat(data.evaluation);
                else if (data.centipawns !== undefined) result.evaluation = parseFloat(data.centipawns) / 100;
                else if (data.score !== undefined) result.evaluation = parseFloat(data.score) / 100;
                else if (data.cp !== undefined) result.evaluation = parseFloat(data.cp) / 100;

                if (data.mate !== undefined) result.mate = parseInt(data.mate);

                if (data.continuationArr && Array.isArray(data.continuationArr)) {
                    result.line = data.continuationArr.join(" ");
                } else if (data.line) {
                    result.line = data.line;
                } else if (data.pv) {
                    result.line = Array.isArray(data.pv) ? data.pv.join(" ") : data.pv;
                } else if (data.continuation) {
                    result.line = data.continuation;
                }

                console.log("✅ POST API parsed");
                return result;
            }

        } catch (error) {
            console.error("❌ Parse error:", error);
        }

        if (!result.bestMoveUCI) {
            console.warn("⚠️ No best move found");
        }

        return result;
    }

    // ============================================
    // ENGINE AUTO-SWITCHING
    // ============================================
    function canEngineAnalyze(engineKey, moveCount, depth) {
        const limits = ENGINE_LIMITS[engineKey];
        if (!limits) return false;

        const halfMoves = moveCount * 2;

        if (halfMoves > limits.maxMoves) {
            console.warn(`⚠️ ${limits.name} cannot analyze beyond ${limits.maxMoves} half-moves (current: ${halfMoves})`);
            return false;
        }

        if (depth > limits.maxDepth) {
            console.warn(`⚠️ ${limits.name} cannot analyze at depth ${depth} (max: ${limits.maxDepth})`);
            return false;
        }

        return true;
    }

    function autoSwitchEngineIfNeeded(currentEngine, moveCount, depth) {
        if (canEngineAnalyze(currentEngine, moveCount, depth)) {
            return currentEngine;
        }

        console.log(`🔄 ${ENGINE_LIMITS[currentEngine].name} cannot handle this position...`);

        const fallbackOrder = ['local', 'custom', 'lichess', 'stockfish', 'chessapi'];

        for (let engine of fallbackOrder) {
            if (engine === currentEngine || !config.engines[engine]) continue;

            if (canEngineAnalyze(engine, moveCount, depth)) {
                console.log(`✅ Switching to ${ENGINE_LIMITS[engine].name}`);
                config.currentEngine = engine;
                updateEngineUI(engine);
                return engine;
            }
        }

        console.error("❌ No available engine can analyze this position!");
        return null;
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function detectPlayerColor() {
        try {
            const board = getBoard();
            if (board) {
                // LICHESS: Check orientation class
                const cgWrap = document.querySelector('.cg-wrap');
                if (cgWrap) {
                    const isFlipped = cgWrap.classList.contains('orientation-black');
                    state.myColor = isFlipped ? 'b' : 'w';
                    return state.myColor;
                }

                // CHESS.COM: Check flipped attribute
                const flipped = board.classList.contains("flipped") || 
                    board.getAttribute("data-flipped") === "true";
                
                if (flipped !== undefined) {
                    state.myColor = flipped ? "b" : "w";
                    return state.myColor;
                }
            }

            // LICHESS: Check player components
            const lichessBottom = document.querySelector('.ruser-bottom, .ruser.user-link');
            if (lichessBottom) {
                const colorClass = lichessBottom.className.toLowerCase();
                if (colorClass.includes('white')) state.myColor = 'w';
                else if (colorClass.includes('black')) state.myColor = 'b';

                if (state.myColor) return state.myColor;
            }

            // CHESS.COM: Check player bottom
            const playerBottom = document.querySelector(
                '.player-component.player-bottom, .clock-bottom, [class*="player-bottom"]'
            );
            if (playerBottom) {
                const className = playerBottom.className.toLowerCase();
                if (className.includes("white")) state.myColor = "w";
                else if (className.includes("black")) state.myColor = "b";
            }

            // Infer from FEN
            const fen = extractFEN();
            if (fen && !state.myColor) {
                const playerToMove = getPlayerToMove(fen);
                const board = getBoard();
                const isFlipped = board && (board.classList.contains("flipped") || 
                    document.querySelector('.cg-wrap.orientation-black'));
                
                state.myColor = (playerToMove === "White" && !isFlipped) || 
                    (playerToMove === "Black" && isFlipped) ? "w" : "b";
            }

            return state.myColor;

        } catch (error) {
            console.error("Color detection error:", error);
            return null;
        }
    }

    function isMyTurn() {
        const fen = extractFEN();
        if (!fen) return false;

        if (state.turnCache.lastFEN === fen) {
            return state.turnCache.isMyTurn;
        }

        const turnChar = fen.split(" ")[1];
        const myColor = detectPlayerColor();

        if (!myColor) return false;

        const board = getBoard();
        if (board && (board.className.includes("anim") || board.className.includes("moving"))) {
            return false;
        }

        const isMyTurn = turnChar === myColor;
        state.turnCache.isMyTurn = isMyTurn;
        state.turnCache.lastFEN = fen;

        return isMyTurn;
    }

    function canPlayMove() {
        return true;
    }

    function detectTimeControl() {
        try {
            const url = window.location.href.toLowerCase();

            // LICHESS URL PATTERNS
            if (url.includes('lichess.org')) {
                if (url.includes('/ultraBullet') || url.includes('/ultra')) return "bullet";
                if (url.includes('/bullet')) return "bullet";
                if (url.includes('/blitz')) return "blitz";
                if (url.includes('/rapid')) return "rapid";
                if (url.includes('/classical')) return "classical";
                if (url.includes('/correspondence')) return "daily";
                if (url.includes('/analysis') || url.includes('/training') || 
                    url.includes('/practice')) return "unlimited";
                if (url.includes('/puzzle')) return "unlimited";
                if (url.includes('/study')) return "unlimited";

                // Check Lichess game meta
                const gameMetaInfo = document.querySelector('.game__meta__infos .setup');
                if (gameMetaInfo) {
                    const text = gameMetaInfo.textContent.toLowerCase();
                    if (text.includes('bullet')) return "bullet";
                    if (text.includes('blitz')) return "blitz";
                    if (text.includes('rapid')) return "rapid";
                    if (text.includes('classical') || text.includes('standard')) return "classical";
                    if (text.includes('correspondence')) return "daily";
                    if (text.includes('unlimited')) return "unlimited";
                }
            }

            // CHESS.COM URL PATTERNS
            if (url.includes("/daily")) return "daily";
            if (url.includes("/live/bullet") || url.includes("gameType=bullet")) return "bullet";
            if (url.includes("/live/blitz") || url.includes("gameType=blitz")) return "blitz";
            if (url.includes("/live/rapid") || url.includes("gameType=rapid")) return "rapid";
            if (url.includes("/live/classical") || url.includes("gameType=classical")) return "classical";
            if (url.includes("/practice") || url.includes("/analysis") || 
                url.includes("/puzzles") || url.includes("/computer")) return "unlimited";

            // DOM-based detection
            const gameInfo = document.querySelector('[data-game-type], [data-time-class], .game-time-control');
            if (gameInfo) {
                const timeClass = (gameInfo.getAttribute('data-game-type') || 
                    gameInfo.getAttribute('data-time-class') || 
                    gameInfo.textContent || '').toLowerCase();

                if (timeClass.includes('bullet')) return "bullet";
                if (timeClass.includes('blitz')) return "blitz";
                if (timeClass.includes('rapid')) return "rapid";
                if (timeClass.includes('classical') || timeClass.includes('standard')) return "classical";
                if (timeClass.includes('daily') || timeClass.includes('correspondence')) return "daily";
            }

            // Clock-based detection
            const clockElements = document.querySelectorAll(
                '.clock-component, .clock-time-monospace, [role="timer"], .clock, ' +
                '.rclock .time, .clock-time'
            );

            if (clockElements.length === 0) {
                if (url.includes('analysis') || url.includes('practice') || url.includes('puzzle')) {
                    console.log("✅ Analysis/Practice mode detected - Using UNLIMITED");
                    return "unlimited";
                }
                console.log("✅ No clocks but active game - Using BLITZ as default");
                return "blitz";
            }

            // Parse clock times
            const clocks = document.querySelectorAll(
                '.clock-time-monospace, .clock-component [role="timer"], .clock time, .clock-time, ' +
                '.rclock .time'
            );

            let totalSeconds = 0;
            let clockCount = 0;
            let allClocksZero = true;

            clocks.forEach(clock => {
                const timeText = clock.textContent.trim();
                const timeMatch = timeText.match(/(\d+)[\s:]*(\d+)/);

                if (timeMatch) {
                    const mins = parseInt(timeMatch[1], 10);
                    const secs = parseInt(timeMatch[2], 10);
                    const totalSecs = (mins * 60) + secs;

                    if (totalSecs > 0) {
                        allClocksZero = false;
                        totalSeconds += totalSecs;
                        clockCount++;
                    }
                }
            });

            if (clockElements.length > 0 && allClocksZero) {
                console.log("✅ All clocks at 0:00 - Using BLITZ as default");
                return "blitz";
            }

            if (clockCount > 0) {
                const avgTime = totalSeconds / clockCount;

                if (avgTime < 180) return "bullet";
                if (avgTime < 600) return "blitz";
                if (avgTime < 1800) return "rapid";
                return "classical";
            }

            // Page title fallback
            const pageTitle = document.title.toLowerCase();
            if (pageTitle.includes('bullet')) return "bullet";
            if (pageTitle.includes('blitz')) return "blitz";
            if (pageTitle.includes('rapid')) return "rapid";
            if (pageTitle.includes('classical')) return "classical";
            if (pageTitle.includes('daily')) return "daily";

            console.log("✅ No time control detected - Using BLITZ as safe default");
            return "blitz";

        } catch (error) {
            console.error("Time control detection error:", error);
            return "blitz";
        }
    }

    function calculateDepth() {
        const profile = config.depthProfiles[state.currentTimeControl];
        let depth = profile.base;

        if (state.lastMoveCount < 10) {
            depth = Math.max(profile.base - 2, 8);
        } else if (state.lastMoveCount > 30) {
            depth = Math.min(profile.max, profile.base + 2);
        }

        return depth;
    }

    function getBoard() {
        const now = Date.now();
        if (state.boardCache.element && 
            now - state.boardCache.lastCheck < state.boardCache.checkInterval &&
            document.contains(state.boardCache.element)) {
            return state.boardCache.element;
        }

        // LICHESS PRIORITY SELECTORS
        const selectors = [
            "cg-container",
            ".cg-wrap",
            "chess-board",
            ".main-board cg-container",
            ".round__app__board cg-container",
            "wc-chess-board",
            ".board"
        ];

        for (let selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                state.boardCache.element = element;
                state.boardCache.lastCheck = now;
                return element;
            }
        }

        const fallback = document.querySelector(".board-area, .chessboard, [data-board], .round__app__board");
        if (fallback) {
            state.boardCache.element = fallback;
            state.boardCache.lastCheck = now;
        }
        return fallback;
    }

    function getMoveListContainer() {
        const selectors = [
            '.moves',
            '.tview2',
            '.analyse__moves',
            'l4x',
            '.move-list-component',
            '.vertical-move-list',
            '[class*="move-list"]',
            '[class*="moveList"]',
            '[data-test-element="vertical-move-list"]'
        ];

        for (let selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element;
        }

        const allDivs = document.querySelectorAll('div');
        for (let div of allDivs) {
            const text = div.textContent;
            if (text && /\d+\.\s*[a-h][1-8]/.test(text)) {
                return div;
            }
        }

        return null;
    }

    function extractFEN(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && state.fenCache.fen && 
            now - state.fenCache.timestamp < state.fenCache.ttl) {
            return state.fenCache.fen;
        }

        try {
            const board = getBoard();
            if (!board) {
                state.fenCache.fen = null;
                return null;
            }

            let fen = null;

            if (board.game?.getFEN) {
                try {
                    fen = board.game.getFEN();
                    if (fen?.length > 20) {
                        if (fen !== state.fenCache.fen) {
                            state.boardCache.lastCheck = 0;
                        }
                        state.fenCache.fen = fen;
                        state.fenCache.timestamp = now;
                        return fen;
                    }
                } catch (error) {}
            }

            const gameObjects = [window.chessGame, window.liveGameData, window.gameData];
            for (let gameObj of gameObjects) {
                if (gameObj) {
                    try {
                        const extractedFEN = gameObj.getFEN?.() || gameObj.game?.fen || gameObj.fen;
                        if (extractedFEN?.length > 20) {
                            if (extractedFEN !== state.fenCache.fen) {
                                state.boardCache.lastCheck = 0;
                            }
                            fen = extractedFEN;
                            state.fenCache.fen = fen;
                            state.fenCache.timestamp = now;
                            return fen;
                        }
                    } catch (error) {}
                }
            }

            try {
                const dataFEN = board.getAttribute("data-fen") || board.dataset?.fen;
                if (dataFEN?.length > 20) {
                    if (dataFEN !== state.fenCache.fen) {
                        state.boardCache.lastCheck = 0;
                    }
                    fen = dataFEN;
                    state.fenCache.fen = fen;
                    state.fenCache.timestamp = now;
                    return fen;
                }
            } catch (error) {}

            state.fenCache.fen = null;
            return null;

        } catch (error) {
            console.error("FEN extraction error:", error);
            state.fenCache.fen = null;
            return null;
        }
    }

    function getMoveCount() {
        try {
            const moveList = getMoveListContainer();
            if (!moveList) return 0;

            const moveNodes = moveList.querySelectorAll(
                '.node, .move, .move-text-component, [class*="move"]'
            );

            const validMoves = Array.from(moveNodes).filter(node => {
                const text = node.textContent.trim();
                return text && /^[a-h1-8NBRQK+#=x-]+$/.test(text) && text.length > 1;
            });

            return Math.ceil(validMoves.length / 2);
        } catch (error) {
            return 0;
        }
    }

    function getPlayerToMove(fen) {
        if (!fen) return "Unknown";
        const parts = fen.split(" ");
        return parts.length >= 2 && parts[1] === "w" ? "White" : "Black";
    }

    // ============================================
    // UI FUNCTIONS
    // ============================================

    function getSquareCoordinates(board, square) {
        if (!board) return null;

        const rect = board.getBoundingClientRect();

        const boardEl = board.querySelector('cg-board') || board.querySelector('chess-board') || board;
        if (boardEl !== board) {
            rect = boardEl.getBoundingClientRect();
        }

        const squareSize = Math.min(rect.width, rect.height) / 8;
        const file = square.charCodeAt(0) - 97;
        const rank = parseInt(square[1]) - 1;

        const isFlipped = board.classList.contains("flipped") || 
            document.querySelector('.cg-wrap.orientation-black') !== null;

        return {
            x: rect.left + (isFlipped ? 7 - file : file) * squareSize + squareSize / 2,
            y: rect.top + (isFlipped ? rank : 7 - rank) * squareSize + squareSize / 2,
            squareSize: squareSize
        };
    }

    function dispatchPointerEvent(element, eventType, options = {}) {
        const eventOptions = Object.assign({
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            clientX: options.clientX || 0,
            clientY: options.clientY || 0,
            button: options.button || 0,
            buttons: options.buttons !== undefined ? options.buttons : (options.button === 0 ? 1 : 0),
            pressure: options.pressure !== undefined ? options.pressure : 0.5
        }, options);

        try {
            const pointerEvent = new PointerEvent(eventType, eventOptions);
            (element || document).dispatchEvent(pointerEvent);
        } catch (error) {
            try {
                const mouseEvent = new MouseEvent(eventType.replace("pointer", "mouse"), {
                    bubbles: eventOptions.bubbles,
                    cancelable: eventOptions.cancelable,
                    clientX: eventOptions.clientX,
                    clientY: eventOptions.clientY,
                    button: eventOptions.button,
                    buttons: eventOptions.buttons
                });
                (element || document).dispatchEvent(mouseEvent);
            } catch (error2) {
                try {
                    if (element && typeof element.click === 'function') {
                        element.click();
                    }
                } catch (error3) {}
            }
        }
    }

    function flashSquare(x, y, size = 36) {
        if (config.visualFeedback === "none") return;

        const flash = document.createElement("div");
        const opacity = config.visualFeedback === "full" ? 0.6 : 0.4;
        const duration = config.visualFeedback === "full" ? 300 : 160;

        Object.assign(flash.style, {
            position: "fixed",
            left: x - size / 2 + "px",
            top: y - size / 2 + "px",
            width: size + "px",
            height: size + "px",
            backgroundColor: "#ffeb3b",
            opacity: String(opacity),
            pointerEvents: "none",
            zIndex: String(config.overlayZIndex + 1000),
            borderRadius: "50%",
            transition: `all ${duration}ms ease`
        });

        document.body.appendChild(flash);

        setTimeout(() => {
            flash.style.opacity = "0";
            flash.style.transform = "scale(1.4)";
            setTimeout(() => flash.remove(), duration + 50);
        }, config.visualFeedback === "full" ? 260 : 80);
    }

    function drawArrow(fromSquare, toSquare) {
        if (config.visualFeedback === "none") return;

        try {
            clearVisuals();

            const board = getBoard();
            if (!board) return;

            const rect = board.getBoundingClientRect();
            const squareSize = Math.min(rect.width, rect.height) / 8;

            function getSquareCenter(square) {
                const file = square.charCodeAt(0) - 97;
                const rank = parseInt(square[1], 10) - 1;
                const isFlipped = board.classList.contains("flipped");

                return {
                    x: (isFlipped ? 7 - file : file) * squareSize + squareSize / 2,
                    y: (isFlipped ? rank : 7 - rank) * squareSize + squareSize / 2
                };
            }

            const from = getSquareCenter(fromSquare);
            const to = getSquareCenter(toSquare);

            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.classList.add("smart-analyzer-arrow");
            Object.assign(svg.style, {
                pointerEvents: "none",
                position: "absolute",
                left: rect.left + "px",
                top: rect.top + "px",
                width: rect.width + "px",
                height: rect.height + "px",
                zIndex: config.overlayZIndex - 1
            });

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            const strokeWidth = config.visualFeedback === "full" ? 8 : 4;
            const strokeColor = config.visualFeedback === "full" ? "#2ecc71" : "#7ddc9f";

            line.setAttribute("x1", from.x);
            line.setAttribute("y1", from.y);
            line.setAttribute("x2", to.x);
            line.setAttribute("y2", to.y);
            line.setAttribute("stroke", strokeColor);
            line.setAttribute("stroke-width", String(strokeWidth));
            line.setAttribute("stroke-linecap", "round");
            svg.appendChild(line);

            const arrowHead = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const angle = Math.atan2(to.y - from.y, to.x - from.x);
            const headSize = 4.5 * strokeWidth;
            const tipX = to.x;
            const tipY = to.y;

            arrowHead.setAttribute("points", 
                `${tipX},${tipY} ` +
                `${tipX - headSize * Math.cos(angle - Math.PI / 6)},${tipY - headSize * Math.sin(angle - Math.PI / 6)} ` +
                `${tipX - headSize * Math.cos(angle + Math.PI / 6)},${tipY - headSize * Math.sin(angle + Math.PI / 6)}`
            );
            arrowHead.setAttribute("fill", strokeColor);
            svg.appendChild(arrowHead);

            document.body.appendChild(svg);

            if (config.visualFeedback === "full") {
                const highlightFrom = document.createElement("div");
                highlightFrom.classList.add("smart-analyzer-highlight");
                Object.assign(highlightFrom.style, {
                    position: "absolute",
                    left: rect.left + from.x - squareSize / 2 + "px",
                    top: rect.top + from.y - squareSize / 2 + "px",
                    width: squareSize + "px",
                    height: squareSize + "px",
                    backgroundColor: "#2ecc71",
                    opacity: "0.25",
                    pointerEvents: "none",
                    zIndex: config.overlayZIndex - 2,
                    borderRadius: "4px"
                });

                const highlightTo = highlightFrom.cloneNode();
                Object.assign(highlightTo.style, {
                    left: rect.left + to.x - squareSize / 2 + "px",
                    top: rect.top + to.y - squareSize / 2 + "px"
                });

                document.body.appendChild(highlightFrom);
                document.body.appendChild(highlightTo);
            }

        } catch (error) {
            console.error("Visual error:", error);
        }
    }

    function clearVisuals() {
        document.querySelectorAll(".smart-analyzer-arrow, .smart-analyzer-highlight").forEach(el => el.remove());
    }

    // ============================================
    // AUTO-MOVE FUNCTIONS
    // ============================================

    async function clickSquare(square) {
        const board = getBoard();
        if (!board) {
            console.error("❌ Board not found for clickSquare");
            return false;
        }

        const coords = getSquareCoordinates(board, square);
        if (!coords) {
            console.error("❌ Could not get coords for", square);
            return false;
        }

        const { x, y, squareSize } = coords;

        const squareEl = document.elementFromPoint(Math.round(x), Math.round(y)) || board;

        let target = squareEl;
        if (!board.contains(target)) {
            let parent = target;
            while (parent && !board.contains(parent)) {
                parent = parent.parentElement;
            }
            target = parent || board;
        }

        dispatchPointerEvent(target, "pointerover", { clientX: x, clientY: y });
        dispatchPointerEvent(target, "pointerenter", { clientX: x, clientY: y });
        dispatchPointerEvent(target, "pointerdown", { clientX: x, clientY: y, button: 0, buttons: 1 });
        
        await sleep(30 + Math.round(80 * Math.random()));
        
        dispatchPointerEvent(target, "pointerup", { clientX: x, clientY: y, button: 0, buttons: 0 });

        if (config.visualFeedback !== "none") {
            const size = config.visualFeedback === "full" ? 50 : 28;
            flashSquare(x, y, size);
        }

        console.log(`✅ Click simulated at ${square.toUpperCase()} → (${Math.round(x)},${Math.round(y)})`);
        return true;
    }

    async function dragPiece(fromSquare, toSquare) {
        const board = getBoard();
        if (!board) {
            console.error("❌ Board not found for dragPiece");
            return false;
        }

        const fromCoords = getSquareCoordinates(board, fromSquare);
        const toCoords = getSquareCoordinates(board, toSquare);

        if (!fromCoords || !toCoords) {
            console.error("❌ Could not calculate drag coordinates", fromSquare, toSquare);
            return false;
        }

        let { x: fromX, y: fromY, squareSize } = fromCoords;
        let { x: toX, y: toY } = toCoords;

        // Get speed profile
        let speedProfile;
        const speedKey = config.autoMove.moveSpeed;

        if (speedKey && config.moveSpeedProfiles[speedKey]) {
            speedProfile = config.moveSpeedProfiles[speedKey];
        } else {
            switch (state.currentTimeControl) {
                case "bullet":
                    speedProfile = config.moveSpeedProfiles.fast;
                    break;
                case "blitz":
                case "rapid":
                default:
                    speedProfile = config.moveSpeedProfiles.normal;
                    break;
                case "classical":
                    speedProfile = config.moveSpeedProfiles.slow;
                    break;
            }
        }

        // Add randomness
        const jitter = Math.max(6, 0.06 * squareSize);
        if (config.autoMove.humanize) {
            fromX += (Math.random() - 0.5) * jitter;
            fromY += (Math.random() - 0.5) * jitter;
            toX += (Math.random() - 0.5) * jitter;
            toY += (Math.random() - 0.5) * jitter;
        }

        // Calculate arc
        const distance = Math.hypot(toX - fromX, toY - fromY) || 1;
        const arcHeight = Math.max(6, Math.min(0.12 * distance, 0.6 * squareSize)) *
            (config.autoMove.humanize ? 0.6 + 0.8 * Math.random() : 0) *
            speedProfile.arcMultiplier;

        const dx = toX - fromX;
        const dy = toY - fromY;
        const perpX = -dy / distance;
        const perpY = dx / distance;

        // Start drag
        let startEl = document.elementFromPoint(Math.round(fromX), Math.round(fromY)) || board;

        if (!board.contains(startEl)) {
            let parent = startEl;
            while (parent && !board.contains(parent)) {
                parent = parent.parentElement;
            }
            startEl = parent || board;
        }

        dispatchPointerEvent(startEl, "pointerover", { clientX: fromX, clientY: fromY });
        dispatchPointerEvent(startEl, "pointerenter", { clientX: fromX, clientY: fromY });
        dispatchPointerEvent(startEl, "pointerdown", { clientX: fromX, clientY: fromY, button: 0, buttons: 1 });

        await sleep(speedProfile.holdTime + Math.round(Math.random() * (0.4 * speedProfile.holdTime)));

        // Drag movement
        const steps = speedProfile.dragSteps;
        const stepDelay = speedProfile.stepDelay;

        for (let i = 1; i <= steps; i++) {
            const progress = i / steps;
            const eased = easeInOutCubic(progress);

            let currentX = fromX + (toX - fromX) * eased;
            let currentY = fromY + (toY - fromY) * eased;

            const arcOffset = Math.sin(Math.PI * progress) * arcHeight;
            currentX += perpX * arcOffset;
            currentY += perpY * arcOffset;

            let moveEl = document.elementFromPoint(Math.round(currentX), Math.round(currentY)) || startEl;

            if (!board.contains(moveEl)) {
                let parent = moveEl;
                while (parent && !board.contains(parent)) {
                    parent = parent.parentElement;
                }
                moveEl = parent || startEl;
            }

            dispatchPointerEvent(moveEl, "pointermove", {
                clientX: currentX,
                clientY: currentY,
                button: 0,
                buttons: 1
            });

            if (config.visualFeedback === "full" || 
                (config.visualFeedback === "subtle" && i === Math.floor(steps / 2))) {
                const flashSize = config.visualFeedback === "full" ? 36 : 18;
                flashSquare(currentX, currentY, flashSize);
            }

            await sleep(stepDelay + Math.round(Math.random() * (0.35 * stepDelay)));
        }

        // End drag
        let endEl = document.elementFromPoint(Math.round(toX), Math.round(toY)) || board;

        if (!board.contains(endEl)) {
            let parent = endEl;
            while (parent && !board.contains(parent)) {
                parent = parent.parentElement;
            }
            endEl = parent || board;
        }

        dispatchPointerEvent(endEl, "pointerup", { clientX: toX, clientY: toY, button: 0, buttons: 0 });

        // Fallback mouse events
        try {
            const mouseDown = new MouseEvent("mousedown", {
                bubbles: true,
                clientX: fromX,
                clientY: fromY,
                button: 0
            });
            const mouseUp = new MouseEvent("mouseup", {
                bubbles: true,
                clientX: toX,
                clientY: toY,
                button: 0
            });
            (startEl || board).dispatchEvent(mouseDown);
            (endEl || board).dispatchEvent(mouseUp);
        } catch (error) {}

        await sleep(35 + Math.round(120 * Math.random()));

        console.log(`✅ Move complete: ${fromSquare.toUpperCase()} → ${toSquare.toUpperCase()}`);
        return true;
    }

    async function handlePromotion(promotionPiece) {
        const piece = (promotionPiece || "q").toLowerCase();
        const pieceMap = { q: "queen", r: "rook", b: "bishop", n: "knight" };
        const pieceName = pieceMap[piece] || "queen";

        console.log(`🔍 Looking for promotion UI - Target: ${pieceName.toUpperCase()}`);
        await sleep(250);

        let promotionElements = [];

        // LICHESS-SPECIFIC SELECTORS
        [
            '.promotion-choice',
            '.cg-wrap .promotion',
            '[data-role="promotion"]',
            '.promotion square',
            'square[data-role="promotion"]',
            '.promotion-window',
            '.promotion-dialog',
            '[class*="promotion"]'
        ].forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (el.offsetParent !== null) promotionElements.push(el);
            });
        });

        // LICHESS: Find by piece class
        ['queen', 'rook', 'bishop', 'knight'].forEach(p => {
            const lichessSelector = `.promotion square.${p}, .promotion-choice square.${p}`;
            document.querySelectorAll(lichessSelector).forEach(el => {
                if (el.offsetParent !== null) promotionElements.push(el);
            });
        });

        // Remove duplicates
        promotionElements = Array.from(new Set(promotionElements)).filter(Boolean);
        console.log(`📋 Found ${promotionElements.length} potential promotion elements`);

        // Find by piece class name
        let targetElement = promotionElements.find(el => {
            return el.classList.contains(pieceName) ||
                el.getAttribute('data-role') === piece ||
                el.getAttribute('data-piece') === piece;
        });

        // Fallback: Find by label
        if (!targetElement) {
            targetElement = promotionElements.find(el => {
                const label = (el.getAttribute('aria-label') || el.textContent || '').toLowerCase();
                return label.includes(pieceName);
            });
        }

        // Default to first element (usually Queen)
        if (!targetElement && pieceName === "queen" && promotionElements.length > 0) {
            targetElement = promotionElements[0];
            console.log("🔍 Using positional match for Queen (first element)");
        }

        // Execute click
        if (targetElement) {
            try {
                const rect = targetElement.getBoundingClientRect();
                const clickX = rect.left + rect.width / 2;
                const clickY = rect.top + rect.height / 2;

                console.log(`✅ Found promotion target: ${pieceName.toUpperCase()}`);

                dispatchPointerEvent(targetElement, "pointerdown", { clientX: clickX, clientY: clickY, button: 0, buttons: 1 });
                await sleep(30);
                dispatchPointerEvent(targetElement, "pointerup", { clientX: clickX, clientY: clickY, button: 0, buttons: 0 });
                await sleep(20);

                try { targetElement.click(); } catch (err) {}

                console.log(`👑 Promotion executed: ${pieceName.toUpperCase()}`);
                return true;

            } catch (error) {
                console.error("❌ Promotion click failed:", error);
                try {
                    targetElement.click();
                    return true;
                } catch (error2) {
                    console.error("❌ Fallback click also failed");
                }
            }
        }

        console.warn(`⚠️ Could not find promotion UI for ${pieceName.toUpperCase()}`);
        return false;
    }

    async function executeAutoMove(uciMove) {
        if (config.autoMove.onlyMyTurn && !isMyTurn()) {
            console.log("⏸️ Not our turn - skipping auto-move");
            return false;
        }

        const fromSquare = uciMove.substring(0, 2);
        const toSquare = uciMove.substring(2, 4);
        const promotionPiece = uciMove.length > 4 ? uciMove[4] : null;

        console.log(`🤖 Auto-moving: ${fromSquare.toUpperCase()} → ${toSquare.toUpperCase()}${promotionPiece ? ' =' + promotionPiece.toUpperCase() : ''}`);

        try {
            // Show visual feedback
            drawArrow(fromSquare, toSquare);

            // Execute drag
            if (!await dragPiece(fromSquare, toSquare)) {
                console.error("❌ Failed to drag piece");
                return false;
            }

            // Handle promotion
            if (promotionPiece) {
                console.log(`👑 PROMOTION DETECTED: ${promotionPiece.toUpperCase()}`);
                await sleep(300);

                let promotionSuccess = false;
                for (let attempt = 1; attempt <= 3; attempt++) {
                    console.log(`🎯 Promotion attempt ${attempt}/3...`);

                    if (await handlePromotion(promotionPiece)) {
                        promotionSuccess = true;
                        console.log(`✅ Promotion successful on attempt ${attempt}`);
                        break;
                    }

                    if (attempt < 3) {
                        console.log(`⏳ Waiting before retry...`);
                        await sleep(200);
                    }
                }

                if (!promotionSuccess) {
                    console.warn("⚠️ All promotion attempts failed");
                }
            }

            // Update counter
            config.autoMove.autoMovesCount++;
            updateAutoMoveCounter();

            console.log(`✅ Auto-move complete! Total moves: ${config.autoMove.autoMovesCount}`);
            return true;

        } catch (error) {
            console.error("❌ Auto-move error:", error);
            return false;
        }
    }

    // ============================================
    // UI CREATION AND UPDATES
    // ============================================

    function createOverlay() {
        if (state.overlay) return;

        const overlay = document.createElement("div");
        overlay.id = "chess-smart-analyzer";

        Object.assign(overlay.style, {
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)",
            color: "#ffffff",
            padding: "0",
            borderRadius: "14px",
            minWidth: "280px",
            maxWidth: "380px",
            maxHeight: "calc(100vh - 40px)",
            zIndex: config.overlayZIndex,
            fontFamily: "'Segoe UI', 'SF Pro Display', -apple-system, system-ui, sans-serif",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            backdropFilter: "blur(12px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
        });

        overlay.innerHTML = `
            <style>
                #chess-smart-analyzer * { box-sizing: border-box; }
                
                .analyzer-btn {
                    background: rgba(255, 255, 255, 0.06);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #fff;
                    padding: 8px 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 36px;
                    font-weight: 500;
                    white-space: nowrap;
                }
                .analyzer-btn:hover {
                    background: rgba(255, 255, 255, 0.12);
                    border-color: rgba(255, 255, 255, 0.2);
                    transform: translateY(-1px);
                }
                .analyzer-btn:active { transform: translateY(0); }
                .analyzer-btn.primary {
                    background: linear-gradient(135deg, #00e676 0%, #00c853 100%);
                    border-color: #00e676;
                    color: #000;
                }
                .analyzer-btn.primary:hover {
                    background: linear-gradient(135deg, #00ff88 0%, #00e676 100%);
                }
                
                .mode-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 5px 12px;
                    background: rgba(0, 230, 118, 0.12);
                    border: 1px solid rgba(0, 230, 118, 0.25);
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #00e676;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .mode-chip:hover {
                    background: rgba(0, 230, 118, 0.2);
                    transform: scale(1.05);
                }
                
                #analyzer-body::-webkit-scrollbar { width: 6px; }
                #analyzer-body::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 10px;
                }
                #analyzer-body::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 10px;
                }
            </style>

            <!-- HEADER -->
            <div id="analyzer-header" style="
                padding: 12px 14px;
                background: linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.1) 100%);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
                flex-shrink: 0;
            ">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 18px;">♟️</div>
                    <div>
                        <div style="font-size: 12px; font-weight: 700; color: #00e676; letter-spacing: 0.3px;">Smart Analyzer</div>
                        <div style="font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Ultra-Fast</div>
                    </div>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button id="btn-minimize" class="analyzer-btn" title="Minimize" style="min-width: 30px; padding: 5px; font-size: 12px;">▼</button>
                    <button id="btn-hide" class="analyzer-btn" title="Close" style="min-width: 30px; padding: 5px; color: #ff6b6b; font-size: 12px;">✕</button>
                </div>
            </div>

            <!-- MINIMIZED TOOLBAR -->
            <div id="minimized-toolbar" style="display: none; padding: 10px 12px; background: rgba(0, 0, 0, 0.2); border-bottom: 1px solid rgba(255, 255, 255, 0.08); flex-shrink: 0;">
                <div style="display: flex; gap: 6px; align-items: center; justify-content: space-between;">
                    <button id="btn-automove-mini" class="analyzer-btn" title="Toggle Auto-Move" style="flex: 1; font-size: 11px; padding: 8px 6px;">
                        <span style="margin-right: 4px;">🤖</span> Auto
                    </button>
                    <button id="btn-analyze-mini" class="analyzer-btn primary" title="Analyze Position" style="flex: 1; font-size: 11px; padding: 8px 6px;">
                        <span style="margin-right: 4px;">🔍</span> Analyze
                    </button>
                    <button id="btn-mode-mini" class="analyzer-btn" title="Change Mode" style="min-width: 36px; padding: 8px;">⚡</button>
                </div>
            </div>

            <!-- SCROLLABLE BODY -->
            <div id="analyzer-body" style="
                padding: 12px;
                overflow-y: auto;
                overflow-x: hidden;
                flex: 1;
                min-height: 0;
            ">
                <!-- MODE BADGE -->
                <div style="margin-bottom: 10px;">
                    <div id="time-control-badge" class="mode-chip">
                        <span>⚡</span>
                        <span>Blitz • D12</span>
                    </div>
                </div>

                <!-- ENGINE INFO -->
                <div style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); padding: 8px 10px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span id="engine-icon" style="font-size: 14px;">🐟</span>
                            <span id="engine-name" style="font-size: 11px; font-weight: 600; color: #fff;">Stockfish Online</span>
                        </div>
                    </div>
                </div>

                <!-- AUTO-MOVE TOGGLE -->
                <div style="background: rgba(255, 193, 7, 0.08); border: 1px solid rgba(255, 193, 7, 0.2); padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 12px; font-weight: 600; color: #ffc107;">🤖 Auto-Move</span>
                        <label style="position: relative; display: inline-block; width: 40px; height: 22px; cursor: pointer;">
                            <input type="checkbox" id="automove-toggle" style="opacity: 0; width: 0; height: 0;">
                            <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255, 255, 255, 0.1); transition: 0.3s; border-radius: 22px; border: 1px solid rgba(255, 255, 255, 0.2);"></span>
                            <span style="position: absolute; height: 16px; width: 16px; left: 3px; bottom: 2px; background-color: white; transition: 0.3s; border-radius: 50%;"></span>
                        </label>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 9px; margin-top: 6px;">
                        <span style="color: #aaa;">Color: <span id="player-color" style="color: #ffc107; font-weight: 600;">--</span></span>
                        <span style="color: #aaa;">Moves: <span id="automove-count" style="color: #ffc107; font-weight: 600;">0</span></span>
                    </div>
                </div>

                <!-- BEST MOVE -->
                <div id="best-move-container" style="display: none; background: linear-gradient(135deg, rgba(0, 230, 118, 0.1) 0%, rgba(0, 200, 100, 0.05) 100%); padding: 12px; border-radius: 10px; margin-bottom: 10px; border: 1px solid rgba(0, 230, 118, 0.25);">
                    <div style="font-size: 9px; color: #00e676; font-weight: 700; margin-bottom: 6px; letter-spacing: 1px;">BEST MOVE</div>
                    <div id="best-move" style="font-size: 22px; font-weight: 900; color: #00e676; letter-spacing: 2px; margin-bottom: 6px; font-family: 'SF Mono', Monaco, monospace;">--</div>
                    <div id="continuation" style="font-size: 9px; color: #888; font-family: monospace; line-height: 1.3;">--</div>
                </div>

                <!-- EVALUATION -->
                <div id="evaluation-bar-container" style="display: none; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 9px; color: #888; font-weight: 700; letter-spacing: 1px;">EVALUATION</span>
                        <span id="eval-score" style="font-size: 14px; font-weight: 800; color: #00e676;">0.00</span>
                    </div>
                    <div style="height: 5px; background: rgba(255, 255, 255, 0.06); border-radius: 10px; overflow: hidden;">
                        <div id="eval-bar" style="height: 100%; width: 50%; background: linear-gradient(90deg, #00e676, #00c853); transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 10px;"></div>
                    </div>
                </div>

                <!-- STATUS -->
                <div id="status-message" style="padding: 8px 10px; background: rgba(255, 255, 255, 0.04); border-radius: 8px; font-size: 10px; color: #bbb; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
                    <div id="status-icon" style="font-size: 14px;">⏳</div>
                    <div id="status-text" style="flex: 1;">Waiting...</div>
                </div>

                <!-- STATS -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px;">
                    <div>
                        <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Move</div>
                        <div id="move-number" style="font-size: 14px; color: #fff; font-weight: 700;">0</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Turn</div>
                        <div id="turn-indicator" style="font-size: 14px; color: #fff; font-weight: 700;">--</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Depth</div>
                        <div id="depth-value" style="font-size: 14px; color: #00e676; font-weight: 700;">12</div>
                    </div>
                </div>

                <!-- ACTION BUTTONS -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                    <button id="btn-refresh" class="analyzer-btn primary" style="padding: 9px; font-size: 11px;">
                        <span style="margin-right: 4px;">🔍</span> Analyze
                    </button>
                    <button id="btn-mode" class="analyzer-btn" style="padding: 9px; font-size: 11px;">
                        <span style="margin-right: 4px;">⚡</span> Mode
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        state.overlay = overlay;

        // Setup event listeners
        setupOverlayListeners();

        // Make draggable
        makeDraggable(overlay);

        console.log("✅ Overlay created");
    }

    function setupOverlayListeners() {
        const $ = (id) => document.getElementById(id);

        // Toggle handlers
        $("automove-toggle").addEventListener("change", function() {
            const slider = this.nextElementSibling;
            const knob = slider.nextElementSibling;
            if (this.checked) {
                slider.style.backgroundColor = "#00e676";
                knob.style.transform = "translateX(18px)";
            } else {
                slider.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                knob.style.transform = "translateX(0)";
            }
        });

        $("btn-hide").onclick = () => state.overlay.style.display = "none";
        $("btn-refresh").onclick = () => manualAnalyze();
        $("btn-mode").onclick = () => toggleModeSelector();
        
        $("btn-minimize").onclick = () => {
            const body = $("analyzer-body");
            const toolbar = $("minimized-toolbar");
            const btn = $("btn-minimize");

            if (state.isMinimized) {
                body.style.display = "block";
                toolbar.style.display = "none";
                btn.textContent = "▼";
                state.isMinimized = false;
            } else {
                body.style.display = "none";
                toolbar.style.display = "block";
                btn.textContent = "▢";
                state.isMinimized = true;
            }
        };

        $("time-control-badge").onclick = () => toggleModeSelector();
        
        $("btn-automove-mini").onclick = () => {
            const toggle = $("automove-toggle");
            toggle.checked = !toggle.checked;
            toggle.dispatchEvent(new Event("change"));
        };

        $("btn-analyze-mini").onclick = () => manualAnalyze();
        $("btn-mode-mini").onclick = () => toggleModeSelector();

        $("automove-toggle").onchange = (e) => {
            config.autoMove.enabled = e.target.checked;
            const miniBtn = $("btn-automove-mini");
            
            if (e.target.checked) {
                console.log("🤖 Auto-move ENABLED");
                detectPlayerColor();
                updatePlayerColorDisplay();
                if (miniBtn) {
                    miniBtn.style.background = "linear-gradient(135deg, #00e676 0%, #00c853 100%)";
                }
            } else {
                console.log("⏸️ Auto-move DISABLED");
                if (miniBtn) {
                    miniBtn.style.background = "rgba(255, 255, 255, 0.06)";
                }
            }
        };

        console.log("✅ Overlay listeners setup");
    }

    function makeDraggable(element) {
        let offsetX = 0;
        let offsetY = 0;
        let startX = 0;
        let startY = 0;
        let isDragging = false;

        const header = document.getElementById("analyzer-header");

        function onMouseMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            e.stopPropagation();

            offsetX = startX - e.clientX;
            offsetY = startY - e.clientY;
            startX = e.clientX;
            startY = e.clientY;

            let newTop = element.offsetTop - offsetY;
            let newLeft = element.offsetLeft - offsetX;

            const rect = element.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            const maxLeft = window.innerWidth - width;
            const maxTop = window.innerHeight - height;

            newLeft = Math.max(10, Math.min(newLeft, maxLeft - 10));
            newTop = Math.max(10, Math.min(newTop, maxTop - 10));

            element.style.top = newTop + "px";
            element.style.left = newLeft + "px";
            element.style.right = "auto";
            element.style.bottom = "auto";
        }

        function onMouseUp() {
            isDragging = false;
            document.onmouseup = null;
            document.onmousemove = null;
            element.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
            element.style.cursor = "default";
            header.style.cursor = "move";
        }

        if (header) {
            header.style.cursor = "move";
            header.style.userSelect = "none";
            header.onmousedown = function(e) {
                e.preventDefault();
                e.stopPropagation();
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                element.style.transition = "none";
                element.style.cursor = "grabbing";
                header.style.cursor = "grabbing";
                document.onmouseup = onMouseUp;
                document.onmousemove = onMouseMove;
            };
        }
    }

    function updatePlayerColorDisplay() {
        const colorEl = document.getElementById("player-color");
        if (colorEl) {
            colorEl.textContent = state.myColor === "w" ? "White ⚪" : 
                state.myColor === "b" ? "Black ⚫" : "Unknown";
        }
    }

    function updateAutoMoveCounter() {
        const counterEl = document.getElementById("automove-count");
        if (counterEl) {
            counterEl.textContent = config.autoMove.autoMovesCount;
        }
    }

    function showStatus(message, turnText = "", type = "idle") {
        createOverlay();

        const statusText = document.getElementById("status-text");
        const statusIcon = document.getElementById("status-icon");

        if (statusText) statusText.textContent = message;
        if (statusIcon) {
            statusIcon.textContent = {
                idle: "⏸️",
                analyzing: "🔄",
                complete: "✅",
                error: "❌"
            }[type] || "⏳";
        }

        const turnEl = document.getElementById("turn-indicator");
        if (turnEl && turnText) {
            turnEl.textContent = turnText;
        }
    }

    function displayResult(result, turnText, isQuick = false) {
        createOverlay();

        if (!result || !result.bestMoveUCI) return;

        const bestMoveEl = document.getElementById("best-move");
        const continuationEl = document.getElementById("continuation");
        const evalScoreEl = document.getElementById("eval-score");
        const evalBarEl = document.getElementById("eval-bar");
        const bestMoveContainer = document.getElementById("best-move-container");
        const evalContainer = document.getElementById("evaluation-bar-container");

        const from = result.bestMoveUCI.substring(0, 2).toUpperCase();
        const to = result.bestMoveUCI.substring(2, 4).toUpperCase();
        const promotion = result.bestMoveUCI.length > 4 ? "=" + result.bestMoveUCI[4].toUpperCase() : "";
        const moveText = `${from} → ${to}${promotion}`;

        if (bestMoveEl) {
            bestMoveEl.textContent = moveText;
            bestMoveEl.style.opacity = isQuick ? "0.7" : "1";
            bestMoveContainer.style.display = "block";
        }

        if (continuationEl && result.line) {
            continuationEl.textContent = result.line.substring(0, 60);
        }

        let evalText = "0.00";
        let evalPercent = 50;

        if (result.mate !== null) {
            evalText = result.mate > 0 ? `M${result.mate}` : `M${Math.abs(result.mate)}`;
            evalPercent = result.mate > 0 ? 100 : 0;
        } else if (result.evaluation !== undefined) {
            evalText = (result.evaluation >= 0 ? "+" : "") + result.evaluation.toFixed(2);
            evalPercent = Math.max(0, Math.min(100, 50 + 5 * result.evaluation));
        }

        if (evalScoreEl) {
            evalScoreEl.textContent = evalText;
            evalScoreEl.style.color = result.mate ? "#ffd700" :
                result.evaluation > 0 ? "#00e676" : "#ff6b6b";
            evalContainer.style.display = "block";
        }

        if (evalBarEl) {
            evalBarEl.style.width = evalPercent + "%";
            evalBarEl.style.background = result.mate ? 
                "linear-gradient(90deg, #ffd700, #ffa000)" :
                result.evaluation > 0 ? 
                "linear-gradient(90deg, #00e676, #00c853)" :
                "linear-gradient(90deg, #ff6b6b, #ff4646)";
        }

        drawArrow(result.bestMoveUCI.substring(0, 2), result.bestMoveUCI.substring(2, 4));
        showStatus(isQuick ? "Quick analysis..." : "Analysis complete", turnText, "complete");
    }

    function toggleModeSelector() {
        // This would show a mode selection UI
        console.log("Mode selector toggled");
    }

    function updateMoveDisplay(moveCount) {
        const moveEl = document.getElementById("move-number");
        if (moveEl) moveEl.textContent = moveCount;
    }

    function updateDepthDisplay() {
        const depthEl = document.getElementById("depth-value");
        if (depthEl) depthEl.textContent = calculateDepth();
    }

    function updateEngineUI(engineKey) {
        const engine = config.engines[engineKey];
        if (!engine) return;

        const iconEl = document.getElementById("engine-icon");
        const nameEl = document.getElementById("engine-name");

        if (iconEl) iconEl.textContent = engine.icon;
        if (nameEl) nameEl.textContent = engine.name;

        console.log(`🔧 Engine UI updated: ${engine.name}`);
    }

    function manualAnalyze() {
        const fen = extractFEN();
        const moveCount = getMoveCount();
        const turnText = getPlayerToMove(fen);

        if (fen) {
            clearVisuals();
            state.cache.clear();
            analyzePosition(fen, moveCount, turnText);
        }
    }

    function resetAnalyzerState() {
        if (state.analysisController) {
            state.analysisController.abort();
        }

        stopRealTimeFENMonitor();

        state.lastFEN = null;
        state.lastMoveCount = 0;
        state.cache.clear();
        clearVisuals();
        state.currentAnalysisId++;
        state.lastAnalyzedFEN = null;
        state.analysisController = null;
        config.autoMove.autoMovesCount = 0;
        updateAutoMoveCounter();

        if (config.autoDetectTimeControl) {
            setTimeout(() => {
                const timeControl = detectTimeControl();
                if (timeControl !== state.currentTimeControl) {
                    state.currentTimeControl = timeControl;
                }
            }, 1000);
        }

        detectPlayerColor();
        updatePlayerColorDisplay();

        // Restart monitoring
        startRealTimeFENMonitor();
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function initialize() {
        console.log("🎯 Initializing Smart Chess Analyzer...");

        createOverlay();
        showStatus("Initializing...");

        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;

            if (getBoard()) {
                clearInterval(checkInterval);
                showStatus("Board detected - monitoring active");

                if (config.autoDetectTimeControl) {
                    const timeControl = detectTimeControl();
                    state.currentTimeControl = timeControl;
                    console.log(`🎯 Auto-detected: ${timeControl.toUpperCase()}`);
                }

                detectPlayerColor();
                updatePlayerColorDisplay();

                // START ULTRA-FAST FEN MONITORING
                startRealTimeFENMonitor();

                setTimeout(() => processGameStateInstant(), 500);

            } else if (attempts > 30) {
                clearInterval(checkInterval);
                showStatus("No board found - waiting...");
            }
        }, 200);
    }

    // ============================================
    // GLOBAL API
    // ============================================

    window.chessSmartAnalyzer = {
        start() {
            initialize();
            console.log("✅ Smart Analyzer started");
        },

        stop() {
            stopRealTimeFENMonitor();
            state.observers.forEach(obs => obs.disconnect());
            state.observers = [];
            clearVisuals();
            showStatus("Stopped", "", "idle");
            console.log("⏸️ Smart Analyzer stopped");
        },

        analyze() {
            manualAnalyze();
        },

        setMode(mode) {
            if (config.depthProfiles[mode]) {
                state.currentTimeControl = mode;
                console.log(`⚡ Mode set to: ${mode.toUpperCase()}`);
            } else {
                console.error("Invalid mode. Available:", Object.keys(config.depthProfiles).join(", "));
            }
        },

        enableAutoMove() {
            const toggle = document.getElementById("automove-toggle");
            if (toggle) {
                toggle.checked = true;
                toggle.dispatchEvent(new Event("change"));
            }
            config.autoMove.enabled = true;
            console.log("🤖 Auto-move enabled via API");
        },

        disableAutoMove() {
            const toggle = document.getElementById("automove-toggle");
            if (toggle) {
                toggle.checked = false;
                toggle.dispatchEvent(new Event("change"));
            }
            config.autoMove.enabled = false;
            console.log("⏸️ Auto-move disabled via API");
        },

        moveNow() {
            if (state.lastBestMove) {
                executeAutoMove(state.lastBestMove);
            } else {
                console.warn("No best move available");
            }
        },

        status() {
            const profile = config.depthProfiles[state.currentTimeControl];
            return {
                mode: state.currentTimeControl,
                baseDepth: profile.base,
                maxDepth: profile.max,
                currentDepth: calculateDepth(),
                moveCount: state.lastMoveCount,
                analyzing: state.analyzing,
                cacheSize: state.cache.size,
                autoMove: config.autoMove.enabled,
                autoMoveCount: config.autoMove.autoMovesCount,
                myColor: state.myColor,
                myTurn: isMyTurn(),
                ultraFastMode: true,
                fenCheckInterval: config.fenCheckInterval
            };
        },

        setMoveSpeed(speed) {
            if (config.moveSpeedProfiles[speed]) {
                config.autoMove.moveSpeed = speed;
                console.log(`⚡ Move speed set to: ${speed.toUpperCase()}`);
            } else {
                console.error("Invalid speed. Available:", Object.keys(config.moveSpeedProfiles).join(", "));
            }
        },

        getMoveSpeed: () => config.autoMove.moveSpeed,

        setEngine(engine) {
            if (config.engines[engine]) {
                config.currentEngine = engine;
                updateEngineUI(engine);
                console.log(`🔧 Engine set to: ${engine}`);
            } else {
                console.error("Invalid engine. Available:", Object.keys(config.engines).join(", "));
            }
        },

        getEngine: () => ({
            current: config.currentEngine,
            name: config.engines[config.currentEngine].name,
            available: Object.keys(config.engines)
        }),

        setCustomEngine(endpoint, format = "stockfish", maxDepth = 20) {
            config.customEngineConfig.endpoint = endpoint;
            config.customEngineConfig.format = format;
            config.customEngineConfig.maxDepth = maxDepth;
            config.engines.custom.endpoint = endpoint;
            config.engines.custom.format = format;
            config.engines.custom.maxDepth = maxDepth;
            console.log("✅ Custom engine configured:", endpoint);
            
            if (config.currentEngine === "custom") {
                state.cache.clear();
                manualAnalyze();
            }
        },

        listEngines: () => Object.keys(config.engines).map(key => ({
            key: key,
            name: config.engines[key].name,
            icon: config.engines[key].icon,
            endpoint: config.engines[key].endpoint
        })),

        // NEW: Ultra-fast mode controls
        setFENCheckInterval(ms) {
            if (ms >= 5 && ms <= 1000) {
                config.fenCheckInterval = ms;
                console.log(`⚡ FEN check interval set to ${ms}ms`);
                
                // Restart monitor with new interval
                stopRealTimeFENMonitor();
                startRealTimeFENMonitor();
            } else {
                console.error("Interval must be between 5-1000ms");
            }
        },

        getFENCheckInterval: () => config.fenCheckInterval,

        clearCache() {
            state.cache.clear();
            console.log("🗑️ Cache cleared");
        },

        getStats() {
            return {
                cacheSize: state.cache.size,
                totalAutoMoves: config.autoMove.autoMovesCount,
                currentFEN: state.lastKnownFEN,
                lastAnalyzedFEN: state.lastAnalyzedFEN,
                analyzing: state.analyzing,
                monitoringActive: !!state.fenMonitorInterval
            };
        }
    };

    console.log("🎯 Initializing Smart Chess Analyzer...");

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === "A") {
            e.preventDefault();
            manualAnalyze();
        }
        if (e.ctrlKey && e.shiftKey && e.key === "H") {
            e.preventDefault();
            if (state.overlay) {
                state.overlay.style.display = state.overlay.style.display === "none" ? "block" : "none";
            }
        }
        if (e.ctrlKey && e.shiftKey && e.key === "M") {
            e.preventDefault();
            toggleModeSelector();
        }
        if (e.ctrlKey && e.shiftKey && e.key === "X") {
            e.preventDefault();
            if (state.lastBestMove) {
                executeAutoMove(state.lastBestMove);
            }
        }
    });

    console.log("✨ ULTRA-FAST Smart Chess Analyzer loaded!");
    console.log("⚡ FEN monitoring: EVERY 10ms for instant detection!");
    console.log("🔥 Zero debounce - analyzes immediately on FEN change!");
    console.log("💡 Press Ctrl+Shift+A to analyze position");
    console.log("💡 Press Ctrl+Shift+H to toggle visibility");
    console.log("💡 Press Ctrl+Shift+M to change mode");
    console.log("💡 Press Ctrl+Shift+X to execute best move");

}();
