const $ = require('shelljs');
const octokit = require('@octokit/rest')();

const GITHUB_TOKEN = '0000000000000000000000000000000000000000';

octokit.authenticate({
  type: 'token',
  token: GITHUB_TOKEN,
});

async function paginate(method, opts = {}) {
  let response = await method({per_page: 100, ...opts});
  let {data} = response;
  while (octokit.hasNextPage(response)) {
    response = await octokit.getNextPage(response);
    data = data.concat(response.data);
  }
  return data;
}

const getRepos = async () => {
  const repos = await paginate(octokit.repos.getAll, {});
  const publicRepos = []
  const privateRepos = []
  repos.forEach(repo => {
    if (repo.private) {
      privateRepos.push(repo.full_name)
    } else {
      publicRepos.push(repo.full_name)
    }
  })
  return {publicRepos, privateRepos};
};

const parseRepoName = fullName => {
  const [user, ...rest] = fullName.split('/');
  return {user, repo: rest.join('/')};
};

const cloneUrl = fullName => {
  return `git@github.com:${fullName}.git`;
};

const cloneRepo = async (prefix, fullName) => {
  const {user, repo} = parseRepoName(fullName);
  if (user === 'EpicGames') return
  const dir = `~/repositories/${user}${prefix}`;
  $.exec(`mkdir -p ${dir}`);
  $.exec(`git clone --bare ${cloneUrl(fullName)} ${dir}/${repo}.git`);
};

const cloneAllRepos = async () => {
  const {publicRepos, privateRepos} = await getRepos();
  for (const repo of privateRepos) {
    await cloneRepo('/private', repo);
  }
  for (const repo of publicRepos) {
    await cloneRepo('', repo);
  }
};

cloneAllRepos();

