import { formatFrEuros, formatFrInteger, parseFrenchAmount } from '../shared/numberFormat.js';
import { formatLiberationRateLabel, parseLiberationPercent } from './parseLiberationPercent.js';

const resolveAssociateLiberation = ({
  associate,
  subscribed,
  globalLiberationPercent,
}) => {
  const explicitReleased = parseFrenchAmount(associate.liberationAmount)
    || parseFrenchAmount(associate.releasedAmount);
  const associatePercentRaw = associate.liberationPercent ?? associate.liberationRate;
  const associatePercent = parseLiberationPercent(associatePercentRaw);

  if (explicitReleased > 0 && subscribed > 0 && explicitReleased > subscribed + 0.01) {
    if (associatePercent != null) {
      return {
        released: Math.round(subscribed * associatePercent / 100),
        liberationPercent: associatePercent,
        source: 'percent',
      };
    }
    return {
      released: Math.round(subscribed * globalLiberationPercent / 100),
      liberationPercent: globalLiberationPercent,
      source: 'global',
    };
  }

  if (explicitReleased > 0) {
    const percent = subscribed > 0
      ? Math.round((explicitReleased / subscribed) * 1000) / 10
      : 0;
    if (associatePercent != null && subscribed > 0) {
      const expectedFromPercent = Math.round(subscribed * associatePercent / 100);
      if (Math.abs(expectedFromPercent - explicitReleased) > 0.01) {
        return {
          error: `Libération incohérente pour ${associate.label || associate.fullName} : ${formatFrEuros(explicitReleased)} libérés à ${associatePercent} % du numéraire souscrit (${formatFrEuros(subscribed)} → attendu ${formatFrEuros(expectedFromPercent)}). Vérifiez la libération du capital dans le questionnaire.`,
        };
      }
    }
    return {
      released: explicitReleased,
      liberationPercent: associatePercent ?? percent,
      source: 'amount',
    };
  }

  if (associatePercent != null) {
    return {
      released: Math.round(subscribed * associatePercent / 100),
      liberationPercent: associatePercent,
      source: 'percent',
    };
  }

  return {
    released: Math.round(subscribed * globalLiberationPercent / 100),
    liberationPercent: globalLiberationPercent,
    source: 'global',
  };
};

const detectLiberationMode = (associatesComputed, globalLiberationPercent) => {
  const sources = associatesComputed.map((a) => a.liberationSource);
  if (sources.some((source) => source === 'amount')) return 'PER_ASSOCIATE_AMOUNT';
  if (sources.some((source) => source === 'percent')) return 'PER_ASSOCIATE_PERCENT';

  const percents = [...new Set(associatesComputed.map((a) => a.liberationPercent))];
  if (percents.length > 1) return 'PER_ASSOCIATE_PERCENT';

  return 'GLOBAL_PERCENT';
};

/**
 * Source unique des calculs capital / apports pour statuts SAS(SU).
 * Tous les articles et annexes doivent consommer ces valeurs dérivées.
 */
export const deriveStatutsCapitalModel = ({
  capitalAmount = 0,
  shareCount = 0,
  nominalValue = null,
  liberationPercent = 50,
  associates = [],
} = {}) => {
  const capitalTotal = parseFrenchAmount(capitalAmount);
  const sharesTotal = parseFrenchAmount(shareCount) || capitalTotal;
  const nominal = nominalValue != null && parseFrenchAmount(nominalValue) > 0
    ? parseFrenchAmount(nominalValue)
    : (sharesTotal > 0 ? Math.round((capitalTotal / sharesTotal) * 100) / 100 : 1);
  const globalLiberationPercent = parseLiberationPercent(liberationPercent) ?? 50;

  const associatesComputed = [];
  for (const associate of associates || []) {
    let shares = parseFrenchAmount(associate.titlesCount) || parseFrenchAmount(associate.shares);
    if (!shares) {
      const pct = parseFrenchAmount(String(associate.share || '').replace('%', ''));
      if (pct > 0 && sharesTotal > 0) shares = Math.round((sharesTotal * pct) / 100);
    }
    const subscribed = shares > 0 ? Math.round(shares * nominal) : 0;
    const liberation = resolveAssociateLiberation({
      associate,
      subscribed,
      globalLiberationPercent,
    });

    if (liberation.error) {
      const error = new Error(liberation.error);
      error.code = 'STATUTES_CAPITAL_INCONSISTENT';
      throw error;
    }

    const percent = sharesTotal > 0 && shares > 0
      ? Math.round((shares / sharesTotal) * 1000) / 10
      : parseFrenchAmount(String(associate.share || '').replace('%', ''));

    associatesComputed.push({
      ...associate,
      shares,
      sharePercentage: percent,
      subscribedAmount: subscribed,
      releasedAmount: liberation.released,
      remainingAmount: Math.max(0, subscribed - liberation.released),
      liberationPercent: liberation.liberationPercent,
      liberationRateLabel: formatLiberationRateLabel(liberation.liberationPercent),
      liberationSource: liberation.source,
      subscribedFormatted: formatFrEuros(subscribed),
      releasedFormatted: formatFrEuros(liberation.released),
      contributionCash: associate.contributionCash || formatFrInteger(subscribed),
      liberationAmount: associate.liberationAmount || formatFrInteger(liberation.released),
    });
  }

  const liberationMode = detectLiberationMode(associatesComputed, globalLiberationPercent);
  const allFullyReleased = associatesComputed.length > 0
    && associatesComputed.every((a) => a.subscribedAmount <= 0 || a.releasedAmount >= a.subscribedAmount);
  const hasPartialRelease = associatesComputed.some(
    (a) => a.subscribedAmount > 0 && a.releasedAmount < a.subscribedAmount,
  );
  const liberationPercents = [...new Set(
    associatesComputed
      .filter((a) => a.subscribedAmount > 0)
      .map((a) => a.liberationPercent),
  )];
  const isDifferentiated = liberationPercents.length > 1;

  let liberationArticle74Variant = 'partial';
  if (allFullyReleased) liberationArticle74Variant = 'full';
  else if (isDifferentiated || liberationMode.startsWith('PER_ASSOCIATE')) liberationArticle74Variant = 'differentiated';

  const totalSubscribed = associatesComputed.reduce((sum, a) => sum + a.subscribedAmount, 0);
  const totalReleased = associatesComputed.reduce((sum, a) => sum + a.releasedAmount, 0);
  const totalSharesAssigned = associatesComputed.reduce((sum, a) => sum + (a.shares || 0), 0);

  return {
    capitalTotal,
    shareCount: sharesTotal,
    nominalValue: nominal,
    nominalValueFormatted: formatFrInteger(nominal),
    capitalFormatted: formatFrEuros(capitalTotal),
    liberationPercent: globalLiberationPercent,
    liberationRateLabel: formatLiberationRateLabel(globalLiberationPercent),
    liberationMode,
    liberationArticle74Variant,
    allFullyReleased,
    hasPartialRelease,
    isDifferentiated,
    totalSubscribed,
    totalReleased,
    totalRemaining: Math.max(0, totalSubscribed - totalReleased),
    depositedFundsFormatted: formatFrEuros(totalReleased),
    totalSharesAssigned,
    associatesComputed,
  };
};

