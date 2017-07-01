'use strict';
import 'babel-core/register';
import 'babel-polyfill';
import * as cheerio from 'cheerio-without-node-native';
import fetch from 'node-fetch';
import queryString from 'query-string';
import * as cookieparser from 'cookieparser';

const kkPageUrlStart = 'https://www.kilometrikisa.fi';
const accountPageUrl = kkPageUrlStart + '/accounts/index/';
const loginPageUrl = kkPageUrlStart + '/accounts/login/';
export const allTeamsTopListPage = kkPageUrlStart + '/contests/kilometrikisa-2017/teams/?sort=rank&order=asc';
export const smallTeamsTopListPage = kkPageUrlStart + '/contests/kilometrikisa-2017/teams/small/?sort=rank&order=asc';
export const largeTeamsTopListPage = kkPageUrlStart + '/contests/kilometrikisa-2017/teams/large/?sort=rank&order=asc';
export const powerTeamsTopListPage = kkPageUrlStart + '/contests/kilometrikisa-2017/teams/power/?sort=rank&order=asc';

const toColumns = (c, elem) => {
  return c(elem).children().map((i, elem) => c(elem).text());
};

const getHeaders = (tokens) => {
  return {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Cookie': tokens.join(';'),
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': loginPageUrl,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
  };
};

/** First part of the login process. Fetch the csrftoken needed for Login */
export function getKkLoginToken() {
  return fetch(loginPageUrl)
    .then((response) => response.text())
    .then((response) => new Promise((res, rej) => {
        const loginFormTokenStart = "value=\"";
        const loginFormTokenEnd = "\">";
        const $ = cheerio.load(response);
        const loginForm = $('form').html();
        const csrftoken = loginForm.substring(loginForm.indexOf(loginFormTokenStart) + loginFormTokenStart.length, loginForm.indexOf(loginFormTokenEnd));
        res(csrftoken)
      }
    )
  );
}

/** Second part of the login process where the credentials are sent with the csrfToken. */
const doKkLogin = (username, password, csrftoken) => {
  const body = queryString.stringify({
    username: username,
    password: password,
    csrfmiddlewaretoken: csrftoken,
    next: ""
  });

  return fetch(loginPageUrl, {
      method: 'POST',
      headers: getHeaders(['csrftoken=' + csrftoken]),
      redirect: 'manual',
      body: body
    })
    .then((response) => {
      return new Promise((res, rej) => {
        const success = response.headers.has('set-cookie') &&
          response.headers.has('location');
        if(success) {
          const cookies = cookieparser.parse(response.headers.get('set-cookie'));
          res({ csrftoken : cookies.csrftoken, sessionid : cookies.sessionid });
        } else {
          rej("Failed request: " + response.headers);
        }
      });
    });
}

/* Login to Kilometrikisa site. Returns a promise which resolves to the
 * session object with csrftoken and sessionid for doing more requests. */
export function login(username, password) {
  return getKkLoginToken().then((token) => {
    return doKkLogin(username, password, token)
  })
}

/* Fetch url to own team page. */
export function fetchTeamUrl(session) {
  return fetch(accountPageUrl, {
      headers: getHeaders(['sessionid=' + session.sessionid, ' csrftoken=' + session.csrftoken])
  })
  .then((response) => response.text())
  .then((response) => {
    return new Promise((res, rej) => {
      const $ = cheerio.load(response, { normalizeWhitespace: true });
      const linkList = $('.tm-box').find('div').children();
      res([session, linkList[2].attribs.href]);
    });
  });
}

/* Fetch own team results. Currently Kilometrikisa does not let access other team's data. */
export function fetchTeamResults(session) {
  const cleanPersonName = (name) => {
    name = name.trim().split('\n');
    return name[0].trim();
  };
  return fetchTeamUrl(session)
    .then(([session, teamUrl]) => {
      return fetch(kkPageUrlStart + teamUrl, {
          headers: getHeaders(['sessionid=' + session.sessionid, ' csrftoken=' + session.csrftoken])
      })})
    .then((response) => response.text())
    .then((response) => {
      return new Promise((res, rej) => {
        const c = cheerio.load(response, { normalizeWhitespace: false });

        const teamName = c('.widget').find('h4').first().text().trim();
        const teamRank = parseInt(c('.team-contest-table').find('strong').html().trim().replace('&#xA0;', ''));

        const isAdmin = c('div[data-slug="team-edit"]') !== undefined;
        const teamRows = c('div[data-slug="my-team"]').find('tbody').children();
        const results = teamRows
          .map((i, elem) => {
            const columns = toColumns(c, elem);
            return {
              rank : parseInt(columns[0]),
              name: cleanPersonName(columns[1]),
              km: parseFloat(columns[isAdmin ? 3 : 2]),
              days: parseInt(columns[isAdmin ? 4 : 3])
            }
        });
        res({
          name : teamName,
          rank : teamRank,
          results: results.get()
        });
      });
    });
}

/* Get single page of general team statistics for given contest. */
export function getTeamInfoPage(page, n = 0) {
  const cleanTeamName = (name) => {
    name = name.replace(" TOP-10", "");
    name = name.substring(0, name.lastIndexOf("("));
    return name.trim();
  };
  const pageUrl = page + '&page=' + (n+1);
  return fetch(pageUrl)
    .then((response) => response.text())
    .then((response) => {
        const $ = cheerio.load(response, { normalizeWhitespace: true });

        const resultTable = $(".result-table").find('tbody');
        const rows = resultTable.children();
        const infos = rows.map((i, elem) => {
            const columns = toColumns($, elem);
            return {
              rank : columns[0],
              name: cleanTeamName(columns[1]),
              kmpp: columns[2],
              kmTotal: columns[3],
              days: columns[4]
            }
        });

        return new Promise((res, rej) => res(infos.get()));
    })
}

function flatten(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}

/* Get n first pages of team statistics */
export function getTeamInfoPages(page, n) {
  return Promise.all([...Array(n).keys()]
    .map(n => getTeamInfoPage(page, n)))
    .then(infos => {
      return new Promise((res, rej) => {
        res(flatten(infos));
       });
     }
  );
}
