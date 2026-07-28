# 🐺 Loup Garou Ultimate

A multiplayer companion app for **Les Loups-Garous de Thiercelieux**, designed to help a game master run a game while each player privately views their role and game information.

The app is built with Node.js, Express and Socket.IO and is intended to work on a shared local network or through an online deployment.

## 🚀 Getting Started

### Prerequisites

- Node.js 14 or newer
- npm

### Installation

Install the dependencies:

````bash
npm install
````

Start the server:

````bash
npm start
````

For development with automatic restart:

````bash
npm run dev
````

By default, the server listens on port `5000`. Open the application at:

````text
http://localhost:5000/
````

The port can be changed with the `PORT` environment variable.

## 🎮 How to Play

### Start or join the game

From the main screen, use the single game button:

- If no game is active, the button becomes **Créer la Partie**. The game is created immediately and the game master is named **Le MJ** by default.
- If a game is already active, the button becomes **Rejoindre la Partie**. The player enters their name and joins the existing game.

The application uses one shared game room. Players do not need to enter or share a four-character room code.

### Waiting room

The waiting room shows the connected players and the game master. The game master can remove players and start the game once the required number of players has joined.

Players can open the rules from the waiting room with **Consulter les règles**. The rules page also provides buttons to return either to the main screen or directly to the waiting room.

### Game master

The game master starts the game from the waiting room. Roles are assigned automatically according to the number of players. Each player receives a private link to view their role, while the game master receives the complete role overview and the relevant special information.

The current server supports between **5 and 12 players, excluding the game master**.

## 📖 Rules and Roles

- `index.html` contains the application's role reference.
- `reference.html` contains the French Trouble Brewing reference, including role distribution and night orders.
- The reference page uses the application's role names and images where an equivalent exists.

The rules page can be opened from the main role reference or directly from the waiting room.

## 🔧 Technical Details

### Server

- **Express** serves the application and static files.
- **Socket.IO** provides real-time communication between the game master and players.
- A single shared room is used for the game.
- Roles are assigned randomly when the game starts.
- Role access uses private server-generated tokens.
- The server exposes `/api/role/:token` to retrieve a player's role data.
- Empty or inactive rooms are cleaned up automatically.


### Online deployment

The application can be deployed to services such as:

- Heroku
- Render
- Railway
- Fly.io
- Replit

Make sure the deployment platform provides a Node.js runtime and forwards the configured `PORT` to the server.

## 🛠️ Possible Future Improvements

- Day and night phase management
- Voting and nomination support
- Game history
- Custom role configuration
- Phase timers
- Additional game master controls

## 🤝 Contributing

Issues and enhancement requests are welcome. Before submitting a change, please verify the game flow with multiple connected clients and check both the player and game master views.

## 📄 License

MIT License. See the repository for details.

**Enjoy your game night! 🎲🐺**