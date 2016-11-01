const mathjax = require('mathjax-node');
const speech = require('speech-rule-engine');

// input `data` extends mathjax-node input `data`.
// Additional values are:
//
// speakText: false,               // adds spoken annotations to output
// speakRuleset: "mathspeak",      // set speech ruleset; default (= chromevox rules) or mathspeak
// speakStyle: "default",          // set speech style for mathspeak rules:  default, brief, sbrief)
// semantic: false,                // adds semantic tree information to output
// minSTree: false,                // if true the semantic tree is minified
// enrich: false                   // replace the math input with the result from SRE enriching and re-render it.

// FROM mathjax-node
//
//  Creates the speech string and updates the MathML to include it, if needed
//
let GetSpeech = function(data, result) {
  if (!data.speakText) return;
  speech.setupEngine({semantics: true, domain: data.speakRuleset, style: data.speakStyle});
  result.speakText = speech.toSpeech(result.mml);
  if (!data.mml) return;
  var jax = MathJax.Hub.getAllJax()[0];
  jax.root.alttext = result.speakText;
  var attrNames = jax.root.attrNames;
  if (attrNames && attrNames.indexOf("alttext") === -1) {
    attrNames.push("alttext");
  }
  result.mml = jax.root.toMathML('',jax);
}

//
//  Creates the semantic tree for the current element and attaches it as JSON
//  and XML.
//
let GetSemantic = function(data, result) {
  if (!data.semantic) return;
  result.streeJson = speech.toJson(result.mml);
  var xml = speech.toSemantic(result.mml).toString();
  result.streeXml = data.minSTree ? xml : speech.pprintXML(xml);
}
// END from mathjax-node

let main = function(data, result, callback){
  if (data.svg) data.svgnode = true;
  if (data.html) data.htmlnode = true;
  data.mmlnode = true;
  // enrich output
  mathjax.typeset(data,function(result){
    if(result.error) throw result.error;
    if (result.svgnode){
      result.svgnode.querySelector('desc').innerHTML = result.speakText;
      result.svg = result.svgnode.outerHTML;
    }
    if(result.htmlnode){
      result.htmlnode.setAttribute("aria-label", result.speakText);
      result.html = result.htmlnode.outerHTML;
    }
    if (result.mmlnode) {
      result.mmlnode.querySelector('desc').innerHTML = result.speakText;
      result.mml = result.mmlnode.outerHTML;
    }
    callback(result);
  })
};

exports.start = mathjax.start;
exports.config = mathjax.config;
exports.typeset = function(data, callback){
  data.svgnode = true;
  data.htmlnode = true;
  data.mmlnode = true;
  if(data.enrich === 'rerender'){
    let newdata = data;
    data.mml = true;
    data.svg = false;
    data.html = false;
    mathjax.typeset(data, function(result){
      let newdata = result.data;
      newdata.math = result.mml;
      newdata.format = 'MathML';
      mathjax.typeset(data, function(result){
        main(data, result, callback);
      });
    });
}
  else{
    mathjax.typeset(data, function(result){
      if (result.error) throw result.error;
      main(data, result, callback);
    });
  }
}
