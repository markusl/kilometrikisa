# Kilometrikisa

This module will enable you to easily access information on the [Kilometrikisa](https://www.kilometrikisa.fi/) site.

## Usage

### Setup the cookie jar

Before using the library, you might need to configure a cookie
jar for storing the cookies needed for logging in.

```javascript
import * as Kilometrikisa from 'kilometrikisa';
import axiosCookieJarSupport from '@3846masa/axios-cookiejar-support';
import * as tough from 'tough-cookie';

// Setup cookie jar
const cookieJar = new tough.CookieJar();
Kilometrikisa.setupAxiosCookieJar(axiosCookieJarSupport, cookieJar);

// Use library
Kilometrikisa.login('username', 'password')
  .then(user => ...);
```

### Log in and fetch basic user information

```javascript
const user = await Kilometrikisa.login('username', 'password');
console.log(user);
```

### Fetch results for user

```javascript
Kilometrikisa.login(kktestLogin, kktestPw)
  .then(() => Kilometrikisa.getUserResults())
  .then(results => {
    const totalKm = results.reduce((s, v) => s + v.km, 0);
    console.log(totalKm + " km driven");
});
```

```javascript
// Example output
[
  ...
  { date: '2017-06-27', km: 10.7 },
  { date: '2017-06-28', km: 28 },
  { date: '2017-06-29', km: 24.6 },
  { date: '2017-06-30', km: 0 },
  { date: '2017-07-01', km: 21.7 },
  { date: '2017-07-02', km: 26.2 },
  { date: '2017-07-03', km: 12.4 },
  ...
]

```

### Fetch top 100 statistics

```javascript
const n = 2;
const page = await Kilometrikisa.allTeamsTopListPage();
const teams = await Kilometrikisa.getTeamInfoPages(page, n);
console.log(teams);
```

### Fetch detailed information for the team where the user belongs to

```javascript
Kilometrikisa.login('username', 'password')
  .then(() => Kilometrikisa.getContests())
  .then((contests) => Kilometrikisa.fetchTeamResults(contests[0]))
  .then(teamResults => {
    console.log(teamResults.name);
    console.log(teamResults.results);
});
```

### Update information to the contest log

Note that this API will only work when the contest is active.

```javascript
Kilometrikisa.login('username', 'password')
  .then(() => Kilometrikisa.updateLog('2021-08-22', 100.5))
  .then(() => console.log('Log updated'));
```

### Get the contests user has participated in

```javascript
Kilometrikisa.login('username', 'password')
  .then(() => Kilometrikisa.getContests())
  .then((result) => {
    console.log(result[0].teamName + ' ' result[0].contest + ' ' + result[0].time);
    console.log(result[0].link);
});
```

### Get the latest contest information

```javascript
const contests = await Kilometrikisa.getAllContests();
const latest = contests[0];
console.log(latest.name); //  Talvikilometrikisa 2021
console.log(latest.link); // /contests/talvikilometrikisa-2021/teams/
```
