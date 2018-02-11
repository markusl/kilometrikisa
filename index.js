'use strict';
import * as cheerio from 'cheerio-without-node-native';
import queryString from 'query-string';
import * as axios from 'axios';
import * as R from 'ramda';
import axiosCookieJarSupport from '@3846masa/axios-cookiejar-support';

const contestId = 22; // TODO Make dynamic
const kkPageUrlStart = 'https://www.kilometrikisa.fi';
const accountPageUrl = kkPageUrlStart + '/accounts/index/';
const loginPageUrl = kkPageUrlStart + '/accounts/login/';
const myTeamsUrl = kkPageUrlStart + '/accounts/myteams/';
const profilePageUrl = kkPageUrlStart + '/accounts/profile/';
const jsonDataUrlStart = kkPageUrlStart + '/contest/log_list_json/' + contestId + '/';
const updateLogPageUrl = kkPageUrlStart + '/contest/log-save/';
const summerContestStartMonth = 4;
const summerContestEndMonth = 9;
const currentYear = new Date().getFullYear();
export const allTeamsTopListPage = kkPageUrlStart + '/contests/kilometrikisa-' + currentYear + '/teams/?sort=rank&order=asc';
export const smallTeamsTopListPage = kkPageUrlStart + '/contests/kilometrikisa-' + currentYear + '/teams/small/?sort=rank&order=asc';
export const largeTeamsTopListPage = kkPageUrlStart + '/contests/kilometrikisa-' + currentYear + '/teams/large/?sort=rank&order=asc';
export const powerTeamsTopListPage = kkPageUrlStart + '/contests/kilometrikisa-' + currentYear + '/teams/power/?sort=rank&order=asc';

axiosCookieJarSupport(axios);
let axiosRequestWithAuth = { withCredentials: true, jar: undefined };

/** Set the cookie jar to use with axios requests.
 * @param {object} jar The cookie jar to use.
 * @return {undefined} */
export const setAxiosCookieJar = (jar) => {
  axiosRequestWithAuth.jar = jar;
};

const toColumns = (c, elem) => c(elem).children().map((i, elem) => c(elem).text());

const getHeaders = (tokens) => ({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Cookie': tokens.join(';'),
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': loginPageUrl,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
  });

/** First part of the login process. Fetch the csrftoken needed for Login
  * @return {string} the csrftoken to do other requests with */
export const getKkLoginToken = () =>
  axios.get(loginPageUrl)
    .then((response) => response.data)
    .then((response) => {
        const loginFormTokenStart = 'value="';
        const loginFormTokenEnd = '">';
        const $ = cheerio.load(response);
        const loginForm = $('form').html();
        const csrftoken = loginForm.substring(
          loginForm.indexOf(loginFormTokenStart) + loginFormTokenStart.length,
          loginForm.indexOf(loginFormTokenEnd));
        return csrftoken;
      });

/* Second part of the login process where the credentials are sent with the csrfToken. */
const doKkLogin = (username, password, csrftoken) => {
  const body = queryString.stringify({
    username: username,
    password: password,
    csrfmiddlewaretoken: csrftoken,
    next: '',
  });

  const loginErrorReply = 'Antamasi tunnus tai salasana oli väärä';

  return axios.post(loginPageUrl, body, R.merge(
      { headers: getHeaders(['csrftoken=' + csrftoken]) },
      axiosRequestWithAuth))
    .then((response) => response.data)
    .then((response) => {
      return new Promise((res, rej) => {
        const success = response.indexOf(loginErrorReply) === -1;
        if (success) {
          res();
        } else {
          rej('Request failed: ' + response.headers);
        }
      });
    });
};

/** Update information in the user log.
 * @param {string} kmDate The date in format YYYY-mm-dd
 * @param {number} kmAmount The kilometers to log for that day.
 * @return {undefined} */
export const updateLog = (kmDate, kmAmount) =>
  getKkLoginToken()
    .then((csrftoken) => {
      const body = queryString.stringify({
        contest_id: contestId,
        km_date: kmDate,
        km_amount: kmAmount,
        csrfmiddlewaretoken: csrftoken,
      });

      return axios.post(updateLogPageUrl, body, R.merge(
          { headers: getHeaders(['csrftoken=' + csrftoken]) },
          axiosRequestWithAuth));
    })
  .then((response) => response.data)
  .then((response) =>
    new Promise((res, rej) => {
      if (response.status === 200) {
        res();
      } else {
        rej('Request failed: ' + response);
      }
    })
);

