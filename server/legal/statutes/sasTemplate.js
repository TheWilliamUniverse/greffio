const clause = (title, body) => ({ title, body });

const buildSasStatutesSections = (data) => ([
  clause('Article 1 – Forme', `Il est formé entre les soussignés une société par actions simplifiée régie par les dispositions légales applicables et les présents statuts.`),
  clause('Article 2 – Dénomination sociale', `La société prend la dénomination « ${data.denomination} ».`),
  clause('Article 3 – Objet social', `${data.objetSocial}. La société peut accomplir toutes opérations se rattachant directement ou indirectement à cet objet.`),
  clause('Article 4 – Siège social', `Le siège est fixé à ${data.siege}.`),
  clause('Article 5 – Durée', `La durée de la société est fixée à ${data.duree || '99 ans'} à compter de son immatriculation.`),
  clause('Article 6 – Apports', `Les associés effectuent les apports décrits aux présentes, évalués conformément aux règles légales.`),
  clause('Article 7 – Capital social', `Le capital social est fixé à ${data.capital} euros, réparti entre les associés selon le tableau de répartition annexé.`),
  clause('Article 8 – Modification du capital', `Le capital peut être augmenté ou réduit par décision collective extraordinaire.`),
  clause('Article 9 – Forme des actions', `Les actions sont nominatives et inscrites en compte.`),
  clause('Article 10 – Libération des actions', `Les actions souscrites sont libérées dans les conditions prévues par la loi.`),
  clause('Article 11 – Droits et obligations', `Chaque action donne droit aux bénéfices et à l’actif net proportionnellement à la quotité de capital qu’elle représente.`),
  clause('Article 12 – Transmission des actions', `Les cessions entre associés sont libres, sous réserve des stipulations contraires des présents statuts.`),
  clause('Article 13 – Agrément', `Les cessions au profit de tiers sont soumises à agrément préalable des associés.`),
  clause('Article 14 – Président', `${data.president} est nommé président de la société.`),
  clause('Article 15 – Pouvoirs du président', `Le président assure la direction de la société et la représente à l’égard des tiers dans la limite de l’objet social.`),
  clause('Article 16 – Directeur général', `La collectivité des associés peut nommer un ou plusieurs directeurs généraux et définir leurs pouvoirs.`),
  clause('Article 17 – Décisions collectives', `Les décisions collectives sont prises selon les règles de majorité et de quorum prévues par les présents statuts.`),
  clause('Article 18 – Modalités de consultation', `Les associés peuvent être consultés en assemblée, par consultation écrite ou par acte unanime.`),
  clause('Article 19 – Conventions réglementées', `Les conventions visées par la loi sont soumises à l’approbation des associés dans les conditions légales.`),
  clause('Article 20 – Exercice social', `L’exercice social commence le ${data.exerciceDebut || '1er janvier'} et se termine le ${data.exerciceFin || '31 décembre'}.`),
  clause('Article 21 – Comptes annuels', `Les comptes annuels sont établis, arrêtés et approuvés conformément aux dispositions légales.`),
  clause('Article 22 – Affectation du résultat', `Le résultat est affecté conformément aux décisions des associés après dotation des réserves légales.`),
  clause('Article 23 – Capitaux propres', `En cas de capitaux propres inférieurs à la moitié du capital, il est procédé selon les prescriptions légales.`),
  clause('Article 24 – Transformation', `La transformation de la société est décidée selon les conditions de majorité renforcée prévues par la loi et les présents statuts.`),
  clause('Article 25 – Dissolution', `La dissolution anticipée peut être décidée par les associés réunis extraordinairement.`),
  clause('Article 26 – Liquidation', `La liquidation est conduite selon les décisions des associés et les dispositions légales en vigueur.`),
  clause('Article 27 – Contestations', `Toute contestation relative aux affaires sociales relève des juridictions compétentes du ressort du siège social.`),
  clause('Article 28 – Nomination du premier président', `${data.president} est nommé premier président.`),
  clause('Article 29 – Reprise des actes', `La société reprend les actes accomplis pour son compte en formation conformément à l’état annexé.`),
  clause('Article 30 – Pouvoirs pour formalités', `Tous pouvoirs sont conférés au porteur d’un original ou d’une copie des présentes pour l’accomplissement des formalités légales.`),
]);

export {
  buildSasStatutesSections,
};
