'use strict';
require("babel-core/register");
require("babel-polyfill");

import * as Kilometrikisa from '../index';
import * as chai from 'chai';
import axiosCookieJarSupport from '@3846masa/axios-cookiejar-support';
import * as tough from 'tough-cookie';

chai.should();
const expect = chai.expect;

const kktestLogin = 'kilometrikisatesti';
const kktestPw = 'kilometrikisatesti';

const cookieJar = new tough.CookieJar();
Kilometrikisa.setupAxiosCookieJar(axiosCookieJarSupport, cookieJar);

describe('kilometrikisa tests', function() {
  beforeEach(function(done) {
    done();
  });

  it('login', async function() {
    this.timeout(5000);
    const user = await Kilometrikisa.login(kktestLogin, kktestPw);
    expect(user.firstname).to.equal('Kilometri');
    expect(user.lastname).to.equal('Kisa');
  });

  it('fetchUserResults', async function() {
    this.timeout(5500);
    return Kilometrikisa.login(kktestLogin, kktestPw)
      .then(() => Kilometrikisa.fetchUserResults())
      .then(results => {
        expect(results.length).to.be.at.least(50);
        const totalKm = results.reduce((s, v) => s + v.km, 0);
        expect(totalKm).to.be.at.least(450);
        console.log(totalKm + " km driven");
    });
  });

  it('getKkLoginToken', async () => {
    const token = await Promise.resolve(Kilometrikisa.getKkLoginToken());
    expect(token).to.have.length(32);
  });

  it('getTeamInfoPage', async () => {
    this.timeout(4500);
    const teams = await Kilometrikisa.getTeamInfoPage(Kilometrikisa.allTeamsTopListPage);
    expect(teams).to.have.length(50);
    console.log(teams[0]);
  });

  it('getTeamInfoPages', async () => {
    const n = 4;
    const teams = await Kilometrikisa.getTeamInfoPages(Kilometrikisa.allTeamsTopListPage, n);
    console.log(teams[99]);
    expect(teams).to.have.length(n * 50)
  });

  it('fetchProfilePage fails', async function() {
    this.timeout(4000);
    return Kilometrikisa.fetchProfilePage(kktestLogin, kktestPw).then(user =>
    {
      expect('should have failed').to.equal('');
    }).catch(() => {
      console.log('fetchProfilePage failed as expected');
    });
  });

  it('login fail', async function() {
    return Kilometrikisa.login('invaliduser', 'invalidpw')
      .then(() => {
        expect("should have failed").to.be("");
      })
      .catch(() => console.log('Login failed as expected'));
  });

  it('fetchTeamUrl', async function() {
    this.timeout(5500);
    return Kilometrikisa.login(kktestLogin, kktestPw)
      .then(() => Kilometrikisa.fetchTeamUrl())
      .then(teamUrl => {
        expect(teamUrl).to.equal("/teams/joukkue1234/kilometrikisa-2017");
    });
  });

  it('fetchTeam', async function() {
    this.timeout(6500);
    return Kilometrikisa.login(kktestLogin, kktestPw)
      .then(() => Kilometrikisa.fetchTeamResults())
      .then(teamResults => {
        expect(teamResults.name).to.equal('joukkue1234');
        expect(teamResults.results).to.have.length(1);
        expect(teamResults.results[0].rank).to.equal(1);
        console.log(teamResults);
    });
  });
});
