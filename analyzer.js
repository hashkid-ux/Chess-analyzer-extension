!async function() {
    "use strict";
    console.log("\uD83D\uDE80 Chess Smart Analyzer + Humanized Auto-Move (Enhanced UI)"), console.warn("âš ï¸ Auto-move is for LEARNING ONLY - Not for live games!");
    const ENGINE_LIMITS = {
    stockfish: {
        maxDepth: 15,  // Stockfish Online fails above depth 15
        maxMoves: 30, // No move limit
        name: "Stockfish Online"
    },
    chessapi: {
        maxDepth: 20,
        maxMoves: 20,  // Chess-API.com stops after 20 half-moves (10 full moves)
        name: "Chess-API.com"
    },
    lichess: {
        maxDepth: 20,
        maxMoves: 40,  // Lichess Cloud typically stops around 40 half-moves
        name: "Lichess Cloud"
    },
    chessdb: {
        maxDepth: 20,
        maxMoves: 999, // ChessDB has extensive opening book
        name: "ChessDB"
    },
    custom: {
        maxDepth: 20,
        maxMoves: 999,
        name: "Custom Engine"
    },
    local: {
        maxDepth: 25,
        maxMoves: 999,
        name: "Local Engine"
    }
};
    let e = {
            engines: {
                stockfish: {
                    name: "Stockfish Online",
                    endpoint: "https://stockfish.online/api/s/v2.php",
                    color: "#3b82f6",
                    icon: "\uD83D\uDC1F",
                    format: "stockfish",
                    maxDepth: 24
                },
                lichess: {
                    name: "Lichess Cloud",
                    endpoint: "https://lichess.org/api/cloud-eval",
                    color: "#10b981",
                    icon: "â™Ÿï¸",
                    format: "lichess",
                    maxDepth: 20
                },
                chessdb: {
                    name: "ChessDB",
                    endpoint: "https://www.chessdb.cn/cdb.php",
                    color: "#f59e0b",
                    icon: "\uD83D\uDCDA",
                    format: "chessdb",
                    maxDepth: 18
                },
                chessapi: {
                    name: "Chess-API.com",
                    endpoint: "https://chess-api.com/v1",
                    color: "#00e676",
                    icon: "ðŸ¦†",
                    format: "postApi",
                    maxDepth: 18
                },
                custom: {
                    name: "Custom Engine",
                    endpoint: "",
                    color: "#8b5cf6",
                    icon: "âš™ï¸",
                    format: "stockfish",
                    maxDepth: 20
                },
                local: {
                    name: "Local Engine",
                    endpoint: "http://localhost:8080/analyze",
                    color: "#ec4899",
                    icon: "\uD83C\uDFE0",
                    format: "stockfish",
                    maxDepth: 25
                }
            },
            currentEngine: "stockfish",
            customEngineConfig: {
                endpoint: "",
                format: "stockfish",
                maxDepth: 20
            },
            depthProfiles: {
                bullet: {
                    base: 10,
                    max: 12,
                    timePerMove: 500,
                    color: "#ff5722"
                },
                blitz: {
                    base: 12,
                    max: 15,
                    timePerMove: 800,
                    color: "#ffc107"
                },
                rapid: {
                    base: 15,
                    max: 18,
                    timePerMove: 1500,
                    color: "#4caf50"
                },
                classical: {
                    base: 18,
                    max: 22,
                    timePerMove: 3e3,
                    color: "#2196f3"
                },
                daily: {
                    base: 20,
                    max: 24,
                    timePerMove: 5e3,
                    color: "#9c27b0"
                },
                unlimited: {
                    base: 18,
                    max: 20,
                    timePerMove: 2e3,
                    color: "#607d8b"
                }
            },
            debounceMs: 100,
            minTimeBetweenAnalyses: 150,
            visualFeedback: "subtle",
            overlayZIndex: 999999,
            autoDetectTimeControl: !0,
            autoMove: {
                enabled: !1,
                onlyMyTurn: !0,
                safetyMode: !0,
                minDelay: 0,
                maxDelay: 0.2,
                humanize: !0,
                confirmFirst: !0,
                blockLiveGames: !0,
                autoMovesCount: 0,
                moveSpeed: "normal"
            },
            moveSpeedProfiles: {
                slow: {
                    dragSteps: 22,
                    stepDelay: 28,
                    arcMultiplier: 1.3,
                    holdTime: 180,
                    description: "Human-like, careful movement (Rapid/Classical)"
                },
                normal: {
                    dragSteps: 12,
                    stepDelay: 15,
                    arcMultiplier: .9,
                    holdTime: 70,
                    description: "Balanced speed (Blitz/Rapid)"
                },
                fast: {
                    dragSteps: 7,
                    stepDelay: 8,
                    arcMultiplier: .5,
                    holdTime: 30,
                    description: "Quick movement (Blitz/Bullet)"
                },
                instant: {
                    dragSteps: 3,
                    stepDelay: 2,
                    arcMultiplier: .1,
                    holdTime: 10,
                    description: "Lightning fast (Bullet only)"
                }
            }
        },
        t = {
            overlay: null,
            lastFEN: null,
            lastMoveCount: 0,
            analyzing: !1,
            currentTimeControl: "blitz",
            cache: new Map,
            observers: [],
            isMinimized: !1,
            lastBestMove: null,
            myColor: null,
            autoMovePending: !1,
            fenCache: {
                fen: null,
                timestamp: 0,
                ttl: 50
            },
            boardCache: {
                element: null,
                lastCheck: 0,
                checkInterval: 5e3
            },
            turnCache: {
                isMyTurn: !1,
                lastFEN: null
            },
            lastProcessTime: 0,
            analysisController: null,
            currentAnalysisId: 0,
            lastAnalyzedFEN: null,
            pendingFEN: null,
            moveStabilityTimer: null,
            rapidMoveCount: 0,
            lastMoveTimestamp: 0
        },
         STABILITY_WAIT = {
    bullet: 80,      // Was 150
    blitz: 120,      // Was 250
    rapid: 180,      // Was 350
    classical: 250,  // Was 500
    daily: 300,      // Was 600
    unlimited: 150   // Was 400
},
        n = e => new Promise(t => setTimeout(t, e));

    function o(e) {
        return e < .5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2
    }

    function i() {
    try {
        let e = d();
        if (e) {
            // LICHESS: Check orientation class on cg-wrap
            let cgWrap = document.querySelector('.cg-wrap');
            if (cgWrap) {
                let isFlipped = cgWrap.classList.contains('orientation-black');
                t.myColor = isFlipped ? 'b' : 'w';
                return t.myColor;
            }
            
            // CHESS.COM: Check flipped attribute
            let n = e.classList.contains("flipped") || "true" === e.getAttribute("data-flipped");
            if (n !== undefined) {
                t.myColor = n ? "b" : "w";
                return t.myColor;
            }
        }
        
        // LICHESS: Check player components
        let lichessBottom = document.querySelector('.ruser-bottom, .ruser.user-link');
        if (lichessBottom) {
            let colorClass = lichessBottom.className.toLowerCase();
            if (colorClass.includes('white')) t.myColor = 'w';
            else if (colorClass.includes('black')) t.myColor = 'b';
            
            if (t.myColor) return t.myColor;
        }
        
        // CHESS.COM: Check player bottom
        let o = document.querySelector('.player-component.player-bottom, .clock-bottom, [class*="player-bottom"]');
        if (o) {
            let i = o.className.toLowerCase();
            i.includes("white") ? t.myColor = "w" : i.includes("black") && (t.myColor = "b");
        }
        
        // Infer from FEN
        let a = p();
        if (a && !t.myColor) {
            let l = m(a),
                s = d(),
                r = s && (s.classList.contains("flipped") || document.querySelector('.cg-wrap.orientation-black'));
            t.myColor = "White" === l && !r || "Black" === l && r ? "w" : "b";
        }
        
        return t.myColor;
        
    } catch (c) {
        console.error("Color detection error:", c);
        return null;
    }
}

    function a() {
        let e = p();
        if (!e) return !1;
        if (t.turnCache.lastFEN === e) return t.turnCache.isMyTurn;
        let n = e.split(" ")[1],
            o = i();
        if (!o) return !1;
        let a = d();
        if (a && (a.className.includes("anim") || a.className.includes("moving"))) return !1;
        let l = n === o;
        return t.turnCache.isMyTurn = l, t.turnCache.lastFEN = e, l
    }

    function l() {
        return !0
    }

   function s() {
    try {
        // DECLARE URL FIRST (CRITICAL FIX!)
        let url = window.location.href.toLowerCase();
        
        // ========================================
        // LICHESS URL PATTERNS (HIGHEST PRIORITY)
        // ========================================
        if (url.includes('lichess.org')) {
            // Check Lichess-specific URL patterns
            if (url.includes('/ultraBullet') || url.includes('/ultra')) return "bullet";
            if (url.includes('/bullet')) return "bullet";
            if (url.includes('/blitz')) return "blitz";
            if (url.includes('/rapid')) return "rapid";
            if (url.includes('/classical')) return "classical";
            if (url.includes('/correspondence')) return "daily";
            if (url.includes('/analysis') || url.includes('/training') || url.includes('/practice')) return "unlimited";
            if (url.includes('/puzzle')) return "unlimited";
            if (url.includes('/study')) return "unlimited";
            
            // Check Lichess game meta info
            let gameMetaInfo = document.querySelector('.game__meta__infos .setup');
            if (gameMetaInfo) {
                let text = gameMetaInfo.textContent.toLowerCase();
                if (text.includes('bullet')) return "bullet";
                if (text.includes('blitz')) return "blitz";
                if (text.includes('rapid')) return "rapid";
                if (text.includes('classical') || text.includes('standard')) return "classical";
                if (text.includes('correspondence')) return "daily";
                if (text.includes('unlimited')) return "unlimited";
            }
        }
        
        // ========================================
        // CHESS.COM URL PATTERNS
        // ========================================
        if (url.includes("/daily")) return "daily";
        if (url.includes("/live/bullet") || url.includes("gameType=bullet")) return "bullet";
        if (url.includes("/live/blitz") || url.includes("gameType=blitz")) return "blitz";
        if (url.includes("/live/rapid") || url.includes("gameType=rapid")) return "rapid";
        if (url.includes("/live/classical") || url.includes("gameType=classical")) return "classical";
        if (url.includes("/practice") || url.includes("/analysis") || url.includes("/puzzles") || url.includes("/computer")) return "unlimited";

        // ========================================
        // DOM-BASED DETECTION
        // ========================================
        
        // Check for game setup info in DOM
        let gameInfo = document.querySelector('[data-game-type], [data-time-class], .game-time-control');
        if (gameInfo) {
            let timeClass = (gameInfo.getAttribute('data-game-type') || 
                           gameInfo.getAttribute('data-time-class') || 
                           gameInfo.textContent || '').toLowerCase();
            
            if (timeClass.includes('bullet')) return "bullet";
            if (timeClass.includes('blitz')) return "blitz";
            if (timeClass.includes('rapid')) return "rapid";
            if (timeClass.includes('classical') || timeClass.includes('standard')) return "classical";
            if (timeClass.includes('daily') || timeClass.includes('correspondence')) return "daily";
        }

        // ========================================
        // CLOCK-BASED DETECTION (LICHESS + CHESS.COM)
        // ========================================
        
        // Check if clocks exist at all - IMPROVED SELECTORS
        let clockElements = document.querySelectorAll(
            '.clock-component, .clock-time-monospace, [role="timer"], .clock, ' +
            '.rclock .time, .clock-time' // Added Lichess-specific selectors
        );
        
        // NO CLOCKS FOUND = Check if it's analysis/practice mode
        if (clockElements.length === 0) {
            if (url.includes('analysis') || url.includes('practice') || url.includes('puzzle')) {
                console.log("âœ… Analysis/Practice mode detected - Using UNLIMITED");
                return "unlimited";
            }
            console.log("âœ… No clocks but active game - Using BLITZ as default");
            return "blitz";
        }

        // Parse clock times with improved accuracy
        let clocks = document.querySelectorAll(
            '.clock-time-monospace, .clock-component [role="timer"], .clock time, .clock-time, ' +
            '.rclock .time' // LICHESS CLOCK SELECTOR
        );
        
        let totalSeconds = 0;
        let clockCount = 0;
        let allClocksZero = true;

        clocks.forEach(clock => {
            let timeText = clock.textContent.trim();
            
            // IMPROVED REGEX: Handle both "01:00" and "01<sep>:</sep>00" formats
            let timeMatch = timeText.match(/(\d+)[\s:]*(\d+)/);
            
            if (timeMatch) {
                let mins = parseInt(timeMatch[1], 10);
                let secs = parseInt(timeMatch[2], 10);
                let totalSecs = (mins * 60) + secs;
                
                // Track if ANY clock has time
                if (totalSecs > 0) {
                    allClocksZero = false;
                    totalSeconds += totalSecs;
                    clockCount++;
                }
            }
        });

        // If all clocks show 0:00, assume BLITZ (game ended or starting)
        if (clockElements.length > 0 && allClocksZero) {
            console.log("âœ… All clocks at 0:00 - Using BLITZ as default");
            return "blitz";
        }

        // Calculate average time per player
        if (clockCount > 0) {
            let avgTime = totalSeconds / clockCount;
            
            // Classification based on starting time:
            if (avgTime < 180) return "bullet";      // < 3 min
            if (avgTime < 600) return "blitz";       // 3-10 min
            if (avgTime < 1800) return "rapid";      // 10-30 min
            return "classical";                       // 30+ min
        }

        // ========================================
        // PAGE TITLE FALLBACK
        // ========================================
        let pageTitle = document.title.toLowerCase();
        if (pageTitle.includes('bullet')) return "bullet";
        if (pageTitle.includes('blitz')) return "blitz";
        if (pageTitle.includes('rapid')) return "rapid";
        if (pageTitle.includes('classical')) return "classical";
        if (pageTitle.includes('daily')) return "daily";

        // DEFAULT TO BLITZ (most common online mode)
        console.log("âœ… No time control detected - Using BLITZ as safe default");
        return "blitz";

    } catch (err) {
        console.error("Time control detection error:", err);
        return "blitz"; // Safe default
    }
}


    function r() {
        let n = e.depthProfiles[t.currentTimeControl],
            o = n.base;
        return t.lastMoveCount < 10 ? o = Math.max(n.base - 2, 8) : t.lastMoveCount > 30 && (o = Math.min(n.max, n.base + 2)), o
    }

    function d() {
    let e = Date.now();
    if (t.boardCache.element && e - t.boardCache.lastCheck < t.boardCache.checkInterval && document.contains(t.boardCache.element)) return t.boardCache.element;
    
    // LICHESS PRIORITY SELECTORS
    for (let n of [
        "cg-container",           // Lichess uses chessground
        ".cg-wrap",
        "chess-board",            // Lichess board component
        ".main-board cg-container",
        ".round__app__board cg-container",
        "wc-chess-board",         // Chess.com fallback
        ".board"
    ]) {
        let o = document.querySelector(n);
        if (o) {
            t.boardCache.element = o;
            t.boardCache.lastCheck = e;
            return o;
        }
    }
    
    let i = document.querySelector(".board-area, .chessboard, [data-board], .round__app__board");
    if (i) {
        t.boardCache.element = i;
        t.boardCache.lastCheck = e;
    }
    return i;
}

    async function C(n, o, abortSignal = null) {
    let moveCount = u(); // Get current move number
    
    // AUTO-SWITCH ENGINE IF NEEDED
    let engineToUse = autoSwitchEngineIfNeeded(e.currentEngine, moveCount, o);
    
    if (!engineToUse) {
        console.error("âŒ No suitable engine available for this position");
        M("Position too complex for available engines", "", "error");
        return null;
    }

    let i = `${engineToUse}|${n}|${o}`;

    // Check cache first
    if (t.cache.has(i)) return t.cache.get(i);

    try {
        let a = e.engines[engineToUse],
            l = "",
            s = {
                signal: abortSignal || (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined),
                headers: {
                    Accept: "application/json"
                }
            };

        // Build request URL based on engine type
        if (engineToUse === "custom") {
            if (!e.customEngineConfig.endpoint) {
                console.error("âŒ Custom engine endpoint not configured");
                return null;
            }
            if (e.customEngineConfig.format === "postApi") {
                l = e.customEngineConfig.endpoint;
                s.method = "POST";
                s.headers["Content-Type"] = "application/json";
                s.body = JSON.stringify({
                    fen: n,
                    depth: o,
                    variants: 1
                });
            } else {
                l = `${e.customEngineConfig.endpoint}?fen=${encodeURIComponent(n)}&depth=${o}`;
            }
        } else if (engineToUse === "chessapi") {
            l = a.endpoint;
            s.method = "POST";
            s.headers["Content-Type"] = "application/json";
            s.body = JSON.stringify({
                fen: n,
                depth: o,
                variants: 1
            });
        } else {
            l = a.format === "stockfish" ?
                `${a.endpoint}?fen=${encodeURIComponent(n)}&depth=${o}` :
                a.format === "lichess" ?
                `${a.endpoint}?fen=${encodeURIComponent(n)}&multiPv=1` :
                a.format === "chessdb" ?
                `${a.endpoint}?action=querypv&board=${encodeURIComponent(n)}` :
                `${a.endpoint}?fen=${encodeURIComponent(n)}&depth=${o}`;
        }

        // Make API request
        let r = await fetch(l, s);

        if (r.status === 204) {
            console.warn("âš ï¸ API returned 204 No Content");
            return null;
        }

        if (!r.ok) {
            throw new Error(`HTTP ${r.status}`);
        }

        let d;

        // ============================================
        // SPECIAL HANDLING FOR CHESSDB WITH FALLBACK
        // ============================================
        if (a.format === "chessdb") {
            const txt = await r.text();
            console.log("ðŸ“¥ CHESSDB Raw Response:", txt);

            const txtLower = txt.trim().toLowerCase();
            if (txtLower === "unknown" ||
                txtLower === "" ||
                txtLower === "nobestmove" ||
                txt.includes("status:unknown")) {

                console.warn("âš ï¸ ChessDB has no data â€” PERMANENTLY switching to Stockfish!");
                e.currentEngine = "stockfish";
                A("stockfish");

                try {
                    const fallbackResult = await C(n, o, abortSignal);
                    if (fallbackResult && fallbackResult.bestMoveUCI) {
                        return fallbackResult;
                    }
                } catch (fallbackError) {
                    console.error("âŒ Stockfish also failed:", fallbackError);
                    return null;
                }
            }

            // Parse ChessDB CSV format
            d = {};
            txt.split(",").forEach(pair => {
                const [key, value] = pair.split(":");
                if (!key || value === undefined) return;

                if (key === "score" || key === "depth") {
                    d[key] = parseInt(value, 10);
                } else if (key === "pv") {
                    d[key] = value;
                } else if (key === "status") {
                    d[key] = value;
                }
            });

            if (d.status && d.status.toLowerCase() === "unknown") {
                e.currentEngine = "stockfish";
                A("stockfish");
                try {
                    return await C(n, o, abortSignal);
                } catch (fallbackError) {
                    return null;
                }
            }

            if (!d.pv || d.pv.trim() === "") {
                e.currentEngine = "stockfish";
                A("stockfish");
                try {
                    return await C(n, o, abortSignal);
                } catch (fallbackError) {
                    return null;
                }
            }

        } else {
            d = await r.json();
        }

        console.log("ðŸ“¥ API Response parsed:", d);

        // Parse response into standard format
        let c = parseEngineResponse(d, a.format);

        if (!c || !c.bestMoveUCI) {
            console.warn("âš ï¸ No valid move in parsed response");

            // MOVE LIMIT REACHED - Try fallback
            if (engineToUse === "chessapi" || engineToUse === "lichess") {
                console.warn(`âš ï¸ ${ENGINE_LIMITS[engineToUse].name} move limit reached - trying fallback...`);
                
                let fallbackEngine = autoSwitchEngineIfNeeded(engineToUse, moveCount + 1, o);
                if (fallbackEngine && fallbackEngine !== engineToUse) {
                    try {
                        return await C(n, o, abortSignal);
                    } catch (err) {
                        console.error("âŒ Fallback engine also failed:", err);
                    }
                }
            }

            if (a.format === "chessdb") {
                e.currentEngine = "stockfish";
                A("stockfish");
                try {
                    return await C(n, o, abortSignal);
                } catch (fallbackError) {
                    return null;
                }
            }

            return null;
        }

        // Cache the valid result
        if (t.cache.size > 100) {
            t.cache.delete(t.cache.keys().next().value);
        }
        t.cache.set(i, c);

        return c;

    } catch (p) {
        if (p.name === 'AbortError') {
            throw p;
        }

        console.error(`âŒ Analysis error (${engineToUse}):`, p);

        // ERROR FALLBACK
        if (engineToUse === "chessdb" || engineToUse === "chessapi" || engineToUse === "lichess") {
            let fallbackEngine = autoSwitchEngineIfNeeded(engineToUse, moveCount + 1, o);
            if (fallbackEngine && fallbackEngine !== engineToUse) {
                try {
                    return await C(n, o, abortSignal);
                } catch (fallbackError) {
                    console.error("âŒ Fallback failed:", fallbackError);
                }
            }
        }

        return null;
    }
}

function c() {
    // LICHESS PRIORITY SELECTORS
    const selectors = [
        '.moves',                          // Lichess main move list
        '.tview2',                         // Lichess table view
        '.analyse__moves',                 // Lichess analysis moves
        'l4x',                             // Lichess move container
        '.move-list-component',            // Chess.com
        '.vertical-move-list',
        '[class*="move-list"]',
        '[class*="moveList"]',
        '[data-test-element="vertical-move-list"]'
    ];
    
    for (let selector of selectors) {
        let element = document.querySelector(selector);
        if (element) return element;
    }
    
    // Fallback: find container with move notation
    let allDivs = document.querySelectorAll('div');
    for (let div of allDivs) {
        let text = div.textContent;
        if (text && /\d+\.\s*[a-h][1-8]/.test(text)) {
            return div;
        }
    }
    
    return null;
}

    function p(forceRefresh = !1) {
        let e = Date.now();
        if (!forceRefresh && t.fenCache.fen && e - t.fenCache.timestamp < t.fenCache.ttl) return t.fenCache.fen;
        try {
            let n = d();
            if (!n) return t.fenCache.fen = null, null;
            let o = null;
            if (n.game?.getFEN) try {
                if ((o = n.game.getFEN())?.length > 20) {
                    if (o !== t.fenCache.fen) {
                        t.boardCache.lastCheck = 0
                    }
                    return t.fenCache.fen = o, t.fenCache.timestamp = e, o
                }
            } catch (i) {}
            let a = [window.chessGame, window.liveGameData, window.gameData];
            for (let l of a)
                if (l) try {
                    let s = l.getFEN?.() || l.game?.fen || l.fen;
                    if (s?.length > 20) {
                        if (s !== t.fenCache.fen) {
                            t.boardCache.lastCheck = 0
                        }
                        return o = s, t.fenCache.fen = o, t.fenCache.timestamp = e, o
                    }
                } catch (r) {}
            try {
                let c = n.getAttribute("data-fen") || n.dataset?.fen;
                if (c?.length > 20) {
                    if (c !== t.fenCache.fen) {
                        t.boardCache.lastCheck = 0
                    }
                    return o = c, t.fenCache.fen = o, t.fenCache.timestamp = e, o
                }
            } catch (p) {}
            return t.fenCache.fen = null, null
        } catch (u) {
            return console.error("FEN extraction error:", u), t.fenCache.fen = null, null
        }
    }

    function parseFenFromChessground(cgBoard) {
    try {
        let pieces = cgBoard.querySelectorAll('piece');
        if (pieces.length === 0) return null;
        
        // Build 8x8 board array
        let board = Array(8).fill(null).map(() => Array(8).fill('.'));
        
        pieces.forEach(piece => {
            let classes = piece.className;
            let style = piece.getAttribute('style');
            
            // Extract piece type (e.g., "white rook" -> "R")
            let pieceMap = {
                'white pawn': 'P', 'black pawn': 'p',
                'white knight': 'N', 'black knight': 'n',
                'white bishop': 'B', 'black bishop': 'b',
                'white rook': 'R', 'black rook': 'r',
                'white queen': 'Q', 'black queen': 'q',
                'white king': 'K', 'black king': 'k'
            };
            
            let pieceChar = null;
            for (let [key, value] of Object.entries(pieceMap)) {
                if (classes.includes(key.split(' ')[0]) && classes.includes(key.split(' ')[1])) {
                    pieceChar = value;
                    break;
                }
            }
            
            if (!pieceChar) return;
            
            // Extract position from transform (e.g., "transform: translate(364px, 364px)")
            let transformMatch = style.match(/translate\((\d+)px,\s*(\d+)px\)/);
            if (!transformMatch) return;
            
            let x = parseInt(transformMatch[1]);
            let y = parseInt(transformMatch[2]);
            
            // Convert pixel position to square (assuming 52px per square)
            let squareSize = 52;
            let file = Math.floor(x / squareSize);
            let rank = 7 - Math.floor(y / squareSize); // Inverted for FEN
            
            if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
                board[rank][file] = pieceChar;
            }
        });
        
        // Convert board array to FEN notation
        let fenRows = board.map(row => {
            let fenRow = '';
            let emptyCount = 0;
            
            for (let square of row) {
                if (square === '.') {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        fenRow += emptyCount;
                        emptyCount = 0;
                    }
                    fenRow += square;
                }
            }
            
            if (emptyCount > 0) fenRow += emptyCount;
            return fenRow;
        }).join('/');
        
        // Determine whose turn it is (check for move indicators or default to white)
        let turn = 'w'; // Default to white
        
        // Add basic castling rights and en passant placeholder
        return `${fenRows} ${turn} KQkq - 0 1`;
        
    } catch (err) {
        console.error("Chessground FEN parsing error:", err);
        return null;
    }
}

    function u() {
        try {
            let e = c();
            if (!e) return 0;
            let t = e.querySelectorAll('.node, .move, .move-text-component, [class*="move"]'),
                n = Array.from(t).filter(e => {
                    let t = e.textContent.trim();
                    return t && /^[a-h1-8NBRQK+#=x-]+$/.test(t) && t.length > 1
                });
            return Math.ceil(n.length / 2)
        } catch (o) {
            return 0
        }
    }

    function m(e) {
        if (!e) return "Unknown";
        let t = e.split(" ");
        return t.length >= 2 && "w" === t[1] ? "White" : "Black"
    }

    function g(e, t) {
    if (!e) return null;
    
    let n = e.getBoundingClientRect();
    
    // Try to find the actual board element for accurate sizing
    let boardEl = e.querySelector('cg-board') || e.querySelector('chess-board') || e;
    if (boardEl !== e) {
        n = boardEl.getBoundingClientRect();
    }
    
    let o = Math.min(n.width, n.height) / 8;
    let i = t.charCodeAt(0) - 97;  // file (a-h = 0-7)
    let a = parseInt(t[1]) - 1;     // rank (1-8 = 0-7)
    
    // Check if board is flipped (LICHESS uses orientation-black class)
    let l = e.classList.contains("flipped") || 
            document.querySelector('.cg-wrap.orientation-black') !== null;
    
    return {
        x: n.left + (l ? 7 - i : i) * o + o / 2,
        y: n.top + (l ? a : 7 - a) * o + o / 2,
        squareSize: o
    };
}

function getLichessSquareElement(square) {
    // LICHESS: Find the actual square element in chessground
    let cgBoard = document.querySelector('cg-board');
    if (!cgBoard) return null;
    
    // Chessground uses data-key attribute for squares
    let squareEl = cgBoard.querySelector(`[data-key="${square}"]`);
    if (squareEl) return squareEl;
    
    // Fallback: use coordinate-based detection
    return cgBoard;
}

    function b(e, t, n = {}) {
        let o = Object.assign({
            bubbles: !0,
            cancelable: !0,
            composed: !0,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: !0,
            clientX: n.clientX || 0,
            clientY: n.clientY || 0,
            button: n.button || 0,
            buttons: void 0 !== n.buttons ? n.buttons : 0 === n.button ? 1 : 0,
            pressure: void 0 !== n.pressure ? n.pressure : .5
        }, n);
        try {
            let i = new PointerEvent(t, o);
            (e || document).dispatchEvent(i)
        } catch (a) {
            try {
                let l = new MouseEvent(t.replace("pointer", "mouse"), {
                    bubbles: o.bubbles,
                    cancelable: o.cancelable,
                    clientX: o.clientX,
                    clientY: o.clientY,
                    button: o.button,
                    buttons: o.buttons
                });
                (e || document).dispatchEvent(l)
            } catch (s) {
                try {
                    e && "function" == typeof e.click && e.click()
                } catch (r) {}
            }
        }
    }

    function $(t, n, o = 36) {
        if ("none" === e.visualFeedback) return;
        let i = document.createElement("div"),
            a = "full" === e.visualFeedback ? .6 : .4,
            l = "full" === e.visualFeedback ? 300 : 160;
        Object.assign(i.style, {
            position: "fixed",
            left: t - o / 2 + "px",
            top: n - o / 2 + "px",
            width: o + "px",
            height: o + "px",
            backgroundColor: "#ffeb3b",
            opacity: String(a),
            pointerEvents: "none",
            zIndex: String(e.overlayZIndex + 1e3),
            borderRadius: "50%",
            transition: `all ${l}ms ease`
        }), document.body.appendChild(i), setTimeout(() => {
            i.style.opacity = "0", i.style.transform = "scale(1.4)", setTimeout(() => i.remove(), l + 50)
        }, "full" === e.visualFeedback ? 260 : 80)
    }

    function f(t, n) {
        "none" !== e.visualFeedback && function t(n, o, i = 8, a = !0) {
            try {
                if (y(), "none" === e.visualFeedback) return;
                let l = d();
                if (!l) return;
                let s = l.getBoundingClientRect(),
                    r = Math.min(s.width, s.height) / 8;

                function c(e) {
                    let t = e.charCodeAt(0) - 97,
                        n = parseInt(e[1], 10) - 1,
                        o = l.classList.contains("flipped");
                    return {
                        x: (o ? 7 - t : t) * r + r / 2,
                        y: (o ? n : 7 - n) * r + r / 2
                    }
                }
                let p = c(n),
                    u = c(o),
                    m = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                m.classList.add("smart-analyzer-arrow"), Object.assign(m.style, {
                    pointerEvents: "none",
                    position: "absolute",
                    left: s.left + "px",
                    top: s.top + "px",
                    width: s.width + "px",
                    height: s.height + "px",
                    zIndex: e.overlayZIndex - 1
                });
                let g = document.createElementNS("http://www.w3.org/2000/svg", "line");
                g.setAttribute("x1", p.x), g.setAttribute("y1", p.y), g.setAttribute("x2", u.x), g.setAttribute("y2", u.y), g.setAttribute("stroke", a ? "#2ecc71" : "#7ddc9f"), g.setAttribute("stroke-width", String(i)), g.setAttribute("stroke-linecap", "round"), m.appendChild(g);
                let b = document.createElementNS("http://www.w3.org/2000/svg", "polygon"),
                    $ = Math.atan2(u.y - p.y, u.x - p.x),
                    f = 4.5 * i,
                    v = u.x,
                    h = u.y;
                if (b.setAttribute("points", `${v},${h} ${v-f*Math.cos($-Math.PI/6)},${h-f*Math.sin($-Math.PI/6)} ${v-f*Math.cos($+Math.PI/6)},${h-f*Math.sin($+Math.PI/6)}`), b.setAttribute("fill", a ? "#2ecc71" : "#7ddc9f"), m.appendChild(b), document.body.appendChild(m), "full" === e.visualFeedback) {
                    let x = document.createElement("div");
                    x.classList.add("smart-analyzer-highlight"), Object.assign(x.style, {
                        position: "absolute",
                        left: s.left + p.x - r / 2 + "px",
                        top: s.top + p.y - r / 2 + "px",
                        width: r + "px",
                        height: r + "px",
                        backgroundColor: "#2ecc71",
                        opacity: "0.25",
                        pointerEvents: "none",
                        zIndex: e.overlayZIndex - 2,
                        borderRadius: "4px"
                    });
                    let _ = x.cloneNode();
                    Object.assign(_.style, {
                        left: s.left + u.x - r / 2 + "px",
                        top: s.top + u.y - r / 2 + "px"
                    }), document.body.appendChild(x), document.body.appendChild(_)
                }
            } catch (C) {
                console.error("Visual error:", C)
            }
        }(t, n, "full" === e.visualFeedback ? 8 : 4, "full" === e.visualFeedback)
    }

    function y() {
        document.querySelectorAll(".smart-analyzer-arrow, .smart-analyzer-highlight").forEach(e => e.remove())
    }
    async function v(t) {
    let o = d();
    if (!o) return console.error("âŒ Board not found for clickSquare"), !1;
    
    let i = g(o, t);
    if (!i) return console.error("âŒ Could not get coords for", t), !1;
    
    let { x: a, y: l, squareSize: s } = i;
    
    // LICHESS: Try to find specific square element
    let r = getLichessSquareElement(t) || document.elementFromPoint(Math.round(a), Math.round(l)) || o;
    
    if (!o.contains(r)) {
        let c = r;
        for (; c && !o.contains(c);) c = c.parentElement;
        r = c || o;
    }
    
    // Simulate click events
    b(r, "pointerover", { clientX: a, clientY: l });
    b(r, "pointerenter", { clientX: a, clientY: l });
    b(r, "pointerdown", { clientX: a, clientY: l, button: 0, buttons: 1 });
    await n(30 + Math.round(80 * Math.random()));
    b(r, "pointerup", { clientX: a, clientY: l, button: 0, buttons: 0 });
    
    "none" !== e.visualFeedback && $(a, l, "full" === e.visualFeedback ? 50 : 28);
    console.log(`âœ… Click simulated at ${t.toUpperCase()} â†’ (${Math.round(a)},${Math.round(l)})`);
    return !0;
}
    async function h(i, a) {
        let l = d();
        if (!l) return console.error("âŒ Board not found for dragPiece"), !1;
        let s = g(l, i),
            r = g(l, a);
        if (!s || !r) return console.error("âŒ Could not calculate drag coordinates", i, a), !1;
        let {
            x: c,
            y: p,
            squareSize: u
        } = s, {
            x: m,
            y: f
        } = r, y, v = e.autoMove.moveSpeed;
        if (e.autoMove.moveSpeed && e.moveSpeedProfiles[e.autoMove.moveSpeed]) y = e.moveSpeedProfiles[e.autoMove.moveSpeed];
        else switch (t.currentTimeControl) {
            case "bullet":
                y = e.moveSpeedProfiles.fast, v = "fast (auto)";
                break;
            case "blitz  ":
            case "rapid":
            default:
                y = e.moveSpeedProfiles.normal, v = "normal (auto)";
                break;
            case "classical":
                y = e.moveSpeedProfiles.slow, v = "slow (auto)"
        }
        let h = Math.max(6, .06 * u);
        e.autoMove.humanize && (c += (Math.random() - .5) * h, p += (Math.random() - .5) * h, m += (Math.random() - .5) * h, f += (Math.random() - .5) * h);
        let x = Math.max(6, Math.min(.12 * Math.hypot(m - c, f - p), .6 * u)) * (e.autoMove.humanize ? .6 + .8 * Math.random() : 0) * y.arcMultiplier,
            _ = m - c,
            C = f - p,
            z = Math.hypot(_, C) || 1,
            E = -C / z,
            k = _ / z,
            w = document.elementFromPoint(Math.round(c), Math.round(p)) || l;
        if (!l.contains(w)) {
            let M = w;
            for (; M && !l.contains(M);) M = M.parentElement;
            w = M || l
        }
        b(w, "pointerover", {
            clientX: c,
            clientY: p
        }), b(w, "pointerenter", {
            clientX: c,
            clientY: p
        }), b(w, "pointerdown", {
            clientX: c,
            clientY: p,
            button: 0,
            buttons: 1
        }), await n(y.holdTime + Math.round(Math.random() * (.4 * y.holdTime)));
        let I = y.dragSteps,
            D = y.stepDelay;
        for (let S = 1; S <= I; S++) {
            let A = S / I,
                B = o(A),
                P = c + (m - c) * B,
                T = p + (f - p) * B,
                L = Math.sin(Math.PI * A) * x;
            P += E * L, T += k * L;
            let N = document.elementFromPoint(Math.round(P), Math.round(T)) || w;
            if (!l.contains(N)) {
                let F = N;
                for (; F && !l.contains(F);) F = F.parentElement;
                N = F || l
            }
            b(N, "pointermove", {
                clientX: P,
                clientY: T,
                button: 0,
                buttons: 1
            }), ("full" === e.visualFeedback || "subtle" === e.visualFeedback && S === Math.floor(I / 2)) && $(P, T, "full" === e.visualFeedback ? 36 : 18), await n(D + Math.round(Math.random() * (.35 * D)))
        }
        let U = document.elementFromPoint(Math.round(m), Math.round(f)) || l;
        if (!l.contains(U)) {
            let O = U;
            for (; O && !l.contains(O);) O = O.parentElement;
            U = O || l
        }
        b(U, "pointerup", {
            clientX: m,
            clientY: f,
            button: 0,
            buttons: 0
        });
        try {
            let q = new MouseEvent("mousedown", {
                    bubbles: !0,
                    clientX: c,
                    clientY: p,
                    button: 0
                }),
                Y = new MouseEvent("mouseup", {
                    bubbles: !0,
                    clientX: m,
                    clientY: f,
                    button: 0
                });
            (w || l).dispatchEvent(q), (U || l).dispatchEvent(Y)
        } catch (R) {}
        return await n(35 + Math.round(120 * Math.random())), console.log(`âœ… Move complete [${v.toUpperCase()}]: ${i.toUpperCase()} â†’ ${a.toUpperCase()}`), !0
    }
async function x(promotionPiece) {
    let piece = (promotionPiece || "q").toLowerCase();
    let pieceMap = { q: "queen", r: "rook", b: "bishop", n: "knight" };
    let pieceName = pieceMap[piece] || "queen";
    
    console.log(`ðŸ” Looking for promotion UI - Target: ${pieceName.toUpperCase()}`);
    await n(250);
    
    let promotionElements = [];
    
    // LICHESS-SPECIFIC SELECTORS
    [
        '.promotion-choice',               // Lichess promotion dialog
        '.cg-wrap .promotion',
        '[data-role="promotion"]',
        '.promotion square',               // Lichess uses <square> tags
        'square[data-role="promotion"]',
        '.promotion-window',               // Chess.com
        '.promotion-dialog',
        '[class*="promotion"]'
    ].forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (el.offsetParent !== null) promotionElements.push(el);
        });
    });
    
    // LICHESS: Find promotion pieces by piece class
    ['queen', 'rook', 'bishop', 'knight'].forEach(p => {
        let lichessSelector = `.promotion square.${p}, .promotion-choice square.${p}`;
        document.querySelectorAll(lichessSelector).forEach(el => {
            if (el.offsetParent !== null) promotionElements.push(el);
        });
    });
    
    // Remove duplicates
    promotionElements = Array.from(new Set(promotionElements)).filter(Boolean);
    console.log(`ðŸ“‹ Found ${promotionElements.length} potential promotion elements`);
    
    // LICHESS: Find by piece class name
    let targetElement = promotionElements.find(el => {
        return el.classList.contains(pieceName) || 
               el.getAttribute('data-role') === piece ||
               el.getAttribute('data-piece') === piece;
    });
    
    // Fallback strategies
    if (!targetElement) {
        targetElement = promotionElements.find(el => {
            let label = (el.getAttribute('aria-label') || el.textContent || '').toLowerCase();
            return label.includes(pieceName);
        });
    }
    
    if (!targetElement && pieceName === "queen" && promotionElements.length > 0) {
        targetElement = promotionElements[0]; // Queen is usually first
        console.log("ðŸ“ Using positional match for Queen (first element)");
    }
    
    // Execute the click
    if (targetElement) {
        try {
            let rect = targetElement.getBoundingClientRect();
            let clickX = rect.left + rect.width / 2;
            let clickY = rect.top + rect.height / 2;
            
            console.log(`âœ… Found promotion target: ${pieceName.toUpperCase()}`);
            
            b(targetElement, "pointerdown", { clientX: clickX, clientY: clickY, button: 0, buttons: 1 });
            await n(30);
            b(targetElement, "pointerup", { clientX: clickX, clientY: clickY, button: 0, buttons: 0 });
            await n(20);
            
            try { targetElement.click(); } catch (err) {}
            
            console.log(`ðŸ‘‘ Promotion executed: ${pieceName.toUpperCase()}`);
            return true;
            
        } catch (err) {
            console.error("âŒ Promotion click failed:", err);
            try {
                targetElement.click();
                return true;
            } catch (err2) {
                console.error("âŒ Fallback click also failed");
            }
        }
    }
    
    console.warn(`âš ï¸ Could not find promotion UI for ${pieceName.toUpperCase()}`);
    return false;
}
    async function _(t) {
        if (e.autoMove.onlyMyTurn && !a()) {
            console.log("â¸ï¸ Not our turn - skipping auto-move");
            return false;
        }

        let fromSquare = t.substring(0, 2);
        let toSquare = t.substring(2, 4);
        let promotionPiece = t.length > 4 ? t[4] : null;

        console.log(`ðŸ¤– Auto-moving: ${fromSquare.toUpperCase()} â†’ ${toSquare.toUpperCase()}${promotionPiece ? ' =' + promotionPiece.toUpperCase() : ''}`);

        try {
            // Show visual feedback
            f(fromSquare, toSquare);

            // Execute the drag move
            if (!await h(fromSquare, toSquare)) {
                console.error("âŒ Failed to drag piece");
                return false;
            }

            // Handle promotion if present
            if (promotionPiece) {
                console.log(`ðŸ‘‘ PROMOTION DETECTED: ${promotionPiece.toUpperCase()}`);
                await n(300); // Longer wait for promotion UI to fully render

                // Try promotion up to 3 times for reliability
                let promotionSuccess = false;
                for (let attempt = 1; attempt <= 3; attempt++) {
                    console.log(`ðŸŽ¯ Promotion attempt ${attempt}/3...`);

                    if (await x(promotionPiece)) {
                        promotionSuccess = true;
                        console.log(`âœ… Promotion successful on attempt ${attempt}`);
                        break;
                    }

                    if (attempt < 3) {
                        console.log(`â³ Waiting before retry...`);
                        await n(200);
                    }
                }

                if (!promotionSuccess) {
                    console.warn("âš ï¸ All promotion attempts failed - move may still complete with default (Queen)");
                }
            }

            // Update counter
            e.autoMove.autoMovesCount++;
            w();

            console.log(`âœ… Auto-move complete! Total moves: ${e.autoMove.autoMovesCount}`);
            return true;

        } catch (err) {
            console.error("âŒ Auto-move error:", err);
            return false;
        }
    }
    // ========================================
