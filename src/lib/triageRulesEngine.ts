import { IntakeForm } from '../App';
import { RulesConfig, TriageColor } from '../types/clinic';

export const DEFAULT_DRAFT_RULES_CONFIG: RulesConfig = {
  version: 'v1.0-DRAFT',
  label: 'DRAFT — pending physician approval',
  approvedBy: null,
  approvedDate: null,
  updatedAt: new Date().toISOString(),
  safetyDefault: 'yellow',
  rules: [
    // RED RULES
    {
      id: 'rule-red-1',
      color: 'red',
      name: 'Bleeding Without Injury',
      description: 'Patient reports the spot bled or oozed on its own without a scratch or bump.',
      whyText: 'Bleeding without injury reported',
      predicateKey: 'bleeding_no_injury',
      enabled: true,
    },
    {
      id: 'rule-red-2',
      color: 'red',
      name: 'Sore Not Healing (More Than 3–4 Weeks)',
      description: 'Open sore or crusty spot that has not healed after 3 to 4 weeks.',
      whyText: 'Sore or spot not healing for more than 3–4 weeks',
      predicateKey: 'non_healing_3_4_wks',
      enabled: true,
    },
    {
      id: 'rule-red-3',
      color: 'red',
      name: 'Spot Growing or Changing (Weeks to Months)',
      description: 'Spot getting larger or changing shape over weeks to a few months.',
      whyText: 'Spot growing or changing over weeks to a few months',
      predicateKey: 'growing_weeks_months',
      enabled: true,
    },
    {
      id: 'rule-red-4',
      color: 'red',
      name: 'New Dark or Multicolored Spot (Age Over 40)',
      description: 'New black, dark brown, or multi-colored spot in an adult aged 40 or older.',
      whyText: 'New dark or multicolored spot in an adult over 40',
      predicateKey: 'new_dark_multicolor_over_40',
      enabled: true,
    },
    {
      id: 'rule-red-5',
      color: 'red',
      name: 'Past Melanoma + New or Changing Spot',
      description: 'Patient had melanoma before and now reports a new or changing spot.',
      whyText: 'Personal history of melanoma and a new or changing spot',
      predicateKey: 'personal_melanoma_new_spot',
      enabled: true,
    },
    {
      id: 'rule-red-6',
      color: 'red',
      name: 'Rapidly Getting Worse',
      description: 'Patient reports the spot is getting worse quickly over days or weeks.',
      whyText: 'Patient reports the spot is rapidly getting worse',
      predicateKey: 'rapidly_worse',
      enabled: true,
    },

    // YELLOW RULES
    {
      id: 'rule-yel-1',
      color: 'yellow',
      name: 'New Spot',
      description: 'Patient noticed a brand-new spot with no red-flag symptoms.',
      whyText: 'New spot reported by patient',
      predicateKey: 'new_spot',
      enabled: true,
    },
    {
      id: 'rule-yel-2',
      color: 'yellow',
      name: 'Changed Spot (No Red-Flag Features)',
      description: 'Existing spot has changed without bleeding or rapid growth.',
      whyText: 'Changed spot without red-flag features',
      predicateKey: 'changed_spot_no_red_flags',
      enabled: true,
    },
    {
      id: 'rule-yel-3',
      color: 'yellow',
      name: 'Itching, Pain, or Tenderness',
      description: 'Spot feels itchy, sore, painful, or tender to touch.',
      whyText: 'Itching, pain, or tenderness reported',
      predicateKey: 'itching_pain_tenderness',
      enabled: true,
    },
    {
      id: 'rule-yel-4',
      color: 'yellow',
      name: 'Personal or Family History of Skin Cancer',
      description: 'Patient or a close family member has had skin cancer in the past.',
      whyText: 'Personal or family history of skin cancer',
      predicateKey: 'personal_or_family_cancer_hx',
      enabled: true,
    },
    {
      id: 'rule-yel-5',
      color: 'yellow',
      name: 'Weakened Immune System',
      description: 'Patient takes immune-suppressing medicine or had an organ transplant.',
      whyText: 'Immune suppression reported',
      predicateKey: 'immune_suppression',
      enabled: true,
    },
    {
      id: 'rule-yel-6',
      color: 'yellow',
      name: 'Missing Answer or "Not Sure"',
      description: 'Patient skipped a required question or answered "not sure".',
      whyText: 'Required answer missing or "not sure"',
      predicateKey: 'required_missing_or_not_sure',
      enabled: true,
    },
  ],
};

