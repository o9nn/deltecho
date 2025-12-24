import { getLogger } from './logger.js';
import { TranslationKey } from './translationKeyType.js';
const log = getLogger('localize');

export interface LocaleData {
  locale: string;
  messages: {
    [key: string]: {
      [P in Intl.LDMLPluralRule]?: string;
    } & {
      message?: string;
    };
  };
}

// 'other' should exists for all languages (source?)
// https://www.unicode.org/cldr/charts/43/supplemental/language_plural_rules.html
type getMessageOptions = { quantity?: 'other' | number };

export type getMessageFunction = (
  key: TranslationKey,
  substitutions?: string | string[],
  raw_opts?: 'other' | getMessageOptions
) => string;

export function translate(locale: string, messages: LocaleData['messages']): getMessageFunction {
  const localeBCP47 = locale.replace('_', '-');
  let pluralRules: Intl.PluralRules;
  try {
    pluralRules = new Intl.PluralRules(localeBCP47);
  } catch (err) {
    // Ideally we'd want a build-time check for this.
    // But let's not crash for this silly reason and apply the rules that apply
    // for many languages (see https://www.unicode.org/cldr/charts/43/supplemental/language_plural_rules.html#Cardinal-Integer)
    // Although keep in mind that English only has 'one' and 'other'
    // plural categorues, but some languages, such as Korean,
    // do not have 'one': only 'other'.
    // Before you ask, yes, _all_ languages have 'other' (source?)
    log.errorWithoutStackTrace(err);

    pluralRules = new Intl.PluralRules('en');
  }

  function getMessage(
    key: TranslationKey,
    substitutions?: string | string[],
    raw_opts?: 'other' | getMessageOptions
  ) {
    const translationKey = key as string;
    let opts: getMessageOptions = {};
    if (typeof raw_opts === 'string') opts = { quantity: raw_opts };
    else opts = Object.assign({}, raw_opts);

    const entry = messages[translationKey];

    if (!entry) {
      log.error(`Missing translation for key '${translationKey}'`);
      return translationKey;
    }

    let message: string | undefined = entry.message;
    if (typeof opts.quantity !== 'undefined') {
      if (typeof opts.quantity === 'string') {
        message = entry[opts.quantity];
      } else if (typeof opts.quantity === 'number') {
        // First try exact numeric match
        message = entry[opts.quantity as unknown as keyof LocaleData['messages'][0]];

        if (!message) {
          // Use locale-specific plural rules
          const pluralCategory = pluralRules.select(opts.quantity);
          message = entry[pluralCategory];

          // If the locale's plural category doesn't exist, the string may be
          // untranslated (falling back to English). In that case, apply English
          // plural rules: 'one' for 1, 'other' for everything else.
          if (!message && pluralCategory !== 'one' && pluralCategory !== 'other') {
            // Try English plural rules as fallback for untranslated strings
            const englishPluralRules = new Intl.PluralRules('en');
            const englishCategory = englishPluralRules.select(opts.quantity);
            message = entry[englishCategory];
          }

          // Final fallback to 'other' which should always exist
          if (!message) {
            message = entry['other'];
          }
        }
      } else {
        message = undefined;
      }
      if (typeof message === 'undefined') {
        log.error(`Missing quantity '${opts.quantity}' for key '${translationKey}'`);
        return `${translationKey}:${opts.quantity}`;
      }
    }

    if (typeof message === 'undefined') {
      log.error(
        `Missing 'message' for key '${translationKey}', maybe you need to specify quantity`
      );
      return `${translationKey}:?`;
    }

    if (substitutions) {
      if (!Array.isArray(substitutions)) {
        substitutions = [substitutions];
      }

      let counter = -1;
      return message.replace(/(?:%\d\$[\w\d])|(?:%[\w\d])/g, (f) => {
        counter++;
        if (f.length > 2) {
          const index = Number.parseInt(f[1]) - 1;
          if (substitutions === undefined || typeof substitutions[index] === 'undefined') {
            log.error(`Missing ${index} argument for key %c'${translationKey}'`);
            return '';
          }
          return substitutions[index].toString();
        }
        // TODO find out if there is a case with multiple substitutionsand quantity
        if (substitutions === undefined || typeof substitutions?.[counter] === 'undefined') {
          log.error(`Missing ${0} argument for key %c'${translationKey}'`);
          return '';
        }
        return substitutions[counter].toString();
      });
    }

    return message;
  }

  return getMessage;
}
