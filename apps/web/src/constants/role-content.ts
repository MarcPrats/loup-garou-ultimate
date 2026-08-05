export interface RoleContent {
  readonly power: string
  readonly info: string
}

export const ROLE_CONTENT: Readonly<Record<string, RoleContent | undefined>> = {
  "loup-garou-ultime": {
    power: "Chaque nuit (sauf la première), choisissez un joueur. Il meurt. Note : Vous pouvez choisir de vous tuer vous-même et l'infect loup-garou ou le grand loup jouera votre rôle.",
    info: "Le Loup Garou Ultime prend connaissance d'un rôle de villageois qui n'est pas présent dans la partie afin de pouvoir se faire passer pour celui-ci. Ciblez les personnages qui acquièrent de l'information (voyante, enfant sauvage, cupidon) et évitez de mordre l'ancien.",
  },
  "infect-loup": {
    power: "Chaque nuit, choisissez un joueur. Ce joueur est empoisonné et ne bénéficie plus de son pouvoir jusqu'au début de la prochaine nuit.",
    info: "Le loup garou infect prend connaissance d'un rôle de villageois qui n'est pas présent dans la partie. Le poison annule ou altère les pouvoirs des villageois. De bonnes cibles pour l'empoisonnement sont Cupidon, la voyante, l'ancien ou le chevalier dont les pouvoirs vous gêneront amplement.",
  },
  "grand-loup": {
    power: "S'il y a toujours plus de 5 joueurs en vie et que le Loup Garou Ultime meurt, vous devenez le Loup Garou Ultime.",
    info: "Le grand loup garou prend connaissance d'un rôle de villageois qui n'est pas présent dans la partie afin de pouvoir se faire passer pour celui-ci.",
  },
  "petite-fille": {
    power: "Lors de la première nuit, le maître du jeu vous montrera un rôle de villageois puis pointera deux joueurs. L'un de ces deux joueurs est le villageois précédemment montré.",
    info: "Votre pouvoir ne s'applique que lors de la première nuit. N'hésitez pas à partager au plus vite vos informations.",
  },
  "renard": {
    power: "Lors de la première nuit, le maître du jeu vous montrera un rôle de loup garou (sauf celui du Loup Garou Ultime) puis pointera deux joueurs. L'un de ces deux joueurs est le loup garou précédemment montré.",
    info: "Votre pouvoir ne s'applique que lors de la première nuit. N'hésitez pas à partager au plus vite vos informations.",
  },
  "montreur-dours": {
    power: "Lors de la première nuit, vous découvrez combien de loup garous sont placés côte à côte.",
    info: "Votre pouvoir ne s'applique que lors de la première nuit. N'hésitez pas à partager au plus vite vos informations.",
  },
  "cupidon": {
    power: "Chaque nuit, parmi les deux joueurs vivants qui vous entourent, vous apprenez combien de loup garous vous entourent (0, 1 ou 2).",
    info: "Votre pouvoir s'applique chaque nuit et vous serez probablement une cible pour le Loup Garou Ultime. Votre discrétion peut être un atout pour ne pas tenter sa morsure.",
  },
  "voyante": {
    power: "Chaque nuit, choisissez deux joueurs. Si au moins l'un d'eux est le Loup Garou Ultime, vous aurez l'information. ATTENTION : l'un des villageois est un leurre et vous apparaîtra comme le Loup Garou Ultime !",
    info: "Votre pouvoir s'applique chaque nuit et vous serez probablement une cible pour le Loup Garou Ultime. Votre discrétion peut être un atout pour ne pas tenter sa morsure.",
  },
  "chevalier": {
    power: "Chaque nuit (sauf la première), choisissez un autre personnage, celui-ci est protégé du Loup Garou Ultime le temps d'une nuit.",
    info: "Votre pouvoir peut être précieux pour des personnages faisant l'acquisition d'information régulièrement ou à pouvoir unique tels que Cupidon, la voyante ou le chasseur. Essayez vite de les identifier afin de les protéger.",
  },
  "chasseur": {
    power: "Une fois par partie, pendant la journée, choisissez publiquement un joueur. Si c'est le Loup Garou Ultime, il meurt.",
    info: "Votre pouvoir ne se réalise qu'une seule fois donc essayez de l'utiliser avant de mourir. Même si vous vous trompez, votre cible ne mourra pas et vous saurez que ce n'est pas le Loup Garou Ultime.",
  },
  "flutiste": {
    power: "Pendant la journée, si un joueur vous désigne pour une exécution et que ce joueur est un villageois (à part si c'est l'ange ou s'il est bourré), alors il est immédiatement exécuté. Ce pouvoir n'est utilisé qu'une seule fois. ATTENTION : ne dites rien lorsque c'est le cas. Le maître du jeu interviendra à ce moment précis.",
    info: "Ce pouvoir vous permet de vous protéger des mauvaises accusations, donc n'hésitez pas à l'énoncer si on vous accuse à tort.",
  },
  "sorciere": {
    power: "Si vous mourrez la nuit, vous choisissez un personnage et découvrez son identité.",
    info: "Votre pouvoir se déclenche à votre mort. Donc n'hésitez pas à vous faire passer pour un personnage en possession d'informations afin d'attirer la morsure du loup garou. Si vous vous faites éliminer par le village, votre pouvoir ne se déclenchera pas.",
  },
  "ancien": {
    power: "Le Loup Garou Ultime ne peut pas vous tuer.",
    info: "Votre pouvoir vous permet d'annuler la morsure du Loup Garou Ultime pendant une nuit. N'hésitez pas à vous faire passer pour une proie du Loup Garou Ultime (en prétendant d'avoir de précieuses informations) afin qu'il s'en prenne à vous la nuit.",
  },
  "enfant-sauvage": {
    power: "Si un joueur est exécuté par le village durant la journée, vous découvrez son identité la nuit.",
    info: "Votre pouvoir se déclenche uniquement après l'exécution du jour donc n'hésitez pas à déclencher des nominations/exécutions pour innocenter/accuser quelqu'un.",
  },
  "ange": {
    power: "Si le village vous élimine, le village perd la partie.",
    info: "Votre personnage peut vous protéger de fausses accusations en révélant votre rôle. Donc n'hésitez à l'énoncer pour vous protéger.",
  },
}
