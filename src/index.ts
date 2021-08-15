'use strict';
import * as cheerio from 'cheerio';
import * as queryString from 'query-string';
import * as axios from 'axios';
import * as R from 'ramda';
import * as tough from 'tough-cookie';
const axiosCookieJarSupport = require('axios-cookiejar-support').default;

const kkPageUrlStart = 'https://www.kilometrikisa.fi';
const loginPageUrl = kkPageUrlStart + '/accounts/login/';
const myTeamsUrl = kkPageUrlStart + '/accounts/myteams/';
const profilePageUrl = kkPageUrlStart + '/accounts/profile/';
const jsonDataUrlStart = (contestId: string) => `${kkPageUrlStart}/contest/log_list_json/${contestId}/`;
const updateLogPageUrl = kkPageUrlStart + '/contest/log-save/';

const axiosRequestWithAuth = { withCredentials: true };

export interface User {
  nickname: string,
  firstname: string,
  lastname: string,
  email: string,
  municipality: string,
}

export interface Contest {
  name: string,
  link: string,
}

export interface SingleResult {
  date: string,
  km: number;
}

const getHeaders = (tokens: string[]) => ({
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Cookie': tokens.join(';'),
  'Content-Type': 'application/x-www-form-urlencoded',
  'Referer': loginPageUrl,
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
});

const axiosClient = axios.default;
axiosCookieJarSupport(axios);
(axiosClient.defaults as any).jar = new tough.CookieJar();

const toColumns = (c: cheerio.CheerioAPI, elem: cheerio.Element) => c(elem).children().map((i, elem) => c(elem).text());

/** First part of the login process. Fetch the csrftoken needed for Login */
export const getKkLoginToken = async (): Promise<string> => {
  const response = await axiosClient.get(loginPageUrl);
  const loginFormTokenStart = 'value="';
  const loginFormTokenEnd = '">';
  const $ = cheerio.load(response.data);
  const loginForm = $('form').html();
  const csrftoken = loginForm.substring(
    loginForm.indexOf(loginFormTokenStart) + loginFormTokenStart.length,
    loginForm.indexOf(loginFormTokenEnd));
  return csrftoken;
};

/* Second part of the login process where the credentials are sent with the csrfToken. */
const doKkLogin = async (username: string, password: string, csrftoken: string) => {
  const body = queryString.stringify({
    username: username,
    password: password,
    csrfmiddlewaretoken: csrftoken,
    next: '',
  });

  const loginErrorReply = 'Antamasi tunnus tai salasana oli väärä';

  const response = await axiosClient.post(loginPageUrl, body, R.merge(
    { headers: getHeaders(['csrftoken=' + csrftoken]) },
    axiosRequestWithAuth));

  return new Promise((res, rej) => {
    const success = response.data.indexOf(loginErrorReply) === -1;
    if (success) {
      res(success);
    } else {
      rej('Request failed: ' + response.headers);
    }
  });
};

/** Update information in the user log.
 * @param {string} contestId The contest id.
 * @param {string} kmDate The date in format YYYY-mm-dd
 * @param {number} kmAmount The kilometers to log for that day. */
export const updateLog = async (contestId: string, kmDate: string, kmAmount: number): Promise<any> => {
  const csrftoken = await getKkLoginToken();
  const body = queryString.stringify({
    contest_id: contestId,
    km_date: kmDate,
    km_amount: kmAmount,
    csrfmiddlewaretoken: csrftoken,
  });

  try {
    const response = await axiosClient.post(updateLogPageUrl, body, R.merge(
      { headers: getHeaders(['csrftoken=' + csrftoken]) },
      axiosRequestWithAuth));

    return new Promise((res, rej) => {
      if (response.data.status === 200) {
        res(response.data.status);
      } else {
        rej('Request failed: ' + response);
      }
    });
  } catch (e) {
    console.log(e);
  }
};

export const fetchProfilePage = async (): Promise<User> => {
  const response = await axiosClient.get(profilePageUrl, axiosRequestWithAuth);
  const $ = cheerio.load(response.data);
  const requireSignIn = $('#signup').length;
  if (requireSignIn !== 0) {
    throw new Error('Login failed');
  }

  const firstname = $('[name=first_name]').val();
  const lastname = $('[name=last_name]').val();
  const email = $('[name=email]').val();
  const nickname = $('[name=nickname]').val();
  // const municipality_code = $('option[selected=selected]').html(); // TODO not working yet
  console.log('Found details ' + nickname);
  return {
    nickname: nickname as string,
    firstname: firstname as string,
    lastname: lastname as string,
    email: email as string,
    municipality: '',
  };
};

/** Login to Kilometrikisa site and returns basic user information.
 * @param {string} username The username to log in with.
 * @param {string} password The password to log in with.
 * @return {Promise} Promise of the user profile info. */
export const login = async (username: string, password: string) =>
  doKkLogin(username, password, await getKkLoginToken())
    .then(fetchProfilePage);

const getDataUrl = (contestId: string, year: number) => jsonDataUrlStart(contestId) + '?' +
  queryString.stringify({
    start: (new Date(year, 1, 1).getTime() / 1000),
    end: (new Date(year, 12, 30).getTime() / 1000)
  });

const mapUserResults = (results: any): SingleResult[] =>
  results.map((entry: any) => ({ date: entry.start, km: parseFloat(entry.title) }));

/** Fetch yearly user results for the specific year or for the current year. */
export const getUserResults = async (contestId: string, year: number) => {
  const url = getDataUrl(contestId, year);
  console.log(url);
  return mapUserResults(
    (await axiosClient.get(url, axiosRequestWithAuth)).data);
}

