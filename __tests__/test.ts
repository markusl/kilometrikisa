import * as Kilometrikisa from '../src/index';

const kktestLogin = 'kilometrikisatesti';
const kktestPw = 'kilometrikisatesti';

describe('kilometrikisa tests', function() {
  beforeAll(async () => {
    const user = await Kilometrikisa.login(kktestLogin, kktestPw);
    expect(user.firstname).toEqual('Kilometri');
    expect(user.lastname).toEqual('Kisa');
  });

  test('getUserResults 2017 - everything is zero', async () => {
    const results = await Kilometrikisa.getUserResults('22', 2017);
    expect(results.length).toBeGreaterThan(50);
    const totalKm = results.reduce((s: number, v: Kilometrikisa.SingleResult) => s + v.km, 0);
    expect(totalKm).toBe(0);
    console.log(totalKm + ' km driven');
  });

  test('getUserResults 2021', async () => {
    const results = await Kilometrikisa.getUserResults('45', 2021);
    expect(results.length).toBeGreaterThan(50);
    const totalKm = results.reduce((s: number, v: Kilometrikisa.SingleResult) => s + v.km, 0);
    expect(totalKm).toBeGreaterThan(0);
    expect(totalKm).toBeLessThan(500);
    console.log(totalKm + ' km driven');
  });

  test('updateLog', async function() {
    const contestId = await Kilometrikisa.getLatestContestId();
    await Kilometrikisa.updateLog(contestId, '2021-07-17', 100.5);
    const results = await Kilometrikisa.getUserResults(contestId, 2021);
    expect(results.length).toBeGreaterThan(15);
    const totalKm = results.reduce((s, v) => s + v.km, 0);
    expect(totalKm).toBeGreaterThan(100);
    console.log(totalKm + ' km driven after update!');
    await Kilometrikisa.updateLog(contestId, '2021-07-17', 0);
  });

  // test('updateLog incorrect date', async function() {
  //   this.timeout(10000);
  //   const contestId = await Kilometrikisa.getLatestContestId();
  //   return assert.isRejected(Kilometrikisa.login(kktestLogin, kktestPw)
  //       .then(() => Kilometrikisa.updateLog(contestId, '2017-01-22', 100.5))
  //       .then(() => Kilometrikisa.getUserResults(contestId, 2018))
  //       .then((results) => {
  //         expect(results.length).toBeGreaterThan(50);
  //         const totalKm = results.reduce((s, v) => s + v.km, 0);
  //         expect(totalKm).toBeGreaterThan(550);
  //         console.log(totalKm + ' km driven after update!');
  //       })
  //   );
  // });

  test('getKkLoginToken', async function() {
    const token = await Promise.resolve(Kilometrikisa.getKkLoginToken());
    expect(token.length).toBe(32);
  });

  test('getTeamInfoPage', async function() {
    const page = await Kilometrikisa.allTeamsTopListPage();
    const teams = await Kilometrikisa.getTeamInfoPage(page);
    expect(teams.length).toBe(50);
    console.log(teams[0]);
  });

  test('getTeamInfoPages', async function() {
    const n = 4;
    const page = await Kilometrikisa.allTeamsTopListPage();
    const teams = await Kilometrikisa.getTeamInfoPages(page, n);

    expect(teams.length).toBeGreaterThan(50);
  });

  test('fetchProfilePage fails', async function() {
    return Kilometrikisa.fetchProfilePage().then((user) => {
      expect('should have failed').toEqual('');
    }).catch(() => {
      console.log('fetchProfilePage failed as expected');
    });
  });

  test('login fail', async function() {
    return Kilometrikisa.login('invaliduser', 'invalidpw')
        .then(() => {
          expect('should have failed').toBe('');
        })
        .catch(() => console.log('Login failed as expected'));
  });

  test('getContests', async function() {
    const result = await Kilometrikisa.getContests();
    expect(result.length).toBe(4);
    expect(result[1]).toEqual({
      "contest": "Kilometrikisa 2018",
      "contestId": "31",
      "link": "/teams/kesakuntoilijat/kilometrikisa-2018/",
      "teamName": "Kesäkuntoilijat",
      "time": "01.05.2018 – 22.09.2018",
      "year": "2018"
    });
    expect(result[2]).toEqual({
      "contest": "Talvikilometrikisa 2018",
      "contestId": "30",
      "link": "/teams/talvikisa-2018/talvikilometrikisa-2018/",
      "teamName": "Talvikisa 2018",
      "time": "01.01.2018 – 28.02.2018",
      "year": "2018",
    });
  });

  test('fetchTeam', async () => {
    const contests = await Kilometrikisa.getContests();
    const teamResults = await Kilometrikisa.fetchTeamResults(contests[0]);
    console.log(teamResults);
    expect(teamResults.name).toEqual('2021Testi');
    expect(teamResults.results.length).toBe(1);
    expect(teamResults.results[0].rank).toEqual(1);
  });

  test('getAllContests', async function() {
    const contests = await Kilometrikisa.getAllContests();
    expect(contests.length).toBeGreaterThan(10);
    const contest = contests.find((c) => c.name === 'Kilometrikisa 2018');
    expect(contest).not.toBeNull();
    expect(contest.link).toEqual('/contests/kilometrikisa-2018/teams/');
  });

  test('getLatestContest', async function() {
    const contest = await Kilometrikisa.getLatestContest();
    expect(contest.name).toEqual('Kilometrikisa 2021');
    expect(contest.link).toEqual('/contests/kilometrikisa-2021/teams/');
  });

  test('getContestId', async function() {
    const contests = await Kilometrikisa.getAllContests();
    const contestId = await Kilometrikisa.getContestId(contests[0].link);
    expect(contestId).toEqual('45');
  });

  test('getLatestContestId', async function() {
    const contestId = await Kilometrikisa.getLatestContestId();
    expect(contestId).toEqual('45');
  });
});
