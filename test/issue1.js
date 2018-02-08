var tape = require('tape');
var mjsre = require('../lib/main.js').typeset;
var jsdom = require('jsdom').jsdom;

tape('SVG output: xlink:href namespace prefix', function(t) {
  t.plan(1);
  var input = 'x';
  mjsre({math: input, format: "TeX", svg: true},function(result){
    var document = jsdom(result.svg);
    var window = document.defaultView;
    var path = window.document.querySelector('use');
    t.ok(path.getAttribute('xlink:href'), 'SVG href has xlink prefix');
  });
});
