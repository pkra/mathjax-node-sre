var tape = require('tape');
var mjsre = require('../lib/main.js').typeset;

tape('Base check: speech-rule-engine semanticTree', function(t) {
  t.plan(2);
  var tex = 'x';
  mjsre({
    math: tex,
    format: "TeX",
    mml: true,
    stree: true,
    json: true
  }, function(data) {
    t.ok(data.json, 'semantic tree JSON');
    t.ok(data.stree, 'semantic tree XML');
  });
});
