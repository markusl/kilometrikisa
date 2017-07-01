'use strict';
require("babel-core/register");
require("babel-polyfill");

const chai = require("chai");

chai.should();

const expect = chai.expect;

import * as Kilometrikisa from '../index';

const kktestLogin = 'kilometrikisatesti';
const kktestPw = 'kilometrikisatesti';

describe('kilometrikisa tests', function() {
  beforeEach(function(done) {
    done();
  });

  it('getKkLoginToken', async () => {
    const token = await Promise.resolve(Kilometrikisa.getKkLoginToken());
    expect(token).to.have.length(32)
  });

  it('getTeamInfoPage', async () => {
    const teams = await Kilometrikisa.getTeamInfoPage(Kilometrikisa.allTeamsTopListPage);
    expect(teams).to.have.length(50)
  });

  it('getTeamInfoPages', async () => {
    const n = 4;
    const teams = await Kilometrikisa.getTeamInfoPages(Kilometrikisa.allTeamsTopListPage, n);
    console.log(teams[99]);
    expect(teams).to.have.length(n * 50)
  });

  it('login', async function() {
    const session = await Kilometrikisa.login(kktestLogin, kktestPw);
    console.log(session);
    expect(session.csrftoken).to.have.length(32);
    expect(session.sessionid).to.have.length(32);
  });

  it('fetchTeamUrl', async function() {
    this.timeout(4500);
    const session = await Kilometrikisa.login(kktestLogin, kktestPw);
    const response = await Kilometrikisa.fetchTeamUrl(session);
    const [_, teamUrl] = response;
    expect(teamUrl).to.equal("/teams/joukkue1234/kilometrikisa-2017");
  });

  it('fetchTeam', async function() {
    this.timeout(5000);
    const session = await Kilometrikisa.login(kktestLogin, kktestPw);
    const teamResults = await Kilometrikisa.fetchTeamResults(session);
    expect(teamResults.name).to.equal('joukkue1234');
    expect(teamResults.results).to.have.length(1);
    expect(teamResults.results[0].rank).to.equal(1);
    console.log(teamResults);
  });
});
