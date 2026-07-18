import path from 'node:path';

/**
 * Each app owns its own ESLint/Prettier install (different plugin sets for
 * NestJS vs. React), so staged files are re-rooted relative to their app
 * folder and linted from inside it.
 */
function scopedCommands(appDir) {
  return (filenames) => {
    const relativeFiles = filenames.map((file) => path.relative(path.resolve(appDir), file));
    const quoted = relativeFiles.map((file) => JSON.stringify(file)).join(' ');

    return [
      `bash -c 'cd ${appDir} && npx --no-install eslint --fix --no-warn-ignored ${quoted}'`,
      `bash -c 'cd ${appDir} && npx --no-install prettier --write ${quoted}'`,
    ];
  };
}

export default {
  'backend/**/*.ts': scopedCommands('backend'),
  'frontend/**/*.{ts,tsx,css}': scopedCommands('frontend'),
};
