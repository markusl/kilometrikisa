# Kilometrikisa

This module will enable you to easily access information on the [Kilometrikisa](https://www.kilometrikisa.fi/) site.

## Usage

### Fetch top 100 statistics

```javascript
const n = 2;
const teams = await Kilometrikisa.getTeamInfoPages(Kilometrikisa.allTeamsTopListPage, n);
console.log(teams);
```

### Fetch detailed information from your own team

```javascript
const session = await Kilometrikisa.login('username', 'password');
const teamResults = await Kilometrikisa.fetchTeamResults(session);
console.log(teamResults);
```
