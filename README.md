# Loup Garou Ultime - Corporate Edition

A modern, professional web application for displaying Werewolf Ultimate game rules with clean, corporate-style design.

## 🏗️ Architecture

The application has been refactored with a clean separation of concerns:

```
loup-garou-ultimate/
├── index.html              # Main HTML file (refactored)
├── css/
│   └── styles.css          # All styling and CSS variables
├── js/
│   └── app.js              # Interactive features and logic
├── config/
│   └── app.json            # Application configuration
├── .vscode/
│   ├── launch.json         # Firefox debugging config
│   └── settings.json       # VS Code settings
├── images/                 # Character images (*.webp)
└── README.md               # This file
```

## 🎨 Features

### Design
- **Corporate Theme**: Professional color scheme and typography
- **Responsive Layout**: Optimized for desktop, tablet, and mobile
- **Dual Column Design**: Distinct styling for roles vs powers
- **Subtle Animations**: Professional glow effects and hover states

### Technical
- **Modular Architecture**: Separated HTML, CSS, and JavaScript
- **ES6 Classes**: Object-oriented JavaScript structure
- **CSS Custom Properties**: Easy theme customization
- **Firefox Debugging**: Ready-to-use debugging configuration

## 🚀 Getting Started

### Development Server
```bash
# Using Python
python3 -m http.server 5500

# Using Node.js (if you have it)
npx live-server --port=5500
```

### Debugging with Firefox
1. Press `F5` in VS Code
2. Select "Launch Firefox with Live Server"
3. Set breakpoints in your code
4. Debug in real-time

## 📁 File Structure

### HTML (`index.html`)
- Clean, semantic HTML5 structure
- Proper accessibility attributes
- External CSS and JS references
- Google Fonts integration

### CSS (`css/styles.css`)
- CSS Custom Properties for theming
- Mobile-first responsive design
- Component-based organization
- Professional color palette

### JavaScript (`js/app.js`)
- ES6 class-based architecture
- Event-driven interactions
- Utility methods for debugging
- Modular design for easy extension

### Configuration (`config/app.json`)
- Centralized app settings
- Theme configuration
- Feature flags
- Development settings

## 🎯 Key Improvements

1. **Separation of Concerns**: HTML, CSS, and JS are now separate
2. **Maintainability**: Easier to update and modify individual components
3. **Scalability**: Modular structure allows for easy feature additions
4. **Debugging**: Professional debugging setup with Firefox
5. **Performance**: Optimized loading and rendering
6. **Accessibility**: Improved semantic structure and keyboard navigation

## 🔧 Development

### CSS Variables
The design uses CSS custom properties for easy theming:
```css
:root {
    --primary-dark: #1a1a1a;
    --accent-orange: #e67e22;
    --accent-blue: #3498db;
    /* ... more variables */
}
```

### JavaScript API
```javascript
// Access the main app instance
const app = loupGarouApp;

// Get character data
const characters = app.getCharacterData();

// Reset animations
app.resetAllAnimations();

// Log character count
app.logCharacterCount();
```

## 🎮 Usage

1. **View Rules**: Browse character abilities and strategies
2. **Interactive Elements**: Click on title, hover over cards
3. **Mobile Support**: Fully responsive design
4. **Accessibility**: Keyboard navigation support

## 🔗 Links

- [Blood on the Clocktower Rules](http://bignose.whitetree.org/projects/botc/diy/reference/trouble-brewing.pdf)
- [Official Wiki](https://wiki.bloodontheclocktower.com/Trouble_Brewing)

## 📝 License

This project is for educational and personal use.
