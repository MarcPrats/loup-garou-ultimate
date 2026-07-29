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

## 📖 Rules and Characters

The main page contains only three actions in one panel: start or join the game, open the local rules, or open the rules wiki.

- `reference.html` starts with the complete character catalogue, followed by role distribution and night orders.
- Characters with complete app artwork open a dedicated detail page at `role.html?role=<character-id>`.
- Characters without artwork keep their emoji and are marked **Bientôt disponible**; they are not clickable.
- `js/roles-data.js` is the shared source for character names, categories, pictures, descriptions and additional details.
- `js/reference-roles.js` renders the catalogue, while `js/role-detail.js` renders the selected character.

The app terminology is **Villageois**, **Marginal**, **Loup Garou** and **Loup Garou Ultime**. Original Trouble Brewing role names are not displayed.

## 🔧 Technical Details

### Server

- **Express** serves the application and static files.
- **Socket.IO** provides real-time communication between the game master and players.
- A single shared room is used for the game.
- Roles are assigned randomly when the game starts.
- Role access uses private server-generated tokens.
- The server exposes `/api/role/:token` to retrieve a player's role data.
- Empty or inactive rooms are cleaned up automatically.

### Role assignment

The server assigns werewolf, villager and marginal roles based on the number of players. The Angel and Drunk are treated as marginaux:

- With **6, 8 or 11 players**, the marginal slot is randomly assigned as either the **Angel** or the **Drunk**.
- When the Drunk is selected, the affected player sees a normal villager role. Their drunk status is only visible to the game master.
- With **9 or 12 players**, the current role rules can include both the Angel and the Drunk.
- Other player-count configurations follow the role-assignment rules implemented in `server.js`.

## 🌐 Deployment

### Local network

Players connected to the same network can use the host computer's local IP address, for example:

````text
http://192.168.X.X:5000/
````

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

## 🧪 Development Simulator

The repository includes a development-only simulator for checking the MJ dashboard and the private player role view without modifying the real shared room.

The simulator is disabled by default. Start the server with the simulator explicitly enabled:

````bash
ENABLE_SIMULATOR=true npm start
````

Then open:

````text
http://localhost:5000/dev/simulator
````

The simulator launcher lets you:

- Create a simulated game with 5 to 12 players.
- See each simulated player's role and type: loup garou, villageois or marginal.
- Open the MJ dashboard in a new page.
- Open the private player view in a new page for any simulated player.
- Reset the current simulation.

The simulator does not maintain a second copy of the role or MJ views. The markup from the existing `role-screen` and `game-master-screen` sections is extracted into `js/view-templates.js`, and their rendering logic is shared through `js/view-renderers.js`. Both the real waiting room and the simulator pages use these same templates and renderers.

Simulation state is separate from the real one-room Socket.IO game. When `ENABLE_SIMULATOR` is not enabled, the simulator pages and API return `404`.

## 🧪 Reliability checks

The server now protects the single home-game room against accidental host changes, only allows a socket to remove its own player, handles MJ departure, and clears role tokens when a room is closed or removed.

Role-assignment coverage is available for every supported player count from 5 to 12 players. Run it with:

````bash
node test/role-assignment.test.js
````

The test verifies assignment counts, werewolf counts, the Angel/Drunk alternatives for 6, 8 and 11 players, and that the Angel and Drunk are never the same player.