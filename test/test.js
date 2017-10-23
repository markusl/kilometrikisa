'use strict';
import 'babel-polyfill';
import * as Kilometrikisa from '../index';
import * as chai from 'chai';
import * as tough from 'tough-cookie';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

chai.should();
const expect = chai.expect;
const assert = chai.assert;

const kktestLogin = 'kilometrikisatesti';
const kktestPw = 'kilometrikisatesti';

const cookieJar = new tough.CookieJar();
Kilometrikisa.setAxiosCookieJar(cookieJar);

describe('kilometrikisa tests', function() {
  beforeEach(function(done) {
    done();
  });

  it('login', async function() {
    this.timeout(10000);
    const user = await Kilometrikisa.login(kktestLogin, kktestPw);
    expect(user.firstname).to.equal('Kilometri');
    expect(user.lastname).to.equal('Kisa');
  });

  it('getUserResults', async function() {
    this.timeout(10000);
    return Kilometrikisa.login(kktestLogin, kktestPw)
      .then(() => Kilometrikisa.getUserResults())
      .then((results) => {
        expect(results.length).to.be.at.least(50);
        const totalKm = results.reduce((s, v) => s + v.km, 0);
        expect(totalKm).to.be.at.least(450);
        expect(totalKm).to.be.at.most(500);
        console.log(totalKm + ' km driven');
    });
  });

  it('updateLog', async function() {
    this.timeout(15000);
    return Kilometrikisa.login(kktestLogin, kktestPw)
      .then(() => Kilometrikisa.updateLog('2017-08-22', 100.5))
      .then(() => Kilometrikisa.fetchUserResults())
      .then((results) => {
        expect(results.length).to.be.at.least(50);
        const totalKm = results.reduce((s, v) => s + v.km, 0);
        expect(totalKm).to.be.at.least(550);
        console.log(totalKm + ' km driven after update!');
      })
      .then(() => Kilometrikisa.updateLog('2017-08-22', '0'));
  });

  it('updateLog incorrect date', async function() {
    this.timeout(10000);
    return assert.isRejected(Kilometrikisa.login(kktestLogin, kktestPw)
        .then(() => Kilometrikisa.updateLog('2017-01-22', 100.5))
        .then(() => Kilometrikisa.fetchUserResults())
        .then((results) => {
          expect(results.length).to.be.at.least(50);
          const totalKm = results.reduce((s, v) => s + v.km, 0);
          expect(totalKm).to.be.at.least(550);
          console.log(totalKm + ' km driven after update!');
        })
      );
  });

  it('getKkLoginToken', async function() {
    this.timeout(10000);
    const token = await Promise.resolve(Kilometrikisa.getKkLoginToken());
    expect(token).to.have.length(32);
  });

  it('getTeamInfoPage', async function() {
    this.timeout(10000);
    const teams = await Kilometrikisa.getTeamInfoPage(Kilometrikisa.allTeamsTopListPage);
    expect(teams).to.have.length(50);
    console.log(teams[0]);
  });

  it('getTeamInfoPages', async function() {
    this.timeout(10000);
    const n = 4;
    const teams = await Kilometrikisa.getTeamInfoPages(Kilometrikisa.allTeamsTopListPage, n);
    console.log(teams[99]);
    expect(teams).to.have.length(n * 50);
  });

  it('fetchProfilePage fails', async function() {
    this.timeout(10000);
    return Kilometrikisa.fetchProfilePage(kktestLogin, kktestPw).then((user) => {
      expect('should have failed').to.equal('');
    }).catch(() => {
      console.log('fetchProfilePage failed as expected');
    });
  });

  it('login fail', async function() {
    this.timeout(10000);
    return Kilometrikisa.login('invaliduser', 'invalidpw')
      .then(() => {
        expect('should have failed').to.be('');
      })
      .catch(() => console.log('Login failed as expected'));
  });

  it('fetchTeamUrl', async function() {
    this.timeout(10000);
    return Kilometrikisa.login(kktestLogin, kktestPw)
      .then(() => Kilometrikisa.fetchTeamUrl())
      .then((teamUrl) => {
        expect(teamUrl).to.equal('/teams/joukkue1234/kilometrikisa-2017');
    });
  });

  it('getContests', async function() {
    this.timeout(10000);
    return Kilometrikisa.login(kktestLogin, kktestPw)
      .then(() => Kilometrikisa.getContests())
      .then((result) => {
        expect(result).to.have.length(1);
        expect(result[0].teamName).to.equal('joukkue1234');
        expect(result[0].contest).to.equal('Kilometrikisa 2017');
        expect(result[0].time).to.equal('01.05.2017 – 22.09.2017');
    });
  });

  it('fetchTeam', async function() {
    this.timeout(10000);
    return Kilometrikisa.login(kktestLogin, kktestPw)
      .then(() => Kilometrikisa.fetchTeamResults())
      .then((teamResults) => {
        expect(teamResults.name).to.equal('joukkue1234');
        expect(teamResults.results).to.have.length(1);
        expect(teamResults.results[0].rank).to.equal(1);
        console.log(teamResults);
    });
  });
});
