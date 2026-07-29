/**
 * Canonical character catalogue for Loup Garou Ultime.
 * Both the rules catalogue and the character detail page consume this file.
 */
(function () {
    'use strict';

    const categories = {
        "villageois": {
                "label": "Villageois",
                "plural": "Villageois",
                "emoji": "👥"
        },
        "marginal": {
                "label": "Marginal",
                "plural": "Marginaux",
                "emoji": "🌀"
        },
        "loup-garou": {
                "label": "Loup Garou",
                "plural": "Loups Garous",
                "emoji": "🐺"
        },
        "loup-garou-ultime": {
                "label": "Loup Garou Ultime",
                "plural": "Loup Garou Ultime",
                "emoji": "🌕"
        }
};

    const roles = [
        {
            id: "petite-fille",
            name: "Petite Fille",
            category: "villageois",
            categoryLabel: "Villageois",
            image: "images/petite-fille.webp",
            emoji: null,
            summary: "Lors de la première nuit, vous savez qu'un Villageois se cache parmi deux joueurs.",
            descriptionHtml: `Lors de la première nuit, le maître du jeu vous montrera un rôle de
                            villageois puis pointera deux joueurs. L'un de ces deux joueurs est le
                            villageois précédemment montré.`,
            detailsHtml: `<b>Conseil:</b> votre pouvoir ne s'applique que lors de la première
                            nuit. N'hésitez pas à partager au plus vite vos informations.`,
            available: true
        },
        {
            id: "bibliothecaire",
            name: "Bibliothécaire",
            category: "villageois",
            categoryLabel: "Villageois",
            image: null,
            emoji: "📚",
            summary: "Lors de la première nuit, vous savez qu'un Marginal se cache parmi deux joueurs. (Ou qu'il n'y en a aucun en jeu.)",
            descriptionHtml: null,
            detailsHtml: null,
            available: false
        },
        {
            id: "renard",
            name: "Renard",
            category: "villageois",
            categoryLabel: "Villageois",
            image: "images/renard.webp",
            emoji: null,
            summary: "Lors de la première nuit, vous savez qu'un Loup Garou se cache parmi deux joueurs.",
            descriptionHtml: `Lors de la première nuit, le maître du jeu vous montrera un rôle de loup
                            garou (sauf celui du Loup Garou Ultime) puis pointera deux joueurs. L'un
                            de ces deux joueurs est le loup garou précédemment montré.`,
            detailsHtml: `<b>Conseil:</b> votre pouvoir ne s'applique que lors de la première
                            nuit. N'hésitez pas à partager au plus vite vos informations.`,
            available: true
        },
        {
            id: "montreur-dours",
            name: "Montreur d'ours",
            category: "villageois",
            categoryLabel: "Villageois",
            image: "images/montreur-dours.webp",
            emoji: null,
            summary: "Lors de la première nuit, vous découvrez combien de loup garous sont placés côte à côte.",
            descriptionHtml: `Lors de la première nuit, vous découvrez combien de loup garous sont
                            placés côte à côte.`,
            detailsHtml: `<b>Conseil:</b> votre pouvoir ne s'applique que lors de la première
                            nuit. N'hésitez pas à partager au plus vite vos informations.`,
            available: true
        },
        {
            id: "cupidon",
            name: "Cupidon",
            category: "villageois",
            categoryLabel: "Villageois",
            image: "images/cupidon.webp",
            emoji: null,
            summary: "Chaque nuit, vous apprenez combien de vos 2 voisins vivants sont des Loups Garous.",
            descriptionHtml: `Chaque nuit, parmi les deux joueurs <b>vivants</b> qui vous entourent,
                            vous apprenez combien de loup garous vous entourent (0, 1 ou 2).`,
            detailsHtml: `<b>Conseil:</b> votre pouvoir s'applique chaque nuit et vous serez
                            probablement une cible pour le Loup Garou Ultime. <br/>
                            Votre discrétion peut être un atout pour ne pas tenter sa morsure.`,
            available: true
        },
        {
            id: "voyante",
            name: "Voyante",
            category: "villageois",
            categoryLabel: "Villageois",
            image: "images/voyante.webp",
            emoji: null,
            summary: "Chaque nuit, choisissez 2 joueurs : vous apprenez si l'un d'eux est le Loup Garou Ultime. Un joueur Gentil vous apparaît comme Loup Garou Ultime.",
            descriptionHtml: `Chaque nuit, choisissez deux joueurs (vous pouvez vous choisir vous-même). Si l'un d'eux est le loup
                            garou ultime, vous aurez l'information.
                            <b>ATTENTION:</b> un gentil (villageois et marginaux) est un leurre et vous apparaîtra
                            comme le Loup Garou Ultime !`,
            detailsHtml: `<b>Conseil:</b> votre pouvoir s'applique chaque nuit et vous serez
                            probablement une cible pour le Loup Garou Ultime. <br/>
                            Votre discrétion peut être un atout pour ne pas tenter sa morsure.`,
            available: true
        },
        {
            id: "enfant-sauvage",
            name: "Enfant Sauvage",
            category: "villageois",
            categoryLabel: "Villageois",
            image: "images/enfant.webp",
            emoji: null,
            summary: "Chaque nuit*, vous apprenez quel personnage a été exécuté aujourd'hui. * Ne se réveille pas la première nuit.",
            descriptionHtml: `Si un joueur est exécuté par le village durant la journée, vous
                            découvrez son identité la nuit.`,
            detailsHtml: `<b>Conseil:</b> votre pouvoir se déclenche <b>uniquement</b> après
                            l'exécution du jour donc n'hésitez pas à déclencher des
                            nominations/exécutions pour innocenter/accuser quelqu'un.`,
            available: true
        },
        {
            id: "chevalier",
            name: "Chevalier",
            category: "villageois",
            categoryLabel: "Villageois",
            image: "images/chevalier.webp",
            emoji: null,
            summary: "Chaque nuit*, choisissez un joueur (pas vous-même) : il est protégé du Loup Garou Ultime cette nuit. * Ne se réveille pas la première nuit.",
            descriptionHtml: `Chaque nuit (sauf la première), choisissez un autre personnage, celui-ci
                            est protégé du Loup Garou Ultime le temps d'une nuit.`,
            detailsHtml: `<b>Conseil:</b> votre pouvoir peut être précieux pour des personnages
                            faisant l'acquisition d'information régulièrement ou à pouvoir unique
                            tels que Cupidon, la voyante ou le chasseur.<br/>
                            Essayez vite de les identifier afin de les protéger.`,
            available: true
        },
        {
            id: "sorciere",
            name: "Sorcière",
            category: "villageois",
            categoryLabel: "Villageois",
            image: "images/sorciere.webp",
            emoji: null,
            summary: "Si vous mourez la nuit, vous êtes réveillé(e) pour choisir un joueur : vous apprenez son personnage.",
            descriptionHtml: `Si vous mourrez la nuit, vous choisissez un personnage et découvrez son
                            identité.`,
            detailsHtml: `<b>Conseil:</b> votre pouvoir se déclenche à votre mort. Donc n'hésitez
                            pas à vous faire passer pour un personnage en possession d'informations
                            afin d'attirer la morsure du loup garou. Si vous vous faites éliminer
                            par le village, votre pouvoir ne se déclenchera pas.`,
            available: true
        },
        {
            id: "joueur-de-flute",
            name: "Joueur de flûte",
            category: "villageois",
            categoryLabel: "Villageois",
            image: "images/flute.webp",
            emoji: null,
            summary: "La première fois que vous êtes nominé(e), si le nominateur est un Villageois, il est immédiatement exécuté.",
            descriptionHtml: `Pendant la journée, si un joueur vous désigne pour une exécution et que
                            ce joueur est un <b>villageois (hors Marginaux)</b>, alors il est immédiatement exécuté. Ce pouvoir n'est
                            utilisé qu'une seule fois. <b>ATTENTION : </b> ne dites rien lorsque c'est
                            le cas. Le maître du jeu interviendra à ce moment précis.`,
            detailsHtml: `<b>Conseils:</b> ce pouvoir vous permet de vous protéger des mauvaises
                            accusations donc n'hésitez pas à l'énoncer si on vous accuse à tort.<br/>
                            De même, si quelqu'un vous désigne pour une exécution et qu'il n'est pas
                            lui-même exécuté, alors vous venez probablement de déceler un loup
                            garou.<br/>
                            À l'inverse, si la personne est exécutée, alors elle est immédiatement
                            innocentée.`,
            available: true
        },
        {
            id: "chasseur",
            name: "Chasseur",
            category: "villageois",
            categoryLabel: "Villageois",
            image: "images/chasseur.webp",
            emoji: null,
            summary: "Une fois par partie, pendant le jour, désignez publiquement un joueur : s'il est le Loup Garou Ultime, il meurt.",
            descriptionHtml: `Une fois par partie, pendant la journée, choisissez publiquement un
                            joueur. Si c'est le Loup Garou Ultime, il meurt.`,
            detailsHtml: `<b>Conseil:</b> votre pouvoir ne se réalise qu'une seule fois donc
                            essayez de l'utiliser avant de mourir.<br/>
                            Même si vous vous trompez, votre cible ne mourra pas et vous saurez que
                            ce n'est pas le Loup Garou Ultime.`,
            available: true
        },
        {
            id: "ancien",
            name: "Ancien",
            category: "villageois",
            categoryLabel: "Villageois",
            image: "images/ancien.webp",
            emoji: null,
            summary: "Vous êtes protégé(e) du Loup Garou Ultime.",
            descriptionHtml: `Le Loup Garou Ultime ne peut pas vous tuer.`,
            detailsHtml: `<b>Conseil:</b> votre pouvoir vous permet d'annuler la morsure du loup
                            garou ultime pendant une nuit. <br/>
                            N'hésitez pas à vous faire passer pour une proie du Loup Garou Ultime
                            (en prétendant d'avoir de précieuses informations) afin qu'il s'en
                            prenne à vous la nuit.`,
            available: true
        },
        {
            id: "maire",
            name: "Maire",
            category: "villageois",
            categoryLabel: "Villageois",
            image: null,
            emoji: "👑",
            summary: "Si seulement 3 joueurs restent en vie et qu'aucune exécution n'a lieu, votre équipe gagne. Si vous mourez la nuit, un autre joueur pourrait mourir à votre place.",
            descriptionHtml: null,
            detailsHtml: null,
            available: false
        },
        {
            id: "majordome",
            name: "Majordome",
            category: "marginal",
            categoryLabel: "Marginal",
            image: null,
            emoji: "🙏",
            summary: "Chaque nuit, choisissez un joueur (pas vous-même) : demain, vous ne pouvez voter que si ce joueur vote aussi.",
            descriptionHtml: null,
            detailsHtml: null,
            available: false
        },
        {
            id: "ivrogne",
            name: "Ivrogne",
            category: "marginal",
            categoryLabel: "Marginal",
            image: "images/ivrogne.webp",
            emoji: "🍺",
            summary: "Vous ne savez pas que vous êtes l'Ivrogne. Vous croyez être un personnage Villageois, mais ce n'est pas le cas.",
            descriptionHtml: "Vous ne savez pas que vous êtes l'Ivrogne. Vous croyez être un personnage Villageois, mais ce n'est pas le cas.",
            detailsHtml: "<b>Conseil:</b> Pensez à consommer de l'alcool avec modération. L'abus d'alcool est dangereux pour la santé.",
            available: true
        },
        {
            id: "reclus",
            name: "Reclus",
            category: "marginal",
            categoryLabel: "Marginal",
            image: null,
            emoji: "🧍",
            summary: "Vous pouvez être perçu comme Maléfique et comme Loup Garou ou Loup Garou Ultime, même mort(e).",
            descriptionHtml: null,
            detailsHtml: null,
            available: false
        },
        {
            id: "ange",
            name: "Ange",
            category: "marginal",
            categoryLabel: "Marginal",
            image: "images/ange.webp",
            emoji: null,
            summary: "Si vous mourez par exécution, votre équipe perd.",
            descriptionHtml: `Si le village vous élimine, le village perd la partie.`,
            detailsHtml: `<b>Conseil:</b> votre personnage peut vous protéger de fausses
                            accusations en révélant votre rôle. Donc n'hésitez à l'énoncer pour vous
                            protéger.`,
            available: true
        },
        {
            id: "infect-loup-garou",
            name: "Infect Loup Garou",
            category: "loup-garou",
            categoryLabel: "Loup Garou",
            image: "images/infectloup.webp",
            emoji: null,
            summary: "Chaque nuit, choisissez un joueur : il est empoisonné cette nuit et le jour suivant.",
            descriptionHtml: `Chaque nuit, choisissez un joueur. Ce joueur est empoisonné et ne
                            bénéficie plus de son pouvoir jusqu'au début de la prochaine nuit.`,
            detailsHtml: `Le loup garou infect prend connaissance d'un rôle de villageois qui
                            n'est pas présent dans la partie afin de pouvoir se faire passer pour
                            celui-ci.<br/>
                            Le poison <b>annule</b> ou <b>altère</b> les pouvoirs des
                            villageois.<br/>
                            Si un villageois faisant l'acquisition d'informations pendant la nuit
                            (petite fille, voyante, montreur d’ours, ...) est empoisonné, alors le conteur
                            peut <b>altérer</b> (ou non) les informations selon son choix.<br/>
                            Si un villageois ayant un pouvoir non lié à la prise d'information
                            (chasseur, ancien, chevalier, flûtiste) alors son pouvoir sera
                            <b>annulé</b> sans qu'il le sache.<br/>
<b>Conseil:</b> de bonnes cibles pour l'empoisonnement sont Cupidon, la
                            voyante, l'ancien ou le chevalier dont les pouvoirs vous gêneront
                            amplement.`,
            available: true
        },
        {
            id: "espion",
            name: "Espion",
            category: "loup-garou",
            categoryLabel: "Loup Garou",
            image: null,
            emoji: "🕵️",
            summary: "Chaque nuit, vous consulter les informations du MJ. Vous pouvez être perçu comme Gentil et comme Villageois ou Marginal, même mort(e).",
            descriptionHtml: null,
            detailsHtml: null,
            available: false
        },
        {
            id: "grand-loup-garou",
            name: "Grand Loup Garou",
            category: "loup-garou",
            categoryLabel: "Loup Garou",
            image: "images/grandloup.webp",
            emoji: null,
            summary: "Si 5 joueurs ou plus sont en vie et que le Loup Garou Ultime meurt, vous devenez le Loup Garou Ultime.",
            descriptionHtml: `S'il y a toujours plus de 5 joueurs en vie et que le Loup Garou Ultime
                            meurt, vous devenez le Loup Garou Ultime.`,
            detailsHtml: `Le grand loup garou prend connaissance d'un rôle de villageois qui n'est
                            pas présent dans la partie afin de pouvoir se faire passer pour
                            celui-ci.`,
            available: true
        },
        {
            id: "baron",
            name: "Baron",
            category: "loup-garou",
            categoryLabel: "Loup Garou",
            image: null,
            emoji: "⚖️",
            summary: "Deux marginaux supplémentaires ont été ajoutés au jeu.",
            descriptionHtml: null,
            detailsHtml: null,
            available: false
        },
        {
            id: "loup-garou-ultime",
            name: "Loup Garou Ultime",
            category: "loup-garou-ultime",
            categoryLabel: "Loup Garou Ultime",
            image: "images/loupgarou.webp",
            emoji: null,
            summary: "Chaque nuit*, choisissez un joueur : il meurt. Si vous vous tuez ainsi, un Loup Garou devient le Loup Garou Ultime. * Ne se réveille pas la première nuit.",
            descriptionHtml: `Chaque nuit (sauf la première), choisissez un joueur. Il meurt. Note :
                            Vous pouvez choisir de vous tuer vous-même et l'infect loup-garou ou le
                            grand loup jouera votre rôle.`,
            detailsHtml: `Le Loup Garou Ultime prend connaissance d'un rôle de villageois qui
                            n'est pas présent dans la partie afin de pouvoir se faire passer pour
                            celui-ci.
                            <b>Conseil:</b> ciblez les personnages qui acquièrent de l'information
                            (voyante, enfant sauvage, cupidon) et évitez de mordre l'ancien.`,
            available: true
        }
    ];

    function normalizeRoleKey(value) {
        return String(value || '')
            .trim()
            .toLocaleLowerCase('fr')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[’']/g, '-')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function getRoleDetails(roleNameOrId) {
        const key = normalizeRoleKey(roleNameOrId);
        return roles.find((role) =>
            normalizeRoleKey(role.id) === key || normalizeRoleKey(role.name) === key
        ) || null;
    }

    function getRolesByCategory(category) {
        return roles.filter((role) => role.category === category);
    }

    window.RoleCatalog = Object.freeze({
        categories: Object.freeze(categories),
        roles: Object.freeze(roles),
        getRoleDetails,
        getRolesByCategory
    });
})();
