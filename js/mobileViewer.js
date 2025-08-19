/**
 * Mobile Character Viewer
 * Provides swipe navigation and tap-to-reveal functionality for mobile devices
 */
class MobileCharacterViewer {
    constructor() {
        this.currentIndex = 0;
        this.characters = [];
        this.isViewerActive = false;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.isDescriptionVisible = false;
        
        this.init();
    }

    init() {
        this.extractCharacterData();
        this.createMobileViewer();
        this.bindEvents();
    }

    extractCharacterData() {
        // Extract character data from the existing table
        const tableRows = document.querySelectorAll('table tbody tr');
        
        tableRows.forEach(row => {
            const img = row.querySelector('img');
            const description = row.querySelector('.description');
            
            if (img && description) {
                const character = {
                    name: img.alt,
                    image: img.src,
                    description: description.innerHTML
                };
                this.characters.push(character);
            }
        });
    }

    createMobileViewer() {
        // Create mobile viewer container (no button or hints needed)
        const viewerHTML = `
            <div class="mobile-character-viewer" id="mobileViewer">
                <div class="navigation-indicators" id="navIndicators"></div>
                <div class="character-cards-container" id="cardsContainer"></div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', viewerHTML);

        // Create character cards
        this.createCharacterCards();
        this.createNavigationIndicators();
        
        // Auto-open on mobile devices
        if (window.innerWidth <= 768) {
            setTimeout(() => this.openViewer(), 100);
        }
    }

    createCharacterCards() {
        const container = document.getElementById('cardsContainer');
        
        this.characters.forEach((character, index) => {
            const cardHTML = `
                <div class="character-card" data-index="${index}">
                    <img class="character-image" src="${character.image}" alt="${character.name}">
                    <h2 class="character-name-mobile">${character.name}</h2>
                    <div class="character-description-mobile">${character.description}</div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    createNavigationIndicators() {
        const navContainer = document.getElementById('navIndicators');
        
        this.characters.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = `nav-dot ${index === 0 ? 'active' : ''}`;
            dot.addEventListener('click', () => this.goToSlide(index));
            navContainer.appendChild(dot);
        });
    }

    bindEvents() {
        // Touch events for swiping
        const cardsContainer = document.getElementById('cardsContainer');
        
        cardsContainer.addEventListener('touchstart', (e) => {
            this.handleTouchStart(e);
        });

        cardsContainer.addEventListener('touchend', (e) => {
            this.handleTouchEnd(e);
        });

        // Click events for character cards
        cardsContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.character-card');
            if (card) {
                this.toggleDescription(card);
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isViewerActive) return;

            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousSlide();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextSlide();
                    break;
                case ' ':
                    e.preventDefault();
                    const currentCard = document.querySelector('.character-card[data-index="' + this.currentIndex + '"]');
                    this.toggleDescription(currentCard);
                    break;
            }
        });

        // Prevent scroll on mobile viewer
        document.getElementById('mobileViewer').addEventListener('touchmove', (e) => {
            if (this.isViewerActive) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
    }

    handleTouchEnd(e) {
        this.touchEndX = e.changedTouches[0].clientX;
        this.handleSwipeGesture();
    }

    handleSwipeGesture() {
        const swipeThreshold = 50;
        const swipeDistance = this.touchEndX - this.touchStartX;

        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) {
                // Swipe right - previous slide
                this.previousSlide();
            } else {
                // Swipe left - next slide
                this.nextSlide();
            }
        }
    }

    openViewer() {
        this.isViewerActive = true;
        document.getElementById('mobileViewer').classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Reset to first slide and hide descriptions
        this.goToSlide(0);
        this.hideAllDescriptions();
    }

    nextSlide() {
        const nextIndex = (this.currentIndex + 1) % this.characters.length;
        this.goToSlide(nextIndex);
    }

    previousSlide() {
        const prevIndex = (this.currentIndex - 1 + this.characters.length) % this.characters.length;
        this.goToSlide(prevIndex);
    }

    goToSlide(index) {
        this.currentIndex = index;
        const container = document.getElementById('cardsContainer');
        const translateX = -index * 100;
        
        container.style.transform = `translateX(${translateX}vw)`;
        
        // Update navigation indicators
        document.querySelectorAll('.nav-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        // Hide descriptions when changing slides
        this.hideAllDescriptions();
    }

    toggleDescription(card) {
        const isCurrentlyVisible = card.classList.contains('description-visible');
        
        // Hide all descriptions first
        this.hideAllDescriptions();
        
        if (!isCurrentlyVisible) {
            // Show description for this card
            card.classList.add('description-visible');
            this.isDescriptionVisible = true;
            
            // Scroll description to top
            const description = card.querySelector('.character-description-mobile');
            if (description) {
                description.scrollTop = 0;
            }
        } else {
            this.isDescriptionVisible = false;
        }
    }

    hideAllDescriptions() {
        document.querySelectorAll('.character-card').forEach(card => {
            card.classList.remove('description-visible');
        });
        this.isDescriptionVisible = false;
    }

    // Public methods for integration with main app
    getCurrentCharacter() {
        return this.characters[this.currentIndex];
    }

    isActive() {
        return this.isViewerActive;
    }

    getCharacterCount() {
        return this.characters.length;
    }
}

// Initialize mobile viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on mobile devices or small screens
    if (window.innerWidth <= 768) {
        window.mobileViewer = new MobileCharacterViewer();
    }
    
    // Reinitialize on window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768 && !window.mobileViewer) {
            window.mobileViewer = new MobileCharacterViewer();
        } else if (window.innerWidth > 768 && window.mobileViewer) {
            // Clean up mobile viewer if screen becomes larger
            const viewer = document.getElementById('mobileViewer');
            if (viewer) viewer.remove();
            window.mobileViewer = null;
            // Restore normal body overflow
            document.body.style.overflow = '';
        }
    });
});

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileCharacterViewer;
}
