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

let gameState = {
  cards: Array.from({ length: 20 }, (_, i) => i + 1).sort(() => Math.random() - 0.5),
  currentPlayer: 1,
  target: 1,
  lastResult: null,
  winner: null
};

wss.on('connection', ws => {
  console.log("Игрок подключился");
  ws.send(JSON.stringify(gameState));

  ws.on('message', msg => {
    const action = JSON.parse(msg);

    if (action.type === "flip") {
      const value = action.value;

      if (value === gameState.target) {
        gameState.target++;
        gameState.lastResult = 'correct';

        if (gameState.target > 20) {
          gameState.winner = gameState.currentPlayer;
        }
      } else {
        gameState.lastResult = 'wrong';
        gameState.target = 1;
        gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
      }
    }

    broadcast(gameState);
    setTimeout(() => { gameState.lastResult = null; }, 0);
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
