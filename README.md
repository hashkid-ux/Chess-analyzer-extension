# ♟️ Chess Smart Analyzer Pro - Browser Extension

**Advanced multi-engine chess analysis with humanized auto-move for Chess.com & Lichess.org**

## 🚨 IMPORTANT DISCLAIMER

**This extension is for EDUCATIONAL and LEARNING purposes ONLY!**

- ❌ **NEVER** use auto-move in live, rated, or competitive games
- ❌ Using this tool in real games violates chess platform fair play policies
- ❌ Accounts can be permanently banned for cheating
- ✅ **ONLY** use for analysis, practice, and learning from computer games

## ✨ Features

### 🔧 Multi-Engine Support
- **Stockfish Online** - Fast, reliable (depth 15, 30 moves)
- **Chess-API.com** - Good for early game (depth 20, 20 moves)
- **Lichess Cloud** - Mid-game specialist (depth 20, 40 moves)
- **ChessDB** - Extensive opening book (depth 20, unlimited)
- **Custom Engine** - Your own API endpoint
- **Local Engine** - Privacy-focused localhost support (depth 25)

### 🎯 Smart Analysis
- **Auto-detects time control** (Bullet/Blitz/Rapid/Classical/Daily)
- **Adaptive depth** based on game type
- **Position caching** for instant repeat analysis
- **Engine auto-switching** when limits are reached
- **Fallback mechanisms** (e.g., ChessDB → Stockfish)

### 🤖 Humanized Auto-Move (LEARNING ONLY!)
- **Realistic mouse movements** with bezier curves
- **4 speed profiles**: Slow, Normal, Fast, Instant
- **Promotion handling** for all pieces
- **Safety checks**: Turn validation, live game blocking
- **Configurable delays** and randomization

### 📊 Visual Feedback
- **Move arrows** with customizable intensity
- **Evaluation bar** with mate detection
- **Best move suggestions** with continuation lines
- **Collapsible UI** with minimize mode
- **Draggable overlay** positioned anywhere

### ⌨️ Keyboard Shortcuts
- `Ctrl + Shift + A` - Analyze position
- `Ctrl + Shift + H` - Toggle visibility
- `Ctrl + Shift + M` - Change mode
- `Ctrl + Shift + X` - Execute best move

## 📦 Installation

### Chrome/Edge (Chromium)

1. **Download Extension**
   ```bash
   git clone https://github.com/your-repo/chess-analyzer-extension.git
   cd chess-analyzer-extension
   ```

2. **Load in Browser**
   - Open Chrome/Edge
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (top-right)
   - Click "Load unpacked"
   - Select the extension folder

3. **Grant Permissions**
   - The extension needs access to Chess.com and Lichess.org
   - All API endpoints for engines

### Firefox

1. **Temporary Installation** (for testing)
   - Go to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `manifest.json` from extension folder

2. **Permanent Installation**
   - Package as `.xpi` file (see developer docs)
   - Install from Firefox Add-ons

## 🎮 Usage

### Quick Start

1. **Open Chess.com or Lichess.org**
2. **Start a game** (practice, computer, or analysis board)
3. **Click extension icon** in browser toolbar
4. **Analyzer overlay appears** on the board
5. **Click "Analyze"** to get best move

### Configuration

#### Via Popup (Quick)
- Click extension icon
- Select engine (Stockfish, Lichess, etc.)
- Choose time control mode
- Toggle auto-move if needed

#### Via Settings Page (Advanced)
- Right-click extension icon → Options
- Configure all features in detail
- Save and apply to all tabs

### Using Auto-Move (⚠️ PRACTICE ONLY!)

1. **Enable in Settings** or via popup toggle
2. **Confirm safety warning**
3. **Analyzer will automatically execute** best moves
4. **Configure speed profile** (Slow/Normal/Fast/Instant)
5. **Set delays** to make moves more human-like

**Auto-move will ONLY work when:**
- ✅ It's your turn
- ✅ Game is detected as practice/analysis
- ✅ Safety mode allows it
- ❌ NOT in live/rated games (if block enabled)

## 🔧 Engine Configuration

### Custom Engine Setup

1. **Host your own chess engine API**
2. **In Settings → Engines tab**
3. **Enter API endpoint URL**
4. **Select response format**:
   - Stockfish Format: `{ bestmove: "e2e4", evaluation: 0.5 }`
   - Lichess Format: `{ pvs: [{ moves: "e2e4", cp: 50 }] }`
   - ChessDB Format: `score:50,depth:20,pv:e2e4|e7e5`
   - POST API: Send `{ fen, depth }`, receive JSON

### Local Engine (Privacy Mode)

Run Stockfish on your own machine:

