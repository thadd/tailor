Tailor File Tailing Utility
===========================

Tool for tailing log files and making the output easy to view and work with. Also a useful way for me to learn Node.js, Socket.IO, and refine my Backbone.js skills.

Feature List
------------

See issue [#1](https://github.com/thadd/tailor/issues/1).

Usage
-----

All you need is Node.js.

````
node node/index.js
````

Then visit http://127.0.0.1:7065 in your browser.

Contributing
------------

I like HAML and SASS so the templates and CSS are built using them. Just run `bundle exec guard` and HAML and SASS will watch the respective directories and keep the generated HTML and CSS up-to-date as you change

### Important Files ###

* `node/index.js` - This is the main Node server file. It handles everything on the server side including serving up assets and performing the log tails
* `site/js/tailor.js` - This is the main Backbone file. It handles most of the interaction on the client side.
* `haml/index.html` - HAML file for the main page of the app
* `sass/application.scss` - SCSS file for the main page of the app