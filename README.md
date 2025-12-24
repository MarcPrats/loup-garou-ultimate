# 🐺 Loup Garou Ultimate - Multiplayer Edition

Companion app for the board game "Les Loups-Garous de Thiercelieux" with multiplayer support.

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

3. Open your browser and go to:
```
http://localhost:3000/waiting-room.html
```

## 🎮 How to Play

### Creating a Game
1. Click "Créer une Partie" (Create Game)
2. Enter your name
3. Share the 4-character room code with other players
4. Wait for players to join
5. Click "Démarrer la Partie" to start (requires 3+ players)

### Joining a Game
1. Click "Rejoindre une Partie" (Join Game)
2. Enter your name
3. Enter the 4-character room code
4. Wait for the host to start the game

## 📁 Project Structure

```
loup-garou-ultimate/
├── server.js              # Node.js/Express/Socket.IO server
├── package.json           # Dependencies and scripts
├── waiting-room.html      # Multiplayer waiting room
├── index.html            # Game rules reference
├── css/
│   ├── styles.css        # Main app styles
│   └── waiting-room.css  # Waiting room styles
├── js/
│   ├── app.js           # Main app logic
│   └── waiting-room.js  # Waiting room client logic
└── images/              # Game assets
```

## 🔧 Technical Details

### Server Features
- **Real-time communication** with Socket.IO
- **Room management** with 4-character codes
- **Player tracking** and host assignment
- **Automatic cleanup** of old/empty rooms
- **Reconnection handling**

### Client Features
- **Responsive design** for mobile and desktop
- **Real-time updates** when players join/leave
- **Connection status indicator**
- **Room code sharing** with copy button
- **Host controls** for starting games

## 🌐 Deployment

### Local Network
Players on the same Wi-Fi network can connect using your computer's IP address:
```
http://192.168.X.X:3000/waiting-room.html
```

### Online Deployment
Deploy to services like:
- **Heroku**: `git push heroku main`
- **Render**: Connect GitHub repository
- **Railway**: One-click deploy
- **Fly.io**: `fly deploy`

Remember to set the `PORT` environment variable if required by your hosting provider.

## 📝 Game Rules
View the complete rules at `index.html` or click "Consulter les règles" from the waiting room.

## 🛠️ Future Features
- [ ] Role assignment system
- [ ] Night/Day phases management
- [ ] Vote tracking
- [ ] Game history
- [ ] Custom role configuration
- [ ] Timer for phases
- [ ] Game master controls

## 🤝 Contributing
Feel free to submit issues and enhancement requests!

## 📄 License
MIT License - feel free to use this for your game nights!

---

**Enjoy your game nights! 🎲🐺**
