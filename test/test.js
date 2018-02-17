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

  it('getUserResults 2017', async function() {
    this.timeout(10000);
    return Kilometrikisa.login(kktestLogin, kktestPw)
      .then(() => Kilometrikisa.getUserResults('22', 2017))
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
    const contestId = await Kilometrikisa.getLatestContestId();
    return Kilometrikisa.login(kktestLogin, kktestPw)
      .then(() => Kilometrikisa.updateLog(contestId, '2018-02-17', 100.5))
      .then(() => Kilometrikisa.getUserResults(contestId, 2018))
      .then((results) => {
        expect(results.length).to.be.at.least(15);
        const totalKm = results.reduce((s, v) => s + v.km, 0);
        expect(totalKm).to.be.at.least(100);
        console.log(totalKm + ' km driven after update!');
      })
      .then(() => Kilometrikisa.updateLog(contestId, '2018-02-17', '0'));
  });

  it('updateLog incorrect date', async function() {
    this.timeout(10000);
    const contestId = await Kilometrikisa.getLatestContestId();
    return assert.isRejected(Kilometrikisa.login(kktestLogin, kktestPw)
        .then(() => Kilometrikisa.updateLog('2017-01-22', 100.5))
        .then(() => Kilometrikisa.getUserResults(contestId, 2018))
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
    const page = await Kilometrikisa.allTeamsTopListPage();
    const teams = await Kilometrikisa.getTeamInfoPage(page);
    expect(teams).to.have.length(50);
    console.log(teams[0]);
  });

  it('getTeamInfoPages', async function() {
    this.timeout(10000);
    const n = 4;
    const page = await Kilometrikisa.allTeamsTopListPage();
    const teams = await Kilometrikisa.getTeamInfoPages(page, n);
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
        expect(teamUrl).to.equal('/teams/talvikisa-2018/talvikilometrikisa-2018');
    });
  });

  it('getContests', async function() {
    this.timeout(10000);
    return Kilometrikisa.login(kktestLogin, kktestPw)
      .then(() => Kilometrikisa.getContests())
      .then((result) => {
        expect(result).to.have.length(2);
        expect(result[0].teamName).to.equal('Talvikisa 2018');
        expect(result[0].contest).to.equal('Talvikilometrikisa 2018');
        expect(result[0].time).to.equal('01.01.2018 – 28.02.2018');
        expect(result[1].teamName).to.equal('joukkue1234');
        expect(result[1].contest).to.equal('Kilometrikisa 2017');
        expect(result[1].time).to.equal('01.05.2017 – 22.09.2017');
    });
  });

  it('fetchTeam', async function() {
    this.timeout(10000);
    return Kilometrikisa.login(kktestLogin, kktestPw)
      .then(() => Kilometrikisa.fetchTeamResults())
      .then((teamResults) => {
        expect(teamResults.name).to.equal('Talvikisa 2018');
        expect(teamResults.results).to.have.length(2);
        expect(teamResults.results[0].rank).to.equal(1);
        console.log(teamResults);
    });
  });

  it('getAllContests', async function() {
    this.timeout(10000);
    const contests = await Kilometrikisa.getAllContests();
    expect(contests.length).to.be.at.least(10);
    expect(contests[1].name).to.equal('Koulujen kilometrikisa 2017');
    expect(contests[1].link).to.equal('/contests/koulujen-kilometrikisa-2017/teams/');
  });

  it('getLatestContest', async function() {
    this.timeout(10000);
    const contest = await Kilometrikisa.getLatestContest();
    expect(contest.name).to.equal('Talvikilometrikisa 2018');
    expect(contest.link).to.equal('/contests/talvikilometrikisa-2018/teams/');
  });

  it('getContestId', async function() {
    this.timeout(10000);
    const contests = await Kilometrikisa.getAllContests();
    const contestId = await Kilometrikisa.getContestId(contests[0].link);
    expect(contestId).to.equal('30');
  });

  it('getLatestContestId', async function() {
    this.timeout(10000);
    const contestId = await Kilometrikisa.getLatestContestId();
    expect(contestId).to.equal('30');
  });
});
