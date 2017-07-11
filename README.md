# Kilometrikisa

This module will enable you to easily access information on the [Kilometrikisa](https://www.kilometrikisa.fi/) site.

## Usage

### Log in and fetch basic user information

```javascript
const user = await Kilometrikisa.login('username', 'password');
console.log(user);
```

### Fetch results for user

```javascript
Kilometrikisa.login(kktestLogin, kktestPw)
  .then(() => Kilometrikisa.fetchUserResults())
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
const teams = await Kilometrikisa.getTeamInfoPages(Kilometrikisa.allTeamsTopListPage, n);
console.log(teams);
```

### Fetch detailed information for the team where specified user belongs to.

```javascript
Kilometrikisa.login('username', 'password')
  .then(() => Kilometrikisa.fetchTeamResults())
  .then(teamResults => {
    console.log(teamResults.name);
    console.log(teamResults.results);
});
```