export interface TriageEvaluationResult {
  color: TriageColor;
  why: string[];
  rulesVersion: string;
  rulesLabel: string;
  evaluatedAt: string;
}

/**
 * Evaluates patient answers against transparent, configurable triage rules.
 * Does NOT use any AI inference.
 * Safety Default: Always returns YELLOW if rules conflict or required information is missing.
 */
export function evaluateTriageRules(
  answers: Partial<IntakeForm>,
  config: RulesConfig = DEFAULT_DRAFT_RULES_CONFIG
): TriageEvaluationResult {
  const triggeredRed: string[] = [];
  const triggeredYellow: string[] = [];

  const bleedingStr = (answers.bleeding || '').toLowerCase();
  const nonHealingStr = (answers.nonHealing || '').toLowerCase();
  const periodStr = (answers.changeTimePeriod || '').toLowerCase();
  const newOrChangedStr = (answers.newOrChanged || '').toLowerCase();
  const colorChangeStr = (answers.colorChange || '').toLowerCase();
  const sizeChangeStr = (answers.sizeChange || '').toLowerCase();
  const shapeChangeStr = (answers.shapeChange || '').toLowerCase();
  const ageRangeStr = (answers.ageRange || '').toLowerCase();
  const personalHxStr = (answers.personalCancerHistory || '').toLowerCase();
  const familyHxStr = (answers.familyCancerHistory || '').toLowerCase();
  const painStr = (answers.painOrSensation || '').toLowerCase();
  const immuneStr = (answers.immuneSuppressing || '').toLowerCase();
  const changedRecentlyStr = (answers.changedRecently || '').toLowerCase();

  // Helper check for "not sure" or missing in core fields
  const isMissingOrUnsure = (val?: string) => {
    if (!val || val.trim() === '' || val.toLowerCase().includes('not specified')) return true;
    const v = val.toLowerCase();
    return v.includes('not sure') || v.includes('unsure') || v.includes("don't know");
  };

  // 1. Evaluate Enabled RED Rules
  for (const rule of config.rules) {
    if (!rule.enabled || rule.color !== 'red') continue;

    switch (rule.predicateKey) {
      case 'bleeding_no_injury':
        if (bleedingStr.includes('without injury') || (bleedingStr.includes('yes') && !bleedingStr.includes('no'))) {
          triggeredRed.push(rule.whyText);
        }
        break;

      case 'non_healing_3_4_wks':
        if (nonHealingStr.includes('> 3-4') || nonHealingStr.includes('3-4 weeks') || (nonHealingStr.includes('yes') && !nonHealingStr.includes('no'))) {
          triggeredRed.push(rule.whyText);
        }
        break;

      case 'growing_weeks_months':
        if (
          (sizeChangeStr.includes('growing') || sizeChangeStr.includes('larger') || sizeChangeStr.includes('spread') || shapeChangeStr.includes('irregular')) &&
          (periodStr.includes('weeks') || periodStr.includes('months') || periodStr.includes('few months'))
        ) {
          triggeredRed.push(rule.whyText);
        }
        break;

      case 'new_dark_multicolor_over_40': {
        const isOver40 = ageRangeStr.includes('40') || ageRangeStr.includes('50') || ageRangeStr.includes('60') || ageRangeStr.includes('70') || ageRangeStr.includes('80');
        const isDarkOrMulticolor = colorChangeStr.includes('dark') || colorChangeStr.includes('black') || colorChangeStr.includes('multicolor') || colorChangeStr.includes('multiple colors');
        const isNewOrChanged = newOrChangedStr.includes('new') || newOrChangedStr.includes('changed');
        if (isOver40 && isDarkOrMulticolor && isNewOrChanged) {
          triggeredRed.push(rule.whyText);
        }
        break;
      }

      case 'personal_melanoma_new_spot': {
        const hasMelanomaHx = personalHxStr.includes('melanoma');
        const hasNewOrChangedSpot = newOrChangedStr.includes('new') || newOrChangedStr.includes('changed') || sizeChangeStr.includes('larger') || colorChangeStr.includes('changed');
        if (hasMelanomaHx && hasNewOrChangedSpot) {
          triggeredRed.push(rule.whyText);
        }
        break;
      }

      case 'rapidly_worse':
        if (
          changedRecentlyStr.includes('rapidly') ||
          periodStr.includes('rapidly') ||
          periodStr.includes('days') ||
          changedRecentlyStr.includes('worse')
        ) {
          triggeredRed.push(rule.whyText);
        }
        break;
    }
  }

  // 2. Evaluate Enabled YELLOW Rules
  for (const rule of config.rules) {
    if (!rule.enabled || rule.color !== 'yellow') continue;

    switch (rule.predicateKey) {
      case 'new_spot':
        if (newOrChangedStr.includes('new spot') || newOrChangedStr === 'new') {
          triggeredYellow.push(rule.whyText);
        }
        break;

      case 'changed_spot_no_red_flags':
        if (newOrChangedStr.includes('changed') && triggeredRed.length === 0) {
          triggeredYellow.push(rule.whyText);
        }
        break;

      case 'itching_pain_tenderness':
        if (painStr && painStr !== 'none' && !painStr.includes('none reported') && !painStr.includes('no symptoms')) {
          triggeredYellow.push(rule.whyText);
        }
        break;

      case 'personal_or_family_cancer_hx': {
        const hasPersonalNonMel = personalHxStr && !personalHxStr.includes('no personal history') && personalHxStr !== 'none';
        const hasFamily = familyHxStr && !familyHxStr.includes('no family history') && familyHxStr !== 'none';
        if (hasPersonalNonMel || hasFamily) {
          triggeredYellow.push(rule.whyText);
        }
        break;
      }

      case 'immune_suppression':
        if (immuneStr.includes('yes') && !immuneStr.includes('no')) {
          triggeredYellow.push(rule.whyText);
        }
        break;

      case 'required_missing_or_not_sure':
        if (
          isMissingOrUnsure(answers.bodyLocation) ||
          isMissingOrUnsure(answers.newOrChanged) ||
          isMissingOrUnsure(answers.bleeding) ||
          isMissingOrUnsure(answers.nonHealing) ||
          isMissingOrUnsure(answers.personalCancerHistory)
        ) {
          triggeredYellow.push(rule.whyText);
        }
        break;
    }
  }

  // 3. Determine Color with Safety Defaults
  let finalColor: TriageColor = 'green';
  let whyLines: string[] = [];

  if (triggeredRed.length > 0) {
    finalColor = 'red';
    whyLines = Array.from(new Set(triggeredRed));
  } else if (triggeredYellow.length > 0) {
    finalColor = 'yellow';
    whyLines = Array.from(new Set(triggeredYellow));
  } else {
    // Check if truly GREEN: No changes, no symptoms, no history, complete data
    const isClean =
      (newOrChangedStr.includes('unchanged') || newOrChangedStr.includes('existing') || newOrChangedStr === '') &&
      (bleedingStr === 'none' || bleedingStr.includes('no')) &&
      (nonHealingStr === 'none' || nonHealingStr.includes('no')) &&
      (!painStr || painStr === 'none' || painStr.includes('none')) &&
      (!personalHxStr || personalHxStr.includes('no personal') || personalHxStr === 'none') &&
      (!familyHxStr || familyHxStr.includes('no family') || familyHxStr === 'none') &&
      (!immuneStr || immuneStr.includes('no')) &&
      !isMissingOrUnsure(answers.bodyLocation) &&
      !isMissingOrUnsure(answers.newOrChanged);

    if (isClean) {
      finalColor = 'green';
      whyLines = ['No change, no symptoms, no personal or family history of skin cancer, and all required answers are complete'];
    } else {
      // Safety Default: Never assign green if uncertain or conflicting
      finalColor = 'yellow';
      whyLines = ['Safety default: staff review needed because answers are incomplete or unclear'];
    }
  }

  return {
    color: finalColor,
    why: whyLines,
    rulesVersion: config.version,
    rulesLabel: config.label,
    evaluatedAt: new Date().toISOString(),
  };
}
