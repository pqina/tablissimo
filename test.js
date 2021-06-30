const tablissimo = require('./index.js');

const options = {
    debug: true,
    format: {
        // format as date
        date: (str) =>
            new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(
                new Date(str)
            ),

        // format as location with link to openstreetmap
        location: (str) =>
            /,/.test(str)
                ? `<a href="https://www.openstreetmap.org/?query=${str}" target="_blank" rel="noreferrer" title="Show ${str} on map">${str}</a>`
                : str,
    },
};

const table = tablissimo(
    `
caption: TVA Timeline Disruptions
head: Event | Date | Time | Location
body: | =date | | =location

_46465189=703_
2301-04-23
08:39:42
Vormir

_46462044=066_
1551-10-25
18:09:34
Thorton, USA

_46443278=421_
1999-11-22
08:02:13
Cookeville, USA

_46420987=051_
2004-02-16
14:21:03
Asgard

_46432678=042_
1390-10-03
03:01:24
Rome, Italy
`,
    options
);

console.log(table);
