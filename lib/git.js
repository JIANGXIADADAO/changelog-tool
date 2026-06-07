// Git operations via simple-git
const simpleGit = require('simple-git');

async function getCommits(fromTag, toTag = 'HEAD', dir = process.cwd()) {
  const git = simpleGit(dir);
  const range = fromTag ? `${fromTag}..${toTag}` : toTag;

  const log = await git.log({ from: fromTag, to: toTag });
  return log.all.map(c => ({
    hash: c.hash,
    message: c.message,
    date: c.date,
    author: c.author_name
  }));
}

async function getTags(dir = process.cwd()) {
  const git = simpleGit(dir);
  const tags = await git.tags();
  return tags.all.reverse(); // newest first
}

async function getLatestTag(dir = process.cwd()) {
  const tags = await getTags(dir);
  return tags[0] || null;
}

async function getFirstCommit(dir = process.cwd()) {
  const git = simpleGit(dir);
  const log = await git.log();
  if (log.all.length === 0) return null;
  return log.all[log.all.length - 1].hash; // oldest commit first in log
}

async function getDiff(fromTag, toTag = 'HEAD', dir = process.cwd()) {
  const git = simpleGit(dir);
  return await git.diff([`${fromTag}..${toTag}`, '--', '.']);
}

module.exports = { getCommits, getTags, getLatestTag, getFirstCommit, getDiff };
