const http = require('http');
const WebSocket = require('ws');

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("WebSocket сервер работает");
});

const wss = new WebSocket.Server({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit('connection', ws, req);
  });
});

// функция для сброса состояния
function newGameState() {
  return {
    cards: Array.from({ length: 20 }, (_, i) => i + 1).sort(() => Math.random() - 0.5),
    opened: Array(20).fill(false),
    currentPlayer: 1,
    target: 1,
    lastResult: null,
    winner: null
  };
}

let gameState = newGameState();

wss.on('connection', ws => {
  console.log("Игрок подключился");
  ws.send(JSON.stringify(gameState));

  ws.on('message', msg => {
    const action = JSON.parse(msg);

    if (action.type === "flip") {
      const value = action.value;
      const index = gameState.cards.indexOf(value);

      if (index !== -1) {
        gameState.opened[index] = true; // открыть карту
      }

      if (value === gameState.target) {
        gameState.target++;
        gameState.lastResult = 'correct';

        if (gameState.target > 20) {
          gameState.winner = gameState.currentPlayer;
        }

        broadcast(gameState);

      } else {
        gameState.lastResult = 'wrong';
        gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        gameState.target = 1;

        broadcast(gameState);

        // через секунду закрыть ВСЕ карты
        setTimeout(() => {
          gameState.opened = Array(20).fill(false);
          broadcast(gameState);
          gameState.lastResult = null;
        }, 2000);
      }

      if (gameState.lastResult === 'correct') {
        setTimeout(() => { gameState.lastResult = null; }, 0);
      }
    }

    if (action.type === "reset") {
      gameState = newGameState();
      broadcast(gameState);
    }
  });
});

function broadcast(state) {
  const payload = JSON.stringify(state);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

server.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});