```python
# local_engine_server.py (example)
from flask import Flask, request, jsonify
import chess.engine

app = Flask(__name__)
engine = chess.engine.SimpleEngine.popen_uci("/path/to/stockfish")

@app.route('/analyze', methods=['GET'])
def analyze():
    fen = request.args.get('fen')
    depth = int(request.args.get('depth', 20))
    
    board = chess.Board(fen)
    result = engine.analyse(board, chess.engine.Limit(depth=depth))
    
    return jsonify({
        'bestmove': result['pv'][0].uci(),
        'evaluation': result['score'].relative.score() / 100,
        'continuation': ' '.join([m.uci() for m in result['pv']])
    })

if __name__ == '__main__':
    app.run(port=8080)
```

Then in settings: `http://localhost:8080/analyze`

## 📊 Engine Capabilities Reference

| Engine | Max Depth | Move Limit | Best For | Speed |
|--------|-----------|------------|----------|-------|
| 🐟 Stockfish Online | 15 | 30 moves | Fast analysis | ⚡⚡⚡ |
| 🦆 Chess-API.com | 20 | 20 moves | Opening/Early game | ⚡⚡ |
| ♟️ Lichess Cloud | 20 | 40 moves | Mid-game | ⚡⚡ |
| 📚 ChessDB | 20 | Unlimited | Opening book | ⚡⚡⚡ |
| ⚙️ Custom | 20 | Unlimited | Your needs | Varies |
| 🏠 Local | 25 | Unlimited | Privacy/Power | ⚡ |

**Note:** Engine will auto-switch when limits are exceeded!

## ⚙️ Advanced Settings

### Performance Tuning

- **Debounce Delay**: Time to wait after board changes (default: 100ms)
- **Min Time Between**: Prevent excessive API calls (default: 150ms)
- **Cache Size**: Number of positions to remember (default: 100)

### Auto-Move Safety

- **Safety Mode**: Require confirmation before moves
- **Block Live Games**: Disable in competitive games
- **Only My Turn**: Wait for your turn
- **Humanize**: Add realistic mouse curves and timing

### Visual Options

- **None**: No arrows or highlights
- **Subtle**: Light arrows (recommended)
- **Full**: Strong arrows + square highlights

## 🐛 Troubleshooting

### Analyzer Not Appearing

1. **Refresh the page** (F5)
2. **Check if on chess site** (chess.com or lichess.org)
3. **Open browser console** (F12) - look for errors
4. **Reload extension** in chrome://extensions

### Analysis Not Working

1. **Check engine status** in popup
2. **Try different engine** (some have limits)
3. **Verify internet connection**
4. **Check browser console** for API errors

### Auto-Move Not Working

1. **Is it your turn?** (Check "Only My Turn" setting)
2. **Is auto-move enabled?** (Toggle in popup)
3. **Is position analyzed?** (Must have best move first)
4. **Is game blocked?** (Check "Block Live Games" setting)

### Custom Engine Not Connecting

1. **Verify URL** is correct and accessible
2. **Check CORS headers** on your API
3. **Test endpoint** with curl/Postman first
4. **Check response format** matches selected type

## 🔒 Privacy & Security

- **No data collection**: Everything runs locally
- **No tracking**: No analytics or telemetry
- **API calls only**: To chess engines you select
- **Local engine option**: For maximum privacy
- **Open source**: Audit the code yourself

## 📝 API Reference

Access from browser console on Chess.com/Lichess:

```javascript
// Get analyzer object
const analyzer = window.chessSmartAnalyzer;

// Analyze current position
analyzer.analyze();

// Change settings
analyzer.setMode('blitz');        // bullet/blitz/rapid/classical/daily/unlimited
analyzer.setEngine('stockfish');  // stockfish/lichess/chessdb/chessapi/custom/local
analyzer.setMoveSpeed('normal');  // slow/normal/fast/instant

// Auto-move control
analyzer.enableAutoMove();
analyzer.disableAutoMove();
analyzer.moveNow();  // Execute best move immediately

// Get status
const status = analyzer.status();
console.log(status);
// {
//   mode: 'blitz',
//   currentDepth: 12,
//   moveCount: 15,
//   analyzing: false,
//   autoMove: false,
//   myColor: 'w',
//   myTurn: true
// }

// List available engines
const engines = analyzer.listEngines();
```

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📜 License

MIT License - see LICENSE file

## ⚖️ Legal & Ethics

**This tool is for education only!**

- Chess.com Fair Play Policy: https://www.chess.com/legal/fair-play
- Lichess Terms of Service: https://lichess.org/terms-of-service

**By using this extension, you agree:**
- To NEVER use auto-move in live/rated games
- To only use for learning and practice
- That you understand account bans are possible if misused
- To take full responsibility for your actions

## 📧 Support

- **Issues**: https://github.com/your-repo/issues
- **Discussions**: https://github.com/your-repo/discussions
- **Email**: support@example.com

## 🙏 Acknowledgments

- Stockfish chess engine
- Lichess.org for cloud evaluation API
- Chess.com for their platform
- ChessDB for opening book data

---

**Made with ♟️ by chess enthusiasts, for learning chess better!**

**Remember: Real improvement comes from understanding, not from engines!**