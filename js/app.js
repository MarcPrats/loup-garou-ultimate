/**
 * Loup Garou Ultimate - Interactive Features
 * Corporate Edition
 */

class LoupGarouApp {
    constructor() {
        this.init();
    }

    init() {
        console.log("🏢 Loup Garou Ultimate - Corporate Edition initialized!");
        this.setupEventListeners();
        this.addInteractiveEffects();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupTitleAnimation();
            this.setupTableInteractions();
            this.setupLinkAnimations();
        });
    }

    setupTitleAnimation() {
        const title = document.querySelector('h1');
        if (title) {
            title.addEventListener('click', () => {
                this.triggerTitleEffect(title);
            });
        }
    }

    triggerTitleEffect(titleElement) {
        titleElement.style.animation = 'none';
        setTimeout(() => {
            titleElement.style.animation = 'gentleGlow 6s ease-in-out infinite alternate';
        }, 100);
    }

    setupTableInteractions() {
        const tableRows = document.querySelectorAll('tr');
        tableRows.forEach(row => {
            if (row.querySelector('td')) {
                this.addRowHoverEffects(row);
            }
        });
    }

    addRowHoverEffects(row) {
        const img = row.querySelector('img');
        if (img) {
            row.addEventListener('mouseenter', () => {
                img.style.transform = 'scale(1.05)';
            });

            row.addEventListener('mouseleave', () => {
                img.style.transform = 'scale(1)';
            });
        }
    }

    setupLinkAnimations() {
        const links = document.querySelectorAll('.links-section a');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                this.animateLink(link);
            });
        });
    }

    animateLink(linkElement) {
        linkElement.style.transform = 'scale(0.95)';
        setTimeout(() => {
            linkElement.style.transform = 'translateY(-1px)';
        }, 150);
    }

    addInteractiveEffects() {
        // Add subtle interactive feedback without overwhelming effects
        this.addClickFeedback();
        this.addKeyboardNavigation();
    }

    addClickFeedback() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.container')) {
                this.createRippleEffect(e);
            }
        });
    }

    createRippleEffect(event) {
        // Subtle ripple effect for professional UI
        if (Math.random() > 0.7) { // Reduced frequency for corporate feel
            const ripple = document.createElement('div');
            ripple.style.position = 'fixed';
            ripple.style.left = event.clientX + 'px';
            ripple.style.top = event.clientY + 'px';
            ripple.style.width = '6px';
            ripple.style.height = '6px';
            ripple.style.background = 'rgba(230, 126, 34, 0.4)';
            ripple.style.borderRadius = '50%';
            ripple.style.pointerEvents = 'none';
            ripple.style.zIndex = '1000';
            ripple.style.animation = 'fadeOut 0.8s ease-out forwards';

            document.body.appendChild(ripple);

            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.parentNode.removeChild(ripple);
                }
            }, 800);
        }
    }

    addKeyboardNavigation() {
        // Enhanced accessibility
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.resetAllAnimations();
            }
        });
    }

    resetAllAnimations() {
        const animatedElements = document.querySelectorAll('[style*="animation"]');
        animatedElements.forEach(element => {
            element.style.animation = '';
        });
    }

    // Utility methods for debugging and development
    getCharacterData() {
        const characters = [];
        const rows = document.querySelectorAll('tr');

        rows.forEach(row => {
            const img = row.querySelector('img');
            const title = row.querySelector('.title');
            if (img && title) {
                characters.push({
                    name: title.textContent,
                    image: img.src,
                    description: row.querySelector('.description').textContent.trim()
                });
            }
        });

        return characters;
    }

    logCharacterCount() {
        const characters = this.getCharacterData();
        console.log(`📊 Total characters: ${characters.length}`);
        return characters.length;
    }
}

// CSS animation for fade out effect
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        0% {
            opacity: 1;
            transform: scale(1);
        }
        100% {
            opacity: 0;
            transform: scale(1.5);
        }
    }
`;
document.head.appendChild(style);

// Initialize the application
const loupGarouApp = new LoupGarouApp();

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoupGarouApp;
}