/** Fetch the contests the logged in user has participated in.
 * @return {object} List of objects containing fields teamName, contest and time. */
export const getContests = async (): Promise<any> => {
  const response = await axiosClient.get(myTeamsUrl, axiosRequestWithAuth);
  const $ = cheerio.load(response.data, { normalizeWhitespace: false });
  const contestRows = $('#teams').find('tbody').children();
  const rows = contestRows
    .map((i, elem) => {
      const columns = toColumns($, elem);
      const link = $(elem).children().find('a').first().attr('href');
      console.log('teamname' + columns[0].trim());
      return {
        teamName: columns[0].trim(),
        contest: columns[1],
        time: columns[2],
        link: link,
      };
    }
    );
  const results = rows.toArray()
    .map(async (row) => {
      const contestNameStart = row.link.lastIndexOf('/', row.link.length - 2);
      const year = row.contest.substr(row.contest.length - 4);
      const contestId = await getContestId('/contests' + row.link.substr(contestNameStart) + 'teams/');
      return Object.assign(row, {
        year: year,
        contestId: contestId,
      });
    });
  return await Promise.all(results);
};

const onlyNumbers = (str: string) => str.replace(/[^\d.,-]/g, '').replace(',', '.');
const trimPersonName = (name: string) => name.trim().split('\n')[0].trim();

/* Fetch own team results for the specified contest returned by getContests. Currently Kilometrikisa does not let access other team's data. */
export const fetchTeamResults = async (contest: string) => {
  const teamUrl = contest.link;
  const response = await axiosClient.get(kkPageUrlStart + teamUrl, axiosRequestWithAuth);
  const $ = cheerio.load(response.data, { normalizeWhitespace: false });

  const teamName = $('.widget').find('h4').first().text().trim();
  const teamRank = parseInt(onlyNumbers($('.team-contest-table').find('strong').html()));

  const teamRows = $('div[data-slug="my-team"]').find('tbody').children();
  const results = teamRows
    .map((i, elem) => {
      // Team admin has a user email column visible
      $('.memberEmail', elem).parent().remove();
      const columns = toColumns($, elem);
      return {
        rank: parseInt(columns[0]),
        name: trimPersonName(columns[1]),
        km: parseFloat(onlyNumbers(columns[2])),
        days: parseInt(onlyNumbers(columns[3])),
      };
    });
  return {
    name: teamName,
    rank: teamRank,
    results: results.get(),
  };
};

/* Get single page of general team statistics for given contest. */
export const getTeamInfoPage = async (page: string, n = 0) => {
  const cleanTeamName = (name: string) => {
    name = name.replace(' TOP-10', '');
    name = name.substring(0, name.lastIndexOf('('));
    return name.trim();
  };
  const pageUrl = page + '&page=' + (n + 1);
  const response = await axiosClient.get(pageUrl);
  const $ = cheerio.load(response.data, { normalizeWhitespace: true });

  const resultTable = $('.result-table').find('tbody');
  const rows = resultTable.children();
  const infos = rows.map((i, elem) => {
    // Logged in user has favorite column first
    $('td > .favorite-form', elem).parent().remove();
    const columns = toColumns($, elem);
    return {
      rank: parseInt(columns[0].trim()),
      name: cleanTeamName(columns[1]),
      kmpp: parseFloat(onlyNumbers(columns[2])),
      kmTotal: parseFloat(onlyNumbers(columns[3])),
      days: parseFloat(onlyNumbers(columns[4])),
    };
  });

  return infos.get();
};

/* Get n first pages of team statistics */
export const getTeamInfoPages = (page: string, n: number) =>
  Promise.all(
    [...Array(n).keys()]
      .map((n) => getTeamInfoPage(page, n))
      .map((p) => p.catch((e) => []))
  )
    .then(R.flatten);

/** Lists all contests that are available on the site. */
export const getAllContests = async (): Promise<Contest[]> => {
  const response = await axiosClient.get(kkPageUrlStart);
  const $ = cheerio.load(response.data, { normalizeWhitespace: true });
  const contestsMenu = $('.top-bar-section')
    .find('ul')
    .children()
    .find('ul')
    .last();
  const contests = contestsMenu.children().map((i, elem) => {
    const link = $(elem).children().first();
    return {
      name: link.text(),
      link: link.attr('href'),
    } as Contest;
  }).toArray();
  return contests;
};

/** Get the latest available contest from the site. */
export const getLatestContest = async () =>
  (await getAllContests())[0];

/** Get the internal contest id for the specified contest url (returned by getAllContests).
 * @param {string} contestUrl The contest for which to retrieve internal id */
export const getContestId = async (contestUrl: string): Promise<any> => {
  const response = await axiosClient.get(kkPageUrlStart + contestUrl);
  const $ = cheerio.load(response.data);
  const body = $('body script').contents().first().text();
  const match = body.match(/json-search\/(\d+)\//);
  return match[1];
};

export const getLatestContestId = async () =>
  getContestId((await getLatestContest()).link);

export const allTeamsTopListPage = async () =>
  kkPageUrlStart + (await getLatestContest()).link + '?sort=rank&order=asc';

export const largeTeamsTopListPage = async () =>
  kkPageUrlStart + (await getLatestContest()).link + 'large/?sort=rank&order=asc';

export const powerTeamsTopListPage = async () =>
  kkPageUrlStart + (await getLatestContest()).link + 'power/?sort=rank&order=asc';

export const smallTeamsTopListPage = async () =>
  kkPageUrlStart + (await getLatestContest()).link + 'small/?sort=rank&order=asc';