// FUNCTION 1: CHECK ENGINE CAPABILITY
// ========================================
function canEngineAnalyze(engineKey, moveCount, depth) {
    const limits = ENGINE_LIMITS[engineKey];
    if (!limits) return false;

    // Calculate half-moves (FEN move count * 2 for both players)
    const halfMoves = moveCount * 2;

    // Check move limit
    if (halfMoves > limits.maxMoves) {
        console.warn(`âš ï¸ ${limits.name} cannot analyze beyond ${limits.maxMoves} half-moves (current: ${halfMoves})`);
        return false;
    }

    // Check depth limit
    if (depth > limits.maxDepth) {
        console.warn(`âš ï¸ ${limits.name} cannot analyze at depth ${depth} (max: ${limits.maxDepth})`);
        return false;
    }

    return true;
}

    
    // ========================================
// FUNCTION 2: AUTO-SWITCH ENGINE WHEN NEEDED
// ========================================
function autoSwitchEngineIfNeeded(currentEngine, moveCount, depth) {
    // If current engine can handle it, no switch needed
    if (canEngineAnalyze(currentEngine, moveCount, depth)) {
        return currentEngine;
    }

    console.log(`ðŸ”„ ${ENGINE_LIMITS[currentEngine].name} cannot handle this position...`);

    // Priority order for fallback (most capable to least)
    const fallbackOrder = ['local', 'custom', 'lichess', 'stockfish', 'chessapi'];
    
    for (let engine of fallbackOrder) {
        // Skip if it's the same engine or doesn't exist
        if (engine === currentEngine || !e.engines[engine]) continue;

        // Check if this engine can handle the position
        if (canEngineAnalyze(engine, moveCount, depth)) {
            console.log(`âœ… Switching to ${ENGINE_LIMITS[engine].name}`);
            e.currentEngine = engine;
            A(engine); // Update UI
            return engine;
        }
    }

    console.error("âŒ No available engine can analyze this position!");
    return null;
}

    async function C(n, o, abortSignal = null) {
        let i = `${e.currentEngine}|${n}|${o}`;

        // Check cache first
        if (t.cache.has(i)) return t.cache.get(i);

        try {
            let a = e.engines[e.currentEngine],
                l = "",
                s = {
                    signal: abortSignal || (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined),
                    headers: {
                        Accept: "application/json"
                    }
                };

            // Build request URL based on engine type
            if (e.currentEngine === "custom") {
                if (!e.customEngineConfig.endpoint) {
                    console.error("âŒ Custom engine endpoint not configured");
                    return null;
                }
                if (e.customEngineConfig.format === "postApi") {
                    console.log("ðŸ“¤ POST API Request:", {
                        fen: n,
                        depth: o
                    });
                    l = e.customEngineConfig.endpoint;
                    s.method = "POST";
                    s.headers["Content-Type"] = "application/json";
                    s.body = JSON.stringify({
                        fen: n,
                        depth: o,
                        variants: 1
                    });
                } else {
                    l = `${e.customEngineConfig.endpoint}?fen=${encodeURIComponent(n)}&depth=${o}`;
                }
            } else if (e.currentEngine === "chessapi") {
                console.log("ðŸ¦† Chess-API.com Request:", {
                    fen: n,
                    depth: o
                });
                l = a.endpoint;
                s.method = "POST";
                s.headers["Content-Type"] = "application/json";
                s.body = JSON.stringify({
                    fen: n,
                    depth: o,
                    variants: 1
                });
            } else {
                l = a.format === "stockfish" ?
                    `${a.endpoint}?fen=${encodeURIComponent(n)}&depth=${o}` :
                    a.format === "lichess" ?
                    `${a.endpoint}?fen=${encodeURIComponent(n)}&multiPv=1` :
                    a.format === "chessdb" ?
                    `${a.endpoint}?action=querypv&board=${encodeURIComponent(n)}` :
                    `${a.endpoint}?fen=${encodeURIComponent(n)}&depth=${o}`;
            }

            // Make API request
            let r = await fetch(l, s);

            if (r.status === 204) {
                console.warn("âš ï¸ API returned 204 No Content");
                return null;
            }

            if (!r.ok) {
                throw new Error(`HTTP ${r.status}`);
            }

            let d;

            // ============================================
            // SPECIAL HANDLING FOR CHESSDB WITH FALLBACK
            // ============================================
            if (a.format === "chessdb") {
                const txt = await r.text();
                console.log("ðŸ“¥ CHESSDB Raw Response:", txt);

                // Check for 'unknown' or 'nobestmove' or empty response
                const txtLower = txt.trim().toLowerCase();
                if (txtLower === "unknown" ||
                    txtLower === "" ||
                    txtLower === "nobestmove" ||
                    txt.includes("status:unknown")) {

                    console.warn("âš ï¸ ChessDB has no data â€” PERMANENTLY switching to Stockfish!");

                    // PERMANENTLY SWITCH TO STOCKFISH - DON'T RESTORE!
                    e.currentEngine = "stockfish";

                    // Update UI to show engine change
                    A("stockfish");

                    try {
                        // Recursively call with Stockfish
                        const fallbackResult = await C(n, o, abortSignal);

                        if (fallbackResult && fallbackResult.bestMoveUCI) {
                            console.log("âœ… Now using Stockfish permanently:", fallbackResult.bestMoveUCI);
                            return fallbackResult;
                        } else {
                            console.warn("âš ï¸ Stockfish returned no move");
                            return null;
                        }
                    } catch (fallbackError) {
                        console.error("âŒ Stockfish also failed:", fallbackError);
                        return null;
                    }
                }

                // Parse ChessDB CSV format: score:X,depth:Y,pv:move1|move2|...
                d = {};
                txt.split(",").forEach(pair => {
                    const [key, value] = pair.split(":");
                    if (!key || value === undefined) return;

                    if (key === "score" || key === "depth") {
                        d[key] = parseInt(value, 10);
                    } else if (key === "pv") {
                        d[key] = value; // Keep as string with | separators
                    } else if (key === "status") {
                        d[key] = value;
                    }
                });

                // If status indicates failure, permanently switch
                if (d.status && d.status.toLowerCase() === "unknown") {
                    console.warn("âš ï¸ ChessDB status:unknown â€” PERMANENTLY switching to Stockfish!");
                    e.currentEngine = "stockfish";
                    A("stockfish");
                    try {
                        const fallbackResult = await C(n, o, abortSignal);
                        return fallbackResult;
                    } catch (fallbackError) {
                        return null;
                    }
                }

                // If no PV moves, permanently switch
                if (!d.pv || d.pv.trim() === "") {
                    console.warn("âš ï¸ ChessDB has no moves â€” PERMANENTLY switching to Stockfish!");
                    e.currentEngine = "stockfish";
                    A("stockfish");
                    try {
                        const fallbackResult = await C(n, o, abortSignal);
                        return fallbackResult;
                    } catch (fallbackError) {
                        return null;
                    }
                }

            } else {
                // Parse JSON for other engines
                d = await r.json();
            }

            console.log("ðŸ“¥ API Response parsed:", d);

            // Parse response into standard format
            let c = parseEngineResponse(d, a.format);

            // Validate the parsed response
            if (!c || !c.bestMoveUCI) {
                console.warn("âš ï¸ No valid move in parsed response");

                // If ChessDB parsing failed, PERMANENTLY switch to Stockfish
                if (a.format === "chessdb") {
                    console.warn("âš ï¸ ChessDB parsing failed â€” PERMANENTLY switching to Stockfish!");
                    e.currentEngine = "stockfish";
                    A("stockfish");
                    try {
                        const fallbackResult = await C(n, o, abortSignal);
                        return fallbackResult;
                    } catch (fallbackError) {
                        return null;
                    }
                }

                return null;
            }

            // Cache the valid result
            if (t.cache.size > 100) {
                t.cache.delete(t.cache.keys().next().value);
            }
            t.cache.set(i, c);

            return c;

        } catch (p) {
            if (p.name === 'AbortError') {
                throw p;
            }

            console.error(`âŒ Analysis error (${e.currentEngine}):`, p);

            // If ChessDB threw an error, PERMANENTLY switch to Stockfish
            if (e.currentEngine === "chessdb") {
                console.warn("âš ï¸ ChessDB request failed â€” PERMANENTLY switching to Stockfish!");
                e.currentEngine = "stockfish";
                A("stockfish");

                try {
                    const fallbackResult = await C(n, o, abortSignal);
                    return fallbackResult;
                } catch (fallbackError) {
                    console.error("âŒ Stockfish also failed:", fallbackError);
                }
            }

            return null;
        }
    }


    // ========================================
    // IMPROVED PARSE ENGINE RESPONSE FUNCTION
    // ========================================
    function parseEngineResponse(t, format) {
        let o = {
            bestMoveUCI: null,
            evaluation: 0,
            mate: null,
            line: ""
        };

        if (!t) {
            console.warn("âš ï¸ Empty response to parse");
            return o;
        }

        try {
            // Handle array responses
            if (Array.isArray(t) && t.length > 0) {
                t = t[0];
            }

            // ========================================
            // CHESSDB FORMAT (CRITICAL FIX)
            // ========================================
            if (t.pv !== undefined) {
                console.log("ðŸ” Parsing ChessDB format...");

                let moves = [];

                // ChessDB uses pipe-separated moves: "e2e4|e7e5|g1f3"
                if (typeof t.pv === "string") {
                    moves = t.pv.split("|").filter(Boolean);
                } else if (Array.isArray(t.pv)) {
                    moves = t.pv.filter(Boolean);
                }

                console.log("ðŸ“‹ ChessDB moves parsed:", moves);

                if (moves.length > 0) {
                    // Get first move - ALREADY in correct format!
                    o.bestMoveUCI = moves[0].trim();
                    o.line = moves.join(" ");

                    console.log("âœ… ChessDB best move:", o.bestMoveUCI);
                } else {
                    console.warn("âš ï¸ ChessDB: No moves in PV");
                    return o; // Return empty, will trigger fallback
                }

                // Parse score (in centipawns)
                if (t.score !== undefined) {
                    const numericScore = parseInt(t.score, 10);
                    if (!isNaN(numericScore)) {
                        o.evaluation = numericScore / 100;
                    }
                }

                // Parse depth
                if (t.depth !== undefined) {
                    o.depth = Number(t.depth);
                }

                console.log("âœ… CHESSDB format parsed successfully:", o);
                return o;
            }

            // ========================================
            // STOCKFISH FORMAT
            // ========================================
            if (t.bestmove && typeof t.bestmove === "string") {
                let move = t.bestmove;

                // Check if it's already in UCI format
                if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) {
                    o.bestMoveUCI = move;
                } else {
                    // Extract from "bestmove e2e4 ponder ..."
                    let m = move.match(/bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
                    if (m) o.bestMoveUCI = m[1];
                }

                if (t.evaluation !== undefined) o.evaluation = parseFloat(t.evaluation);
                if (t.mate !== undefined) o.mate = parseInt(t.mate);
                if (t.continuation) o.line = t.continuation;

                console.log("âœ… STOCKFISH format parsed");
                return o;
            }

            // ========================================
            // LICHESS FORMAT
            // ========================================
            if (t.pvs && Array.isArray(t.pvs) && t.pvs.length > 0) {
                let pv = t.pvs[0];
                if (pv.moves) {
                    o.bestMoveUCI = pv.moves.split(" ")[0];
                    o.line = pv.moves;
                }
                if (pv.cp !== undefined) o.evaluation = pv.cp / 100;
                if (pv.mate !== undefined) o.mate = pv.mate;

                console.log("âœ… LICHESS format parsed");
                return o;
            }

            // ========================================
            // GENERIC FORMAT (POST API, etc.)
            // ========================================
            if (t.move || t.lan || t.bestMove || t.best_move) {
                let mv = t.move || t.lan || t.bestMove || t.best_move;
                if (mv) {
                    o.bestMoveUCI = typeof mv === "string" ?
                        (mv.match(/([a-h][1-8][a-h][1-8][qrbn]?)/)?.[1] || mv) :
                        mv;
                }

                // Parse evaluation from various fields
                if (t.eval !== undefined) o.evaluation = parseFloat(t.eval);
                else if (t.evaluation !== undefined) o.evaluation = parseFloat(t.evaluation);
                else if (t.centipawns !== undefined) o.evaluation = parseFloat(t.centipawns) / 100;
                else if (t.score !== undefined) o.evaluation = parseFloat(t.score) / 100;
                else if (t.cp !== undefined) o.evaluation = parseFloat(t.cp) / 100;

                if (t.mate !== undefined) o.mate = parseInt(t.mate);

                // Parse continuation line
                if (t.continuationArr && Array.isArray(t.continuationArr)) {
                    o.line = t.continuationArr.join(" ");
                } else if (t.line) {
                    o.line = t.line;
                } else if (t.pv) {
                    o.line = Array.isArray(t.pv) ? t.pv.join(" ") : t.pv;
                } else if (t.continuation) {
                    o.line = t.continuation;
                }

                console.log("âœ… POST API format parsed");
                return o;
            }

        } catch (err) {
            console.error("âŒ Parse error:", err);
        }

        if (!o.bestMoveUCI) {
            console.warn("âš ï¸ No best move found in response - will trigger fallback");
        }

        return o;
    }
    async function z(n, o, i) {
    if (!n) return;
    
    // Cancel outdated analysis
    if (t.analysisController) {
        console.log("â¹ï¸ Cancelling outdated analysis...");
        t.analysisController.abort();
        t.analysisController = null;
    }
    
    t.currentAnalysisId++;
    const thisAnalysisId = t.currentAnalysisId;
    
    // REMOVED: Rapid move detection that was blocking analysis
    // Now analyzes immediately every time
    
    t.analyzing = true;
    t.analysisController = new AbortController();
    
    try {
        M("Analyzing...", i, "analyzing");
        let l = r();
        const signal = t.analysisController.signal;
        
        // Quick analysis for fast time controls
        if ("bullet" === t.currentTimeControl || "blitz" === t.currentTimeControl) {
            let s = await C(n, "bullet" === t.currentTimeControl ? 6 : 8, signal);
            
            if (thisAnalysisId !== t.currentAnalysisId) {
                console.log("â­ï¸ Quick analysis outdated");
                return;
            }
            
            const currentFEN = p();
            if (currentFEN !== n) {
                console.log("â­ï¸ Position changed during quick analysis");
                return;
            }
            
            if (s && s.bestMoveUCI) {
                I(s, i, true);
                t.lastBestMove = s.bestMoveUCI;
                
                if (e.autoMove.enabled && !t.autoMovePending && a()) {
                    t.autoMovePending = true;
                    let d = 1000 * e.autoMove.minDelay;
                    setTimeout(async () => {
                        if (e.autoMove.onlyMyTurn && !a()) {
                            t.autoMovePending = false;
                            return;
                        }
                        await _(s.bestMoveUCI);
                        t.autoMovePending = false;
                    }, d);
                }
            }
        }
        
        // Full depth analysis
        let c = await C(n, l, signal);
        
        if (thisAnalysisId !== t.currentAnalysisId) {
            console.log("â­ï¸ Analysis outdated (newer analysis started)");
            return;
        }
        
        const currentFEN = p();
        if (currentFEN !== n) {
            console.log("â­ï¸ Position changed during analysis - result discarded");
            return;
        }
        
        if (c && c.bestMoveUCI) {
            t.lastAnalyzedFEN = n;
            I(c, i, false);
            t.lastBestMove = c.bestMoveUCI;
            
            if (e.autoMove.enabled && !t.autoMovePending && "bullet" !== t.currentTimeControl && "blitz" !== t.currentTimeControl) {
                if (e.autoMove.onlyMyTurn && !a()) {
                    console.log("â¸ï¸ Not our turn - skipping auto-move");
                    return;
                }
                
                t.autoMovePending = true;
                let p = e.autoMove.minDelay + Math.round(Math.random() * (e.autoMove.maxDelay - e.autoMove.minDelay));
                setTimeout(async () => {
                    if (e.autoMove.onlyMyTurn && !a()) {
                        t.autoMovePending = false;
                        return;
                    }
                    await _(c.bestMoveUCI);
                    t.autoMovePending = false;
                }, 1000 * p);
            }
        } else {
            M("Analysis failed", i, "error");
        }
    } catch (u) {
        if (u.name === 'AbortError') {
            console.log("âœ… Analysis cancelled successfully");
        } else {
            console.error("Analysis error:", u);
            M("Analysis error", i, "error");
        }
    } finally {
        t.analyzing = false;
        t.analysisController = null;
        t.fenCache.timestamp = 0;
        t.fenCache.fen = null;
    }
}


    function queueAnalysisWhenStable(fen, moveCount, turnText) {
    // SIMPLIFIED: Just analyze immediately instead of waiting
    // The stability check was causing delays
    const currentFEN = p();
    if (currentFEN === fen) {
        console.log("âœ… Position confirmed - analyzing immediately");
        z(fen, moveCount, turnText);
    } else {
        console.log("â­ï¸ Position changed - skipping");
    }
}

    function E() {
        if (t.overlay) return;
        let n = document.createElement("div");
        n.id = "chess-smart-analyzer", Object.assign(n.style, {
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
            zIndex: e.overlayZIndex,
            fontFamily: "'Segoe UI', 'SF Pro Display', -apple-system, system-ui, sans-serif",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            backdropFilter: "blur(12px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
        }), n.innerHTML = `
      <style>
        #chess-smart-analyzer * {
          box-sizing: border-box;
        }
        
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
        .analyzer-btn:active {
          transform: translateY(0);
        }
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
        
        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stat-label {
          font-size: 10px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        .stat-value {
          font-size: 14px;
          color: #fff;
          font-weight: 700;
        }
        
        /* COLLAPSIBLE SECTIONS */
        .collapsible-section {
          border-radius: 10px;
          margin-bottom: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s ease;
        }
        
        .section-header:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        
        .section-header.collapsed .collapse-icon {
          transform: rotate(-90deg);
        }
        
        .collapse-icon {
          transition: transform 0.3s ease;
          font-size: 10px;
          color: #888;
        }
        
        .section-content {
          max-height: 500px;
          overflow: hidden;
          transition: max-height 0.3s ease, padding 0.3s ease, opacity 0.3s ease;
          padding: 0 12px 12px 12px;
          opacity: 1;
        }
        
        .section-content.collapsed {
          max-height: 0;
          padding: 0 12px;
          opacity: 0;
        }
        
        /* SCROLLBAR */
        #analyzer-body::-webkit-scrollbar {
          width: 6px;
        }
        
        #analyzer-body::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
        }
        
        #analyzer-body::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
        }
        
        #analyzer-body::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
        
        /* RESPONSIVE */
        @media (max-height: 700px) {
          .stat-item { gap: 2px; }
          .stat-label { font-size: 9px; }
          .stat-value { font-size: 12px; }
          .collapsible-section { margin-bottom: 8px; }
          .section-header { padding: 8px 10px; }
          .section-content { padding: 0 10px 10px 10px; }
        }
        
        @media (max-width: 480px) {
          #chess-smart-analyzer {
            right: 10px !important;
            left: 10px !important;
            top: 10px !important;
            max-width: calc(100vw - 20px) !important;
            min-width: unset !important;
          }
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
          <div style="font-size: 18px;">â™Ÿï¸</div>
          <div>
            <div style="font-size: 12px; font-weight: 700; color: #00e676; letter-spacing: 0.3px;">Smart Analyzer</div>
            <div style="font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Educational Tool</div>
          </div>
        </div>
        <div style="display: flex; gap: 4px;">
          <button id="btn-minimize" class="analyzer-btn" title="Minimize" style="min-width: 30px; padding: 5px; font-size: 12px;">â”</button>
          <button id="btn-hide" class="analyzer-btn" title="Close" style="min-width: 30px; padding: 5px; color: #ff6b6b; font-size: 12px;">âœ•</button>
        </div>
      </div>

      <!-- MINIMIZED TOOLBAR -->
      <div id="minimized-toolbar" style="display: none; padding: 10px 12px; background: rgba(0, 0, 0, 0.2); border-bottom: 1px solid rgba(255, 255, 255, 0.08); flex-shrink: 0;">
        <div style="display: flex; gap: 6px; align-items: center; justify-content: space-between;">
          <button id="btn-automove-mini" class="analyzer-btn" title="Toggle Auto-Move" style="flex: 1; font-size: 11px; padding: 8px 6px;">
            <span style="margin-right: 4px;">ðŸ¤–</span> Auto
          </button>
          <button id="btn-analyze-mini" class="analyzer-btn primary" title="Analyze Position" style="flex: 1; font-size: 11px; padding: 8px 6px;">
            <span style="margin-right: 4px;">ðŸ”</span> Analyze
          </button>
          <button id="btn-mode-mini" class="analyzer-btn" title="Change Mode" style="min-width: 36px; padding: 8px;">âš¡</button>
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
            <span>âš¡</span>
            <span>Blitz â€¢ D${e.depthProfiles.blitz.base}</span>
          </div>
        </div>
        
        <!-- MODE SELECTOR -->
        <div id="mode-selector" style="display: none; margin-bottom: 10px; padding: 10px; background: rgba(0, 0, 0, 0.25); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 9px; color: #888; margin-bottom: 8px; font-weight: 700; letter-spacing: 1px;">SELECT MODE</div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px;">
            <button class="mode-btn analyzer-btn" data-mode="bullet" style="padding: 8px 6px; font-size: 9px;">âš¡ Bullet</button>
            <button class="mode-btn analyzer-btn" data-mode="blitz" style="padding: 8px 6px; font-size: 9px;">âš¡ Blitz</button>
            <button class="mode-btn analyzer-btn" data-mode="rapid" style="padding: 8px 6px; font-size: 9px;">ðŸ• Rapid</button>
            <button class="mode-btn analyzer-btn" data-mode="classical" style="padding: 8px 6px; font-size: 9px;">ðŸ‘‘ Classical</button>
            <button class="mode-btn analyzer-btn" data-mode="daily" style="padding: 8px 6px; font-size: 9px;">ðŸ“… Daily</button>
            <button class="mode-btn analyzer-btn" data-mode="unlimited" style="padding: 8px 6px; font-size: 9px;">â™¾ï¸ Unlimited</button>
          </div>
        </div>

        <!-- ENGINE SELECTOR (COLLAPSIBLE) -->
        <div class="collapsible-section" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%); border-color: rgba(139, 92, 246, 0.2);">
          <div class="section-header" onclick="window.toggleSection('engine')">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="engine-icon" style="font-size: 14px;">ðŸŸ</span>
              <span style="font-size: 10px; font-weight: 700; color: #8b5cf6; letter-spacing: 0.5px;">ENGINE</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span id="engine-name-mini" style="font-size: 9px; color: #aaa;">Stockfish</span>
              <span class="collapse-icon">â–¼</span>
            </div>
          </div>
          <div class="section-content collapsed" id="engine-content">
            <div id="current-engine-badge" style="
              background: rgba(59, 130, 246, 0.15);
              border: 1px solid rgba(59, 130, 246, 0.3);
              padding: 8px 10px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              cursor: pointer;
              margin-bottom: 8px;
            ">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 12px;">ðŸŸ</span>
                <span style="font-size: 11px; font-weight: 600; color: #fff;">Stockfish Online</span>
              </div>
              <span style="font-size: 9px; color: #888;">â–¼</span>
            </div>
            
            <div id="engine-selection-panel" style="display: none;">
              <div style="display: grid; gap: 5px; max-height: 180px; overflow-y: auto;">
                <button class="engine-btn analyzer-btn" data-engine="stockfish" style="justify-content: flex-start; gap: 6px; padding: 8px; font-size: 10px; background: rgba(59, 130, 246, 0.2); border-color: #3b82f6;">
                  <span>ðŸŸ</span>
                  <span style="flex: 1; text-align: left;">Stockfish</span>
                </button>
                <button class="engine-btn analyzer-btn" data-engine="chessapi" style="justify-content: flex-start; gap: 6px; padding: 8px; font-size: 10px;">
                  <span>ðŸ¦†</span>
                  <span style="flex: 1; text-align: left;">Chess-API.com</span>
                </button>
                <button class="engine-btn analyzer-btn" data-engine="lichess" style="justify-content: flex-start; gap: 6px; padding: 8px; font-size: 10px;">
                  <span>â™Ÿï¸</span>
                  <span style="flex: 1; text-align: left;">Lichess</span>
                </button>
                <button class="engine-btn analyzer-btn" data-engine="chessdb" style="justify-content: flex-start; gap: 6px; padding: 8px; font-size: 10px;">
                  <span>ðŸ“š</span>
                  <span style="flex: 1; text-align: left;">ChessDB</span>
                </button>
                <button class="engine-btn analyzer-btn" data-engine="custom" style="justify-content: flex-start; gap: 6px; padding: 8px; font-size: 10px;">
                  <span>âš™ï¸</span>
                  <span style="flex: 1; text-align: left;">Custom</span>
                </button>
              </div>
            </div>
            
            <div id="custom-engine-config" style="display: none; margin-top: 8px; padding: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 8px;">
              <div style="font-size: 9px; color: #888; margin-bottom: 6px; font-weight: 600;">CUSTOM ENGINE</div>
              <input type="text" id="custom-engine-url" placeholder="https://api.com/analyze" style="
                width: 100%;
                padding: 8px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #ffff;
                font-size: 10px;
                margin-bottom: 6px;
              ">
              <select id="custom-engine-format" style="
                width: 100%;
                padding: 8px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #e94301ff;
                font-size: 10px;
                margin-bottom: 6px;
              ">
                <option value="stockfish">Stockfish Format</option>
                <option value="lichess">Lichess Format</option>
                <option value="chessdb">ChessDB Format</option>
                <option value="postApi">Post Api</option>
              </select>
              <button id="btn-save-custom" class="analyzer-btn primary" style="width: 100%; padding: 8px; font-size: 10px;">Save Engine</button>
            </div>
          </div>
        </div>

        <!-- AUTO-MOVE (COLLAPSIBLE) -->
        <div class="collapsible-section" style="background: linear-gradient(135deg, rgba(255, 193, 7, 0.08) 0%, rgba(255, 152, 0, 0.05) 100%); border-color: rgba(255, 193, 7, 0.2);">
          <div class="section-header" onclick="window.toggleSection('automove')">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px;">ðŸ¤–</span>
              <span style="font-size: 10px; font-weight: 700; color: #ffc107; letter-spacing: 0.5px;">AUTO-MOVE</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <label style="position: relative; display: inline-block; width: 40px; height: 22px; cursor: pointer;" onclick="event.stopPropagation();">
                <input type="checkbox" id="automove-toggle" style="opacity: 0; width: 0; height: 0;">
                <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255, 255, 255, 0.1); transition: 0.3s; border-radius: 22px; border: 1px solid rgba(255, 255, 255, 0.2);"></span>
                <span style="position: absolute; height: 16px; width: 16px; left: 3px; bottom: 2px; background-color: white; transition: 0.3s; border-radius: 50%;"></span>
              </label>
              <span class="collapse-icon">â–¼</span>
            </div>
          </div>
          <div class="section-content" id="automove-content">
            <div style="font-size: 8px; color: #ff9800; margin-bottom: 6px; letter-spacing: 0.3px;">âš ï¸ LEARNING ONLY</div>
            <div style="display: flex; justify-content: space-between; font-size: 9px;">
              <span style="color: #aaa;">Color: <span id="player-color" style="color: #ffc107; font-weight: 600;">--</span></span>
              <span style="color: #aaa;">Moves: <span id="automove-count" style="color: #ffc107; font-weight: 600;">0</span></span>
            </div>
          </div>
          <!-- MOVE SPEED (COLLAPSIBLE) -->
        <div class="collapsible-section" style="background: linear-gradient(135deg, rgba(33, 150, 243, 0.08) 0%, rgba(33, 150, 243, 0.05) 100%); border-color: rgba(33, 150, 243, 0.2);">
          <div class="section-header collapsed" onclick="window.toggleSection('movespeed')">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px;">âš¡</span>
              <span style="font-size: 10px; font-weight: 700; color: #2196f3; letter-spacing: 0.5px;">MOVE SPEED</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span id="speed-name-mini" style="font-size: 9px; color: #aaa;">Normal</span>
              <span class="collapse-icon">â–¼</span>
            </div>
          </div>
          <div class="section-content collapsed" id="movespeed-content">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
              <button class="speed-btn analyzer-btn" data-speed="slow" style="padding: 7px 4px; font-size: 9px;">ðŸŒ</button>
              <button class="speed-btn analyzer-btn" data-speed="normal" style="padding: 7px 4px; font-size: 9px; background: rgba(33, 150, 243, 0.2); border-color: #2196f3;">âš¡</button>
              <button class="speed-btn analyzer-btn" data-speed="fast" style="padding: 7px 4px; font-size: 9px;">ðŸš€</button>
              <button class="speed-btn analyzer-btn" data-speed="instant" style="padding: 7px 4px; font-size: 9px;">âš¡âš¡</button>
            </div>
          </div>
        </div>
        </div>
        
        <!-- BEST MOVE -->
        <div id="best-move-container" style="
          display: none;
          background: linear-gradient(135deg, rgba(0, 230, 118, 0.1) 0%, rgba(0, 200, 100, 0.05) 100%);
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 10px;
          border: 1px solid rgba(0, 230, 118, 0.25);
        ">
          <div style="font-size: 9px; color: #00e676; font-weight: 700; margin-bottom: 6px; letter-spacing: 1px;">BEST MOVE</div>
          <div id="best-move" style="
            font-size: 22px;
            font-weight: 900;
            color: #00e676;
            letter-spacing: 2px;
            margin-bottom: 6px;
            font-family: 'SF Mono', Monaco, monospace;
          ">--</div>
          <div id="continuation" style="font-size: 9px; color: #888; font-family: monospace; line-height: 1.3;">--</div>
        </div>

        <!-- EVALUATION -->
        <div id="evaluation-bar-container" style="display: none; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 9px; color: #888; font-weight: 700; letter-spacing: 1px;">EVALUATION</span>
            <span id="eval-score" style="font-size: 14px; font-weight: 800; color: #00e676;">0.00</span>
          </div>
          <div style="height: 5px; background: rgba(255, 255, 255, 0.06); border-radius: 10px; overflow: hidden;">
            <div id="eval-bar" style="
              height: 100%;
              width: 50%;
              background: linear-gradient(90deg, #00e676, #00c853);
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              border-radius: 10px;
            "></div>
          </div>
        </div>

        <!-- STATUS -->
        <div id="status-message" style="
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 8px;
          font-size: 10px;
          color: #bbb;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        ">
          <div id="status-icon" style="font-size: 14px;">â³</div>
          <div id="status-text" style="flex: 1;">Waiting...</div>
        </div>

        <!-- STATS -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px;">
          <div class="stat-item">
            <div class="stat-label">Move</div>
            <div class="stat-value" id="move-number">0</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Turn</div>
            <div class="stat-value" id="turn-indicator">--</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Depth</div>
            <div class="stat-value" id="depth-value" style="color: #00e676;">${e.depthProfiles.blitz.base}</div>
          </div>
        </div>

        <!-- ACTION BUTTONS -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
          <button id="btn-refresh" class="analyzer-btn primary" style="padding: 9px; font-size: 11px;">
            <span style="margin-right: 4px;">ðŸ”</span> Analyze
          </button>
          <button id="btn-mode" class="analyzer-btn" style="padding: 9px; font-size: 11px;">
            <span style="margin-right: 4px;">âš¡</span> Mode
          </button>
        </div>
      </div>
    `, document.body.appendChild(n), t.overlay = n;
        document.getElementById("automove-toggle").addEventListener("change", function() {
                let e = this.nextElementSibling,
                    t = e.nextElementSibling;
                this.checked ? (e.style.backgroundColor = "#00e676", t.style.transform = "translateX(18px)") : (e.style.backgroundColor = "rgba(255, 255, 255, 0.1)", t.style.transform = "translateX(0)")
            }), document.getElementById("btn-hide").onclick = () => n.style.display = "none", document.getElementById("btn-refresh").onclick = () => B(), document.getElementById("btn-mode").onclick = () => D(), document.getElementById("btn-minimize").onclick = () => (function e() {
                let n = document.getElementById("analyzer-body"),
                    o = document.getElementById("minimized-toolbar"),
                    i = document.getElementById("btn-minimize"),
                    a = t.overlay;
                if (n && i && a) {
                    if (t.isMinimized) n.style.display = "block", o.style.display = "none", i.textContent = "â”", a.style.minWidth = "280px", a.style.maxWidth = "380px", t.isMinimized = !1;
                    else {
                        n.style.display = "none", o.style.display = "block", i.textContent = "â–¡", a.style.minWidth = "280px", a.style.maxWidth = "320px";
                        let l = document.getElementById("mode-selector");
                        l && (l.style.display = "none"), t.isMinimized = !0
                    }
                }
            })(), document.getElementById("time-control-badge").onclick = () => D(), document.getElementById("btn-automove-mini").onclick = () => {
                let e = document.getElementById("automove-toggle");
                e.checked = !e.checked, e.dispatchEvent(new Event("change"))
            }, document.getElementById("btn-analyze-mini").onclick = () => B(), document.getElementById("btn-mode-mini").onclick = () => D(), document.getElementById("current-engine-badge").onclick = () => {
                let e = document.getElementById("engine-selection-panel");
                e.style.display = "none" === e.style.display ? "block" : "none"
            }, document.querySelectorAll(".engine-btn").forEach(e => {
                e.onclick = () => {
                    let t = e.getAttribute("data-engine");
                    A(t), document.getElementById("engine-selection-panel").style.display = "none", "custom" === t && (document.getElementById("custom-engine-config").style.display = "block")
                }
            }), document.getElementById("btn-save-custom").onclick = () => {
                let n = document.getElementById("custom-engine-url").value.trim(),
                    o = document.getElementById("custom-engine-format").value;
                if (!n) {
                    alert("âŒ Please enter a valid API endpoint");
                    return
                }
                e.customEngineConfig.endpoint = n, e.customEngineConfig.format = o, e.engines.custom.endpoint = n, e.engines.custom.format = o, console.log("âœ… Custom engine configured:", n), alert("âœ… Custom engine saved!"), t.cache.clear(), B()
            }, document.getElementById("automove-toggle").onchange = t => {
                e.autoMove.enabled = t.target.checked;
                let n = document.getElementById("btn-automove-mini");
                t.target.checked ? (console.log("\uD83E\uDD16 Auto-move ENABLED"), i(), k(), n && (n.style.background = "linear-gradient(135deg, #00e676 0%, #00c853 100%)")) : (console.log("â¹ï¸ Auto-move DISABLED"), n && (n.style.background = "rgba(255, 255, 255, 0.06)"))
            }, document.querySelectorAll(".mode-btn").forEach(e => {
                e.onclick = () => S(e.getAttribute("data-mode"))
            }), document.querySelectorAll(".speed-btn").forEach(t => {
                t.onclick = () => {
                    let n = t.getAttribute("data-speed");
                    e.autoMove.moveSpeed = n, document.querySelectorAll(".speed-btn").forEach(e => {
                        e.style.background = "rgba(255, 255, 255, 0.06)", e.style.borderColor = "rgba(255, 255, 255, 0.1)"
                    }), t.style.background = "rgba(33, 150, 243, 0.2)", t.style.borderColor = "#2196f3";
                    let o = document.getElementById("speed-name-mini");
                    o && (o.textContent = ({
                        slow: "Slow",
                        normal: "Normal",
                        fast: "Fast",
                        instant: "Instant"
                    })[n]), console.log(`âš¡ Move speed: ${n.toUpperCase()}`)
                }
            }),
            function e(t) {
                let n = 0,
                    o = 0,
                    i = 0,
                    a = 0,
                    l = !1,
                    s = document.getElementById("analyzer-header");

                function r(e) {
                    if (!l) return;
                    e.preventDefault(), e.stopPropagation(), n = i - e.clientX, o = a - e.clientY, i = e.clientX, a = e.clientY;
                    let s = t.offsetTop - o,
                        r = t.offsetLeft - n,
                        d = t.getBoundingClientRect(),
                        c = d.width,
                        p = d.height,
                        u = window.innerWidth - c,
                        m = window.innerHeight - p;
                    r = Math.max(10, Math.min(r, u - 10)), s = Math.max(10, Math.min(s, m - 10)), t.style.top = s + "px", t.style.left = r + "px", t.style.right = "auto", t.style.bottom = "auto"
                }

                function d() {
                    l = !1, document.onmouseup = null, document.onmousemove = null, t.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", t.style.cursor = "default", s.style.cursor = "move"
                }
                s && (s.style.cursor = "move", s.style.userSelect = "none", s.onmousedown = function e(n) {
                    n.preventDefault(), n.stopPropagation(), l = !0, i = n.clientX, a = n.clientY, t.style.transition = "none", t.style.cursor = "grabbing", s.style.cursor = "grabbing", document.onmouseup = d, document.onmousemove = r
                })
            }(n), window.addEventListener("resize", () => {
                let e = n.getBoundingClientRect(),
                    t = window.innerWidth,
                    o = window.innerHeight;
                e.right > t && (n.style.left = t - e.width - 20 + "px"), e.bottom > o && (n.style.top = o - e.height - 20 + "px"), e.left < 0 && (n.style.left = "20px"), e.top < 0 && (n.style.top = "20px")
            })
    }

    function k() {
        let e = document.getElementById("player-color");
        e && (e.textContent = "w" === t.myColor ? "White âšª" : "b" === t.myColor ? "Black âš«" : "Unknown")
    }

    function w() {
        let t = document.getElementById("automove-count");
        t && (t.textContent = e.autoMove.autoMovesCount)
    }

    function M(e, t = "", n = "idle") {
        E();
        let o = document.getElementById("status-text"),
            i = document.getElementById("status-icon");
        o && (o.textContent = e), i && (i.textContent = ({
            idle: "â¸ï¸",
            analyzing: "\uD83D\uDD04",
            complete: "âœ…",
            error: "âŒ"
        })[n] || "â³");
        let a = document.getElementById("turn-indicator");
        a && t && (a.textContent = t)
    }

    function I(e, t, n = !1) {
        if (E(), !e || !e.bestMoveUCI) return;
        let o = document.getElementById("best-move"),
            i = document.getElementById("continuation"),
            a = document.getElementById("eval-score"),
            l = document.getElementById("eval-bar"),
            s = document.getElementById("best-move-container"),
            r = document.getElementById("evaluation-bar-container"),
            d = e.bestMoveUCI.substring(0, 2).toUpperCase(),
            c, p = `${d} â†’ ${e.bestMoveUCI.substring(2,4).toUpperCase()}${e.bestMoveUCI.length>4?"="+e.bestMoveUCI[4].toUpperCase():""}`;
        o && (o.textContent = p, o.style.opacity = n ? "0.7" : "1", s.style.display = "block"), i && e.line && (i.textContent = e.line.substring(0, 60));
        let u = "0.00",
            m = 50;
        null !== e.mate ? (u = e.mate > 0 ? `M${e.mate}` : `M${Math.abs(e.mate)}`, m = e.mate > 0 ? 100 : 0) : void 0 !== e.evaluation && (u = (e.evaluation >= 0 ? "+" : "") + e.evaluation.toFixed(2), m = Math.max(0, Math.min(100, 50 + 5 * e.evaluation))), a && (a.textContent = u, a.style.color = e.mate ? "#ffd700" : e.evaluation > 0 ? "#00e676" : "#ff6b6b", r.style.display = "block"), l && (l.style.width = m + "%", l.style.background = e.mate ? "linear-gradient(90deg, #ffd700, #ffa000)" : e.evaluation > 0 ? "linear-gradient(90deg, #00e676, #00c853)" : "linear-gradient(90deg, #ff6b6b, #ff4646)"), f(e.bestMoveUCI.substring(0, 2), e.bestMoveUCI.substring(2, 4)), M(n ? "Quick analysis..." : "Analysis complete", t, "complete")
    }

    function D() {
        let e = document.getElementById("mode-selector");
        e && (e.style.display = "none" === e.style.display ? "block" : "none")
    }

   function S(n) {
    if (!e.depthProfiles[n]) return;

    let requiredDepth = e.depthProfiles[n].base;
    let currentEngine = e.currentEngine;

    // CHECK IF CURRENT ENGINE CAN HANDLE THIS MODE'S DEPTH
    if (!canEngineAnalyze(currentEngine, 0, requiredDepth)) {
        console.warn(`âš ï¸ ${ENGINE_LIMITS[currentEngine].name} cannot handle ${n.toUpperCase()} mode (requires depth ${requiredDepth})`);
        
        // Try to find a suitable engine
        let suitableEngine = null;
        for (let engineKey of ['local', 'custom', 'lichess', 'chessapi', 'stockfish']) {
            if (e.engines[engineKey] && canEngineAnalyze(engineKey, 0, requiredDepth)) {
                suitableEngine = engineKey;
                break;
            }
        }

        if (suitableEngine) {
            console.log(`âœ… Auto-switching to ${ENGINE_LIMITS[suitableEngine].name} for ${n.toUpperCase()} mode`);
            e.currentEngine = suitableEngine;
            A(suitableEngine);
        } else {
            alert(`âŒ No available engine can handle ${n.toUpperCase()} mode!\n\nRequired depth: ${requiredDepth}\nPlease select a different mode or add a more capable engine.`);
            return;
        }
    }

    t.currentTimeControl = n;
    let o = document.getElementById("time-control-badge"),
        i = document.getElementById("depth-value"),
        a = e.depthProfiles[n];
    
    o && (o.innerHTML = `<span>${({bullet:"âš¡",blitz:"âš¡",rapid:"ðŸ•",classical:"ðŸ‘‘",daily:"ðŸ“…",unlimited:"â™¾ï¸"})[n]}</span><span>${n.charAt(0).toUpperCase()+n.slice(1)} â€¢ D${a.base}</span>`, 
        o.style.color = a.color, 
        o.style.background = `${a.color}26`, 
        o.style.borderColor = `${a.color}40`);
    
    i && (i.textContent = r());
    
    let l = document.getElementById("mode-selector");
    l && (l.style.display = "none");
    
    t.cache.clear();
    M(`Mode: ${n.toUpperCase()} (Depth ${a.base}-${a.max})`, "", "idle");
    
    // Update mode buttons to show disabled states
    updateModeButtonStates();
    
    setTimeout(() => B(), 300);
}


// ========================================
// FUNCTION 5: UPDATE MODE BUTTONS (Disable incompatible modes)
// ========================================
function updateModeButtonStates() {
    const currentEngine = e.currentEngine;
    const modeButtons = document.querySelectorAll(".mode-btn");
    
    modeButtons.forEach(btn => {
        const mode = btn.getAttribute("data-mode");
        const requiredDepth = e.depthProfiles[mode]?.base || 10;
        
        const canHandle = canEngineAnalyze(currentEngine, 0, requiredDepth);
        
        if (!canHandle) {
            // DISABLE BUTTON
            btn.style.opacity = "0.3";
            btn.style.cursor = "not-allowed";
            btn.style.background = "rgba(255, 0, 0, 0.1)";
            btn.style.borderColor = "rgba(255, 0, 0, 0.3)";
            btn.disabled = true;
            btn.title = `${mode.toUpperCase()} requires depth ${requiredDepth}, but ${ENGINE_LIMITS[currentEngine].name} max is ${ENGINE_LIMITS[currentEngine].maxDepth}`;
        } else {
            // ENABLE BUTTON
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
            btn.style.background = "rgba(255, 255, 255, 0.06)";
            btn.style.borderColor = "rgba(255, 255, 255, 0.1)";
            btn.disabled = false;
            btn.title = `Switch to ${mode.toUpperCase()} mode`;
        }
    });
}

   function A(n) {
    if (!e.engines[n]) {
        console.error("Invalid engine:", n);
        return;
    }
    
    let o = e.engines[n];
    e.currentEngine = n;
    
    // CHECK IF CURRENT MODE IS COMPATIBLE
    let currentMode = t.currentTimeControl;
    let requiredDepth = e.depthProfiles[currentMode]?.base || 10;
    
    if (!canEngineAnalyze(n, 0, requiredDepth)) {
        console.warn(`âš ï¸ ${o.name} cannot handle ${currentMode.toUpperCase()} mode - switching to BLITZ`);
        
        // Find a suitable mode for this engine
        let suitableMode = null;
        for (let mode of ['blitz', 'bullet', 'rapid', 'classical', 'unlimited', 'daily']) {
            let modeDepth = e.depthProfiles[mode]?.base || 10;
            if (canEngineAnalyze(n, 0, modeDepth)) {
                suitableMode = mode;
                break;
            }
        }
        
        if (suitableMode) {
            S(suitableMode);
        }
    }
    
    let i = document.getElementById("current-engine-badge"),
        a = document.getElementById("engine-icon"),
        nameMini = document.getElementById("engine-name-mini");
    
    i && (i.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 14px;">${o.icon}</span>
          <span style="font-size: 12px; font-weight: 600; color: #fff;">${o.name}</span>
        </div>
        <span style="font-size: 10px; color: #888;">â–¼</span>
      `, 
      i.style.background = `${o.color}26`, 
      i.style.borderColor = `${o.color}66`);
    
    a && (a.textContent = o.icon);
    nameMini && (nameMini.textContent = o.name);
    
    document.querySelectorAll(".engine-btn").forEach(e => {
        e.getAttribute("data-engine") === n ? 
            (e.style.background = `${o.color}33`, e.style.borderColor = o.color) : 
            (e.style.background = "rgba(255, 255, 255, 0.06)", e.style.borderColor = "rgba(255, 255, 255, 0.1)");
    });
    
    // Update mode buttons based on new engine capabilities
    updateModeButtonStates();
    
    t.cache.clear();
    M(`Engine: ${o.name}`, "", "idle");
    console.log(`ðŸ”§ Engine changed to: ${o.name}`);
    
    setTimeout(() => B(), 300);
}

    function B() {
        let e = p(),
            n = u(),
            o = m(e);
        e && (y(), t.cache.clear(), z(e, n, o))
    }

    // ========================================
// INITIALIZATION: Call this after UI is created
// ========================================
function initializeEngineConstraints() {
    // Update mode buttons on page load
    updateModeButtonStates();
    
    // Re-check mode buttons when mode selector is opened
    const modeSelector = document.getElementById("time-control-badge");
    if (modeSelector) {
        const originalClick = modeSelector.onclick;
        modeSelector.onclick = () => {
            if (originalClick) originalClick();
            setTimeout(updateModeButtonStates, 50);
        };
    }
    
    console.log("âœ… Engine constraints initialized");
}

    function P() {
        E(), M("Initializing...");
        let n = 0,
            o = setInterval(() => {
                n++;
                if (d()) {
                    if (clearInterval(o), M("Board detected - monitoring active"), e.autoDetectTimeControl) {
                        let a = s();
                        t.currentTimeControl = a, S(a), console.log(`ðŸŽ¯ Auto-detected: ${a.toUpperCase()}`)
                    }
                    i(), k(),
                        function n() {
                            t.observers.forEach(e => e.disconnect()), t.observers = [];
                            let o = d(),
                                i = c(),
                                a = {
                                    childList: !0,
                                    subtree: !0,
                                    attributes: !0,
                                    characterData: !0
                                };
                            if (o) {
                                let l = new MutationObserver(() => L());
                                l.observe(o, a), t.observers.push(l)
                            }
                            if (i) {
                                let r = new MutationObserver(() => L());
                                r.observe(i, a), t.observers.push(r)
                            }
                            let p = document.querySelectorAll('.clock, [class*="clock"]');
                            p.length > 0 && e.autoDetectTimeControl && p.forEach(e => {
                                let n = new MutationObserver(() => {
                                    let e = s();
                                    e !== t.currentTimeControl && S(e)
                                });
                                n.observe(e, a), t.observers.push(n)
                            })
                        }(), setTimeout(() => L(), 500)
                } else n > 30 && (clearInterval(o),initializeEngineConstraints(), M("No board found - waiting..."))
            }, 200)
    }
    window.toggleSection = function e(t) {
        let n = document.getElementById(`${t}-content`);
        if (!n) return;
        let o = n.previousElementSibling;
        n.classList.contains("collapsed") ? (n.classList.remove("collapsed"), o && o.classList.remove("collapsed")) : (n.classList.add("collapsed"), o && o.classList.add("collapsed"))
    };
    let T = null;

    function L() {
    t.fenCache.timestamp = 0;
    let n = Date.now();
    let o = n - t.lastProcessTime;
    
    // For bullet/blitz: analyze immediately with minimal delay
    if ("bullet" === t.currentTimeControl) {
        if (o > 50) {
            N();
            t.lastProcessTime = n;
        }
        return;
    }
    
    if ("blitz" === t.currentTimeControl) {
        if (o > 80) {  // Reduced from 150ms
            N();
            t.lastProcessTime = n;
        }
        return;
    }
    
    // For other modes: small debounce to avoid excessive API calls
    clearTimeout(T);
    T = setTimeout(() => {
        N();
        t.lastProcessTime = Date.now();
    }, 50);  // Reduced from 100ms (e.debounceMs)
}

    function N() {
        try {
            let n = p(!0),
                o = u(),
                a = m(n),
                l = document.getElementById("move-number"),
                d = document.getElementById("depth-value");
            if (l && (l.textContent = o), d && (d.textContent = r()), t.lastMoveCount > 0 && 0 === o && n && (console.log("ðŸ†• New game detected - resetting"), resetAnalyzerState(), M("New game - ready", a)), !n) return;
            let c = n !== t.lastFEN,
                g = o !== t.lastMoveCount;
            (c || g) && (t.lastFEN = n, t.lastMoveCount = o, z(n, o, a))
        } catch (b) {
            console.error("Game state processing error:", b)
        }
    }

    function resetAnalyzerState() {
        if (t.analysisController) {
            t.analysisController.abort()
        }
        clearTimeout(t.moveStabilityTimer);
        t.lastFEN = null;
        t.lastMoveCount = 0;
        t.cache.clear();
        y();
        t.currentAnalysisId++;
        t.lastAnalyzedFEN = null;
        t.pendingFEN = null;
        t.rapidMoveCount = 0;
        t.analysisController = null;
        e.autoMove.autoMovesCount = 0;
        w();
        if (e.autoDetectTimeControl) {
            setTimeout(() => {
                let e = s();
                e !== t.currentTimeControl && S(e)
            }, 1e3)
        }
        i();
        k()
    }
    window.chessSmartAnalyzer = {
        start() {
            P(), console.log("âœ… Smart Analyzer started")
        },
        stop() {
            t.observers.forEach(e => e.disconnect()), t.observers = [], y(), M("Stopped", "", "idle"), console.log("â¹ï¸ Smart Analyzer stopped")
        },
        analyze() {
            B()
        },
        setMode(t) {
            e.depthProfiles[t] ? S(t) : console.error("Invalid mode. Available:", Object.keys(e.depthProfiles).join(", "))
        },
        enableAutoMove() {
            let t = document.getElementById("automove-toggle");
            t && (t.checked = !0, t.dispatchEvent(new Event("change"))), e.autoMove.enabled = !0, console.log("\uD83E\uDD16 Auto-move enabled via API")
        },
        disableAutoMove() {
            let t = document.getElementById("automove-toggle");
            t && (t.checked = !1, t.dispatchEvent(new Event("change"))), e.autoMove.enabled = !1, console.log("â¹ï¸ Auto-move disabled via API")
        },
        moveNow() {
            t.lastBestMove ? _(t.lastBestMove) : console.warn("No best move available")
        },
        status() {
            let n = e.depthProfiles[t.currentTimeControl];
            return {
                mode: t.currentTimeControl,
                baseDepth: n.base,
                maxDepth: n.max,
                currentDepth: r(),
                moveCount: t.lastMoveCount,
                analyzing: t.analyzing,
                cacheSize: t.cache.size,
                autoMove: e.autoMove.enabled,
                autoMoveCount: e.autoMove.autoMovesCount,
                myColor: t.myColor,
                myTurn: a()
            }
        },
        setMoveSpeed(t) {
            if (e.moveSpeedProfiles[t]) {
                e.autoMove.moveSpeed = t;
                let n = document.querySelector(`.speed-btn[data-speed="${t}"]`);
                n && n.click(), console.log(`âš¡ Move speed set to: ${t.toUpperCase()}`)
            } else console.error("Invalid speed. Available:", Object.keys(e.moveSpeedProfiles).join(", "))
        },
        getMoveSpeed: () => e.autoMove.moveSpeed,
        setEngine(t) {
            e.engines[t] ? A(t) : console.error("Invalid engine. Available:", Object.keys(e.engines).join(", "))
        },
        getEngine: () => ({
            current: e.currentEngine,
            name: e.engines[e.currentEngine].name,
            available: Object.keys(e.engines)
        }),
        setCustomEngine(n, o = "stockfish", i = 20) {
            e.customEngineConfig.endpoint = n, e.customEngineConfig.format = o, e.customEngineConfig.maxDepth = i, e.engines.custom.endpoint = n, e.engines.custom.format = o, e.engines.custom.maxDepth = i, console.log("âœ… Custom engine configured:", n), "custom" === e.currentEngine && (t.cache.clear(), B())
        },
        listEngines: () => Object.keys(e.engines).map(t => ({
            key: t,
            name: e.engines[t].name,
            icon: e.engines[t].icon,
            endpoint: e.engines[t].endpoint
        }))
    }, console.log("\uD83C\uDFAF Initializing Smart Chess Analyzer + Humanized Auto-Move..."), "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", P) : P(), document.addEventListener("keydown", e => {
        e.ctrlKey && e.shiftKey && "A" === e.key && (e.preventDefault(), B()), e.ctrlKey && e.shiftKey && "H" === e.key && (e.preventDefault(), t.overlay && (t.overlay.style.display = "none" === t.overlay.style.display ? "block" : "none")), e.ctrlKey && e.shiftKey && "M" === e.key && (e.preventDefault(), D()), e.ctrlKey && e.shiftKey && "X" === e.key && (e.preventDefault(), t.lastBestMove && _(t.lastBestMove))
    }), console.log("âœ¨ Enhanced Smart Chess Analyzer loaded!"), console.log("\uD83D\uDCA1 Press minimize to show compact toolbar"), console.log("\uD83C\uDFA8 Modern, clean UI with smooth animations")
}();