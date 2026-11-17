const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const MAX_PLAYERS = 9;
const MIN_PLAYERS = 4;

// 9 Distinct vibrant colors matching the board wedges
const colors = [
    '#F1C40F', '#2980B9', '#8E44AD', '#E74C3C', 
    '#27AE60', '#FD79A8', '#E67E22', '#16A085', '#C0392B'
];

let players = {};
let playerOrder = [];
let gameStarted = false;

io.on('connection', (socket) => {
    if (Object.keys(players).length >= MAX_PLAYERS) {
        socket.emit('error', 'Lobby is full (9 players max).');
        return;
    }

    const assignedColor = colors[Object.keys(players).length];
    
    players[socket.id] = {
        id: socket.id,
        slot: Object.keys(players).length + 1,
        color: assignedColor,
        name: `Player ${Object.keys(players).length + 1}`,
        character: 'Knight',
        tokens: [0, 0, 0, 0]
    };
    playerOrder.push(socket.id);

    broadcastState();

    socket.on('updateProfile', (data) => {
        if (players[socket.id]) {
            players[socket.id].name = data.name || players[socket.id].name;
            players[socket.id].character = data.character || players[socket.id].character;
            broadcastState();
        }
    });

    socket.on('startGame', () => {
        if (playerOrder.length >= MIN_PLAYERS) {
            gameStarted = true;
            broadcastState();
        }
    });

    socket.on('rollDice', () => {
        if (playerOrder[0] !== socket.id) return;
        const roll = Math.floor(Math.random() * 6) + 1;
        io.emit('diceRolled', { player: socket.id, roll });
        
        // Rotate turn
        playerOrder.push(playerOrder.shift());
        broadcastState();
    });

    socket.on('disconnect', () => {
        playerOrder = playerOrder.filter(id => id !== socket.id);
        delete players[socket.id];
        if (playerOrder.length < MIN_PLAYERS) gameStarted = false;
        broadcastState();
    });
});

function broadcastState() {
    io.emit('gameState', {
        players,
        turn: playerOrder[0],
        gameStarted,
        minPlayers: MIN_PLAYERS
    });
}

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Ludo Imperial running on port ${PORT}`);
    console.log(`Share this link with your local network players: http://YOUR_IP:3000`);
});