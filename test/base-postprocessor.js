const tape = require('tape');
const postprocessor = require('../lib/main.js').postprocessor;
const mj = require('mathjax-node').typeset;

tape('Base check: postprocessor', function(t) {
  t.plan(1);
  var input = 'x';
  mj({math: input, format: "TeX", mml: true, svgNode: true},function(result){
    postprocessor({speakText: true}, result, function(output){
      t.ok(result.speakText, 'basic test');
    })
  });
});
