/** Load one character from the shared catalogue and render its detailed view. */
(function () {
    'use strict';

    function showNotFound() {
        document.title = 'Personnage introuvable — Loup Garou Ultime';
        document.getElementById('role-detail').innerHTML = `
            <section class="role-detail-state">
                <div class="role-detail-state-icon" aria-hidden="true">❔</div>
                <h1>Personnage introuvable</h1>
                <p>Ce personnage n'existe pas dans le catalogue.</p>
                <a class="detail-action" href="reference.html">← Retour aux personnages</a>
            </section>
        `;
    }

    function renderRole(role) {
        document.title = `${role.name} — Loup Garou Ultime`;
        const root = document.getElementById('role-detail');
        root.className = `role-detail role-detail-${role.category}`;
        root.innerHTML = `
            <section class="role-detail-hero">
                <img class="role-detail-image" src="${role.image}" alt="${role.name}">
                <div class="role-detail-heading">
                    <span class="role-badge ${role.category}">${role.categoryLabel}</span>
                    <h1>${role.name}</h1>
                </div>
            </section>

            <section class="role-detail-panel role-detail-power">
                <h2>⚡ Votre pouvoir</h2>
                <div class="role-detail-copy">${role.descriptionHtml}</div>
            </section>

            <section class="role-detail-panel role-detail-extra">
                <h2>💡 Autres infos</h2>
                <div class="role-detail-copy">${role.detailsHtml}</div>
            </section>
        `;
    }

    function init() {
        const params = new URLSearchParams(window.location.search);
        const role = window.RoleCatalog && window.RoleCatalog.getRoleDetails(params.get('role'));
        if (!role || !role.available) {
            showNotFound();
            return;
        }
        renderRole(role);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