export const fetchProfilePage = () =>
  axios.get(profilePageUrl, axiosRequestWithAuth)
    .then((response) => response.data)
    .then((response) => {
      return new Promise((res, rej) => {
        const $ = cheerio.load(response);
        const requireSignIn = $('#signup').length;
        if (requireSignIn !== 0) {
          rej();
        } else {
          const firstname = $('[name=first_name]').val();
          const lastname = $('[name=last_name]').val();
          const email = $('[name=email]').val();
          const nickname = $('[name=nickname]').val();
          // const municipality_code = $('option[selected=selected]').html(); // TODO not working yet
          res({ nickname: nickname,
                firstname: firstname,
                lastname: lastname,
                email: email,
                municipality: '',
          });
        }
      });
    });

/** Login to Kilometrikisa site and returns basic user information.
 * @param {string} username The username to log in with.
 * @param {string} password The password to log in with.
 * @return {Promise} Promise of the user profile info. */
export const login = (username, password) =>
  getKkLoginToken()
    .then((token) => doKkLogin(username, password, token))
    .then(fetchProfilePage);

const getDataUrl = (year) => jsonDataUrlStart + '?' +
    queryString.stringify({ start: (new Date(year, summerContestStartMonth, 1).getTime()/1000),
                            end: (new Date(year, summerContestEndMonth, 30).getTime()/1000) });

const mapUserResults = (results) =>
  results.map((entry) => ({ date: entry.start, km: parseFloat(entry.title) } ));

/** Fetch yearly user results for the specific year or for the current year.
 * @param {number} year The year for which to fetch user results.
 * @return {object} Results for the user for the specific year. */
export const getUserResults = (year = currentYear) =>
  axios.get(getDataUrl(year), axiosRequestWithAuth)
    .then((response) => response.data)
    .then(mapUserResults);

/** Fetch the contests user has participated in.
 * @return {object} List of objects containing fields teamName, contest and time. */
export const getContests = () =>
  axios.get(myTeamsUrl, axiosRequestWithAuth)
    .then((response) => response.data)
    .then((response) => {
      const $ = cheerio.load(response, { normalizeWhitespace: false });
      const contestRows = $('#teams').find('tbody').children();
      const results = contestRows
        .map((i, elem) => {
          const columns = toColumns($, elem);
          return {
            teamName: columns[0].trim(),
            contest: columns[1],
            time: columns[2],
          };
        }
      );
      return results.toArray();
    });

/** Fetch url to own team page.
 * @return {Promise} */
export const fetchTeamUrl = () =>
  axios.get(accountPageUrl, axiosRequestWithAuth)
    .then((response) => response.data)
    .then((response) => {
      return new Promise((res, rej) => {
        const $ = cheerio.load(response, { normalizeWhitespace: true });
        const linkList = $('.tm-box').find('div').children();
        if (linkList.length === 4) {
          res(linkList[2].attribs.href);
        } else {
          rej('User not logged in');
        }
      });
    });

const onlyNumbers = (str) => str.replace(/[^\d.,-]/g, '').replace(',', '.');
const trimPersonName = (name) => name.trim().split('\n')[0].trim();

/* Fetch own team results. Currently Kilometrikisa does not let access other team's data. */
export const fetchTeamResults = () =>
  fetchTeamUrl()
    .then((teamUrl) => axios.get(kkPageUrlStart + teamUrl, axiosRequestWithAuth))
    .then((response) => response.data)
    .then((response) => {
      const $ = cheerio.load(response, { normalizeWhitespace: false });

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
    });

/* Get single page of general team statistics for given contest. */
export const getTeamInfoPage = (page, n = 0) => {
  const cleanTeamName = (name) => {
    name = name.replace(' TOP-10', '');
    name = name.substring(0, name.lastIndexOf('('));
    return name.trim();
  };
  const pageUrl = page + '&page=' + (n+1);
  return axios.get(pageUrl)
    .then((response) => response.data)
    .then((response) => {
      const $ = cheerio.load(response, { normalizeWhitespace: true });

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
    });
};

/* Get n first pages of team statistics */
export const getTeamInfoPages = (page, n) =>
  Promise.all(
    [...Array(n).keys()]
    .map((n) => getTeamInfoPage(page, n)))
  .then(R.flatten);


/** Lists all contests that are available on the site.
 * @return {Promise} */
export const getAllContests = () =>
  axios.get(kkPageUrlStart)
    .then((response) => response.data)
    .then((response) => {
      const $ = cheerio.load(response, { normalizeWhitespace: true });
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
        };
      });
      return contests;
    });
