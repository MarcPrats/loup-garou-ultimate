# Loup Garou Ultimate

## Overview
A multiplayer companion web application for the Loups Garous de Thiercelieux (Werewolf) board game. The app manages game rooms, player connections, role assignments, and game state using Socket.IO for real-time communication.

## Project Architecture

### Tech Stack
- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.IO
- **Frontend**: Vanilla HTML, CSS, JavaScript

### Directory Structure
```
├── server.js           # Main server file with Socket.IO game logic
├── index.html          # Main landing page
├── waiting-room.html   # Game lobby/waiting room
├── js/
│   ├── app.js          # Main frontend JavaScript
│   └── waiting-room.js # Waiting room logic
├── css/
│   ├── styles.css      # Main styles
│   └── waiting-room.css# Waiting room styles
├── images/             # Role card images (webp format)
└── config/
    └── app.json        # App configuration
```

### Key Features
- Create/join game rooms with 4-character codes
- Support for 5-12 players + 1 game master
- Automatic role assignment based on player count
- Various game roles (werewolves, villagers, special roles)
- Real-time player updates via WebSocket

### Server Configuration
- Server runs on port 5000
- Socket.IO configured for CORS support
- Static files served from project root

## Development

### Running the App
```bash
npm start       # Production mode
npm run dev     # Development mode with nodemon
```

### Environment
- Port: 5000 (configurable via PORT env variable)
- Host: 0.0.0.0 (accessible from all interfaces)
