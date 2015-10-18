// Insert an icon to the header
var icon = document.createElement('img');
icon.setAttribute('src', self.options.icon);
document.getElementById('header').appendChild(icon);

// Insert the number of pages blocked
var comments = document.getElementById('comments');
var span = document.createElement('span');
span.setAttribute('style', 'color:red;');
span.innerHTML = self.options.comments.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
comments.innerHTML = comments.innerHTML.replace('%pages%', span.outerHTML);

// Insert the donation link
var link = document.createElement('a');
link.setAttribute('href', 'https://addons.mozilla.org/en-US/firefox/addon/commentblocker/developers?src=addon');
link.setAttribute('target', '_blank');
var donate = document.getElementById('donate');
var matches = donate.innerHTML.match(/\_([^ ]+)\_/);
link.innerHTML = matches[1];
donate.innerHTML = donate.innerHTML.replace(matches[0], link.outerHTML);