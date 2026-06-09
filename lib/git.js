// Git operations via simple-git
const simpleGit = require('simple-git');

function isNotGitRepo(err) {
  return err && err.message && err.message.includes('not a git repository');
}

async function getCommits(fromTag, toTag = 'HEAD', dir = process.cwd()) {
  try {
    const git = simpleGit(dir);
    const log = await git.log({ from: fromTag, to: toTag });
    return log.all.map(c => ({
      hash: c.hash,
      message: c.message,
      date: c.date,
      author: c.author_name
    }));
  } catch (err) {
    if (isNotGitRepo(err)) {
      throw new Error('This directory is not a Git repository. Run `git init` first, or cd to a project directory.');
    }
    throw err;
  }
}

async function getTags(dir = process.cwd()) {
  try {
    const git = simpleGit(dir);
    const tags = await git.tags();
    return tags.all.reverse(); // newest first
  } catch (err) {
    if (isNotGitRepo(err)) {
      throw new Error('This directory is not a Git repository. Run `git init` first, or cd to a project directory.');
    }
    throw err;
  }
}

async function getLatestTag(dir = process.cwd()) {
  const tags = await getTags(dir);
  return tags[0] || null;
}

async function getFirstCommit(dir = process.cwd()) {
  try {
    const git = simpleGit(dir);
    const log = await git.log();
    if (log.all.length === 0) return null;
    return log.all[log.all.length - 1].hash; // oldest commit first in log
  } catch (err) {
    if (isNotGitRepo(err)) {
      throw new Error('This directory is not a Git repository. Run `git init` first, or cd to a project directory.');
    }
    throw err;
  }
}

async function getDiff(fromTag, toTag = 'HEAD', dir = process.cwd()) {
  try {
    const git = simpleGit(dir);
    return await git.diff([`${fromTag}..${toTag}`, '--', '.']);
  } catch (err) {
    if (isNotGitRepo(err)) {
      throw new Error('This directory is not a Git repository. Run `git init` first, or cd to a project directory.');
    }
    throw err;
  }
}

module.exports = { getCommits, getTags, getLatestTag, getFirstCommit, getDiff };
