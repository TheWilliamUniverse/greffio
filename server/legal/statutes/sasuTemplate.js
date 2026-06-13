const longClause = (title, body) => ({
  title,
  body,
});

const buildSasuStatutesSections = (data) => ([
  longClause('Article 1 – Forme', `Il est formé entre le soussigné une société par actions simplifiée unipersonnelle régie par les dispositions légales et réglementaires applicables ainsi que par les présents statuts.`),
  longClause('Article 2 – Dénomination sociale', `La société prend la dénomination « ${data.denomination} ». Tous actes et documents émanant de la société doivent mentionner cette dénomination.`),
  longClause('Article 3 – Objet social', `${data.objetSocial}. La société peut réaliser toutes opérations connexes utiles à cet objet social.`),
  longClause('Article 4 – Siège social', `Le siège est fixé à ${data.siege}. Il pourra être transféré conformément aux règles prévues par la loi et les présents statuts.`),
  longClause('Article 5 – Durée', `La durée de la société est fixée à ${data.duree || '99 ans'} à compter de son immatriculation au RCS.`),
  longClause('Article 6 – Apports', `L’associé unique effectue les apports décrits aux présentes, dont la valeur totale correspond au capital social.`),
  longClause('Article 7 – Capital social', `Le capital social est fixé à ${data.capital} euros, divisé en actions de même catégorie, intégralement souscrites.`),
  longClause('Article 8 – Modification du capital', `Le capital peut être augmenté, réduit ou amorti conformément aux dispositions légales applicables et aux décisions de l’associé unique.`),
  longClause('Article 9 – Forme des actions', `Les actions sont nominatives et inscrites en compte au nom de leur titulaire.`),
  longClause('Article 10 – Libération des actions', `Les actions souscrites en numéraire sont libérées dans les conditions prévues par la loi.`),
  longClause('Article 11 – Droits et obligations', `Chaque action donne droit à une quote-part de l’actif social, des bénéfices et du boni de liquidation, selon les présentes dispositions.`),
  longClause('Article 12 – Transmission des actions', `Les transmissions d’actions par l’associé unique sont libres sous réserve des dispositions légales.`),
  longClause('Article 13 – Agrément', `En cas de pluralité d’actionnaires ultérieure, les cessions à des tiers peuvent être soumises à agrément selon décision collective.`),
  longClause('Article 14 – Président', `${data.president} est nommé président dans les conditions prévues à l’article 28.`),
  longClause('Article 15 – Pouvoirs du président', `Le président représente la société à l’égard des tiers. Il dispose des pouvoirs les plus étendus pour agir en toutes circonstances au nom de la société dans la limite de l’objet social.`),
  longClause('Article 16 – Directeur général', `L’associé unique peut nommer un ou plusieurs directeurs généraux et déterminer leurs pouvoirs.`),
  longClause('Article 17 – Décisions collectives', `Les décisions de l’associé unique sont constatées par procès-verbal inscrit sur un registre coté et paraphé.`),
  longClause('Article 18 – Associé unique', `L’associé unique exerce les pouvoirs dévolus aux associés dans les SAS pluripersonnelles.`),
  longClause('Article 19 – Conventions réglementées', `Les conventions intervenues entre la société et son dirigeant sont soumises aux règles de contrôle prévues par la loi.`),
  longClause('Article 20 – Exercice social', `L’exercice social commence le ${data.exerciceDebut || '1er janvier'} et se termine le ${data.exerciceFin || '31 décembre'} de chaque année.`),
  longClause('Article 21 – Comptes annuels', `Le président arrête les comptes annuels et établit un rapport de gestion conformément aux obligations légales.`),
  longClause('Article 22 – Affectation du résultat', `Après approbation des comptes, le résultat est affecté conformément aux décisions de l’associé unique et aux réserves légales.`),
  longClause('Article 23 – Capitaux propres', `Si les capitaux propres deviennent inférieurs à la moitié du capital social, il est procédé conformément aux règles légales.`),
  longClause('Article 24 – Transformation', `La transformation de la société en une autre forme sociale est décidée conformément aux dispositions légales applicables.`),
  longClause('Article 25 – Dissolution', `La société prend fin dans les cas prévus par la loi ou par décision de l’associé unique.`),
  longClause('Article 26 – Liquidation', `La liquidation est organisée selon les règles légales, l’associé unique nommant le liquidateur et fixant ses pouvoirs.`),
  longClause('Article 27 – Contestations', `Toute contestation relative aux affaires sociales est soumise aux juridictions compétentes du ressort du siège social, sous réserve des règles impératives.`),
  longClause('Article 28 – Nomination du premier président', `${data.president} est nommé premier président de la société pour une durée indéterminée.`),
  longClause('Article 29 – Reprise des actes', `La société reprend les engagements pris pour son compte en formation, selon l’état annexé aux présents statuts.`),
  longClause('Article 30 – Pouvoirs pour formalités', `Tous pouvoirs sont donnés au porteur d’un original ou d’une copie des présentes pour accomplir les formalités de publicité et d’immatriculation.`),
]);

export {
  buildSasuStatutesSections,
};
