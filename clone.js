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
  const repoNames = repos.map(repo => repo.full_name);
  console.log({repoNames});
  return repoNames;
};

const printAllRepoNames = async () => {
  const repos = await getRepos();
  console.log(JSON.stringify(repos));
};

const parseRepoName = fullName => {
  const [user, ...rest] = fullName.split('/');
  return {user, repo: rest.join('/')};
};

const cloneUrl = fullName => {
  return `git@github.com:${fullName}.git`;
};

const cloneRepo = async fullName => {
  const {user, repo} = parseRepoName(fullName);
  if (user === 'EpicGames') return
  const dir = `~/repositories/${user}`;
  $.exec(`mkdir -p ${dir}`);
  $.exec(`git clone --bare ${cloneUrl(fullName)} ${dir}/${repo}.git`);
};

const cloneAllRepos = async () => {
  const repos = await getRepos();
  for (const repo of repos) {
    await cloneRepo(repo);
  }
};

cloneAllRepos();