export const validateStatutsCapitalModel = (model) => {
  const errors = [];
  if (!model) return { ok: false, errors: ['Modèle capital absent.'] };

  const expectedCapital = model.shareCount * model.nominalValue;
  if (model.capitalTotal > 0 && Math.abs(expectedCapital - model.capitalTotal) > 0.01) {
    errors.push(`Capital incohérent : ${model.capitalTotal} € ≠ ${model.shareCount} × ${model.nominalValue} €.`);
  }

  if (model.shareCount > 0 && model.totalSharesAssigned !== model.shareCount) {
    errors.push(`Répartition actions incohérente : ${model.totalSharesAssigned} ≠ ${model.shareCount}.`);
  }

  if (model.capitalTotal > 0 && Math.abs(model.totalSubscribed - model.capitalTotal) > 0.01) {
    errors.push(`Montants souscrits incohérents : ${model.totalSubscribed} € ≠ capital ${model.capitalTotal} €.`);
  }

  model.associatesComputed.forEach((associate) => {
    if (associate.releasedAmount > associate.subscribedAmount + 0.01) {
      errors.push(`Libération excessive pour ${associate.label || associate.fullName} : ${associate.releasedAmount} € > ${associate.subscribedAmount} € souscrits.`);
    }

    if (associate.subscribedAmount > 0) {
      const expectedFromRate = Math.round(associate.subscribedAmount * associate.liberationPercent / 100);
      if (Math.abs(associate.releasedAmount - expectedFromRate) > 0.01) {
        errors.push(`Libération incohérente pour ${associate.label || associate.fullName} : ${formatFrEuros(associate.releasedAmount)} libérés à ${associate.liberationPercent} % du numéraire souscrit (${formatFrEuros(associate.subscribedAmount)} → attendu ${formatFrEuros(expectedFromRate)}).`);
      }
    }

    if (model.liberationMode === 'GLOBAL_PERCENT' && associate.liberationSource === 'global') {
      const expectedReleased = Math.round(associate.subscribedAmount * model.liberationPercent / 100);
      if (associate.subscribedAmount > 0 && Math.abs(associate.releasedAmount - expectedReleased) > 0.01) {
        errors.push(`Libération incohérente pour ${associate.label || associate.fullName} : ${associate.releasedAmount} € attendu ${expectedReleased} € à ${model.liberationPercent} %.`);
      }
    }
  });

  if (Math.abs(model.totalReleased - model.associatesComputed.reduce((s, a) => s + a.releasedAmount, 0)) > 0.01) {
    errors.push('Total libéré incohérent.');
  }

  return { ok: errors.length === 0, errors };
};

export const validateGeneratedStatutsText = (text = '', model) => {
  const errors = [];
  const normalized = String(text);

  if (model?.shareCount && model?.nominalValue && model.nominalValue !== 1) {
    const flat = normalized.replace(/\u00A0/g, ' ');
    if (flat.includes(`${formatFrInteger(model.shareCount)} actions de 1 euro`)) {
      errors.push('Article 5 : valeur nominale incorrecte (1 € hardcodé).');
    }
    if (!flat.includes(`${formatFrInteger(model.nominalValue)} euro`)) {
      errors.push('Article 5 : valeur nominale calculée absente du texte généré.');
    }
  }

  if (/actes préparatoires à compléter/i.test(normalized)) {
    errors.push('Annexe actes : placeholder « à compléter » interdit.');
  }

  model?.associatesComputed?.forEach((associate) => {
    if (associate.subscribedAmount <= 0) return;
    const badPattern = new RegExp(
      `Apport en numéraire de [^,]+, libéré à hauteur de ${associate.liberationPercent} %, soit (?!${associate.releasedFormatted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'i',
    );
    if (badPattern.test(normalized)) {
      errors.push(`Article 7 : montant libéré incohérent avec le taux pour ${associate.label || associate.fullName}.`);
    }
  });

  return { ok: errors.length === 0, errors };
};
