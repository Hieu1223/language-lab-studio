import "i18next";

/**
 * i18next type options for this app.
 *
 * We deliberately do NOT declare a `resources` shape here. Declaring one makes
 * i18next infer a strict literal key union, which in turn forces fully-qualified
 * `"namespace:key"` strings at every call site and breaks the ergonomic
 * `useTranslation('manga')` + `t('reader.loading')` pattern used throughout the
 * codebase. Without it, `t()` accepts plain string keys.
 *
 * Key correctness is enforced at test time instead: `src/test/i18n.test.ts`
 * verifies that every namespace file exists, that `en` and `vi` have identical
 * key sets, that no translation is empty, and that interpolation placeholders
 * match across locales.
 */
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    returnNull: false;
  }
}
