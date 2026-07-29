/** Render the character catalogue at the top of reference.html. */
(function () {
    'use strict';

    function createAvailableCard(role) {
        const link = document.createElement('a');
        link.className = `role-card ${role.category} role-card-link`;
        link.href = `role.html?role=${encodeURIComponent(role.id)}`;
        link.setAttribute('aria-label', `Voir les détails de ${role.name}`);
        link.innerHTML = `
            <img class="role-icon" src="${role.image}" alt="${role.name}">
            <div class="role-body">
                <span class="role-badge ${role.category}">${role.categoryLabel}</span>
                <h3>${role.name}</h3>
                <p>${role.summary}</p>
                <span class="role-card-cta">Voir le personnage →</span>
            </div>
        `;
        return link;
    }

    function createComingSoonCard(role) {
        const card = document.createElement('article');
        card.className = `role-card ${role.category} role-card-coming-soon`;
        card.setAttribute('aria-label', `${role.name}, bientôt disponible`);
        card.innerHTML = `
            <div class="role-icon-placeholder" aria-hidden="true">${role.emoji || '❔'}</div>
            <div class="role-body">
                <span class="role-badge ${role.category}">${role.categoryLabel}</span>
                <h3>${role.name}</h3>
                <p>${role.summary}</p>
                <span class="coming-soon-label">Bientôt disponible</span>
            </div>
        `;
        return card;
    }

    function renderCatalogue() {
        const root = document.getElementById('roles-catalog');
        if (!root || !window.RoleCatalog) return;

        Object.entries(window.RoleCatalog.categories).forEach(([categoryId, category]) => {
            const roles = window.RoleCatalog.getRolesByCategory(categoryId);
            if (!roles.length) return;

            const section = document.createElement('section');
            section.className = 'role-category';
            section.innerHTML = `
                <h2 class="section-title ${categoryId}">
                    <span aria-hidden="true">${category.emoji}</span> ${category.plural}
                </h2>
                <div class="roles-grid"></div>
            `;

            const grid = section.querySelector('.roles-grid');
            roles.forEach((role) => {
                grid.appendChild(role.available ? createAvailableCard(role) : createComingSoonCard(role));
            });
            root.appendChild(section);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderCatalogue);
    } else {
        renderCatalogue();
    }
})();
