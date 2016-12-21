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

// `result` data extends the mathjax-node `result` data.
// Additional values are
//
// speakText:                      // string with spoken annotation


let main = function(data, callback){
  speech.setupEngine({semantics: true, domain: data.speakRuleset || 'mathspeak', style: data.speakStyle || 'default'});
  if (data.svg) data.svgNode = true;
  if (data.html) data.htmlNode = true;
  data.mmlNode = true;
  data.mml = true;

  mathjax.typeset(data,function(result){
    if (result.error) throw result.error;
    // enrich output
    if (data.speakText) {
      result.speakText = speech.toSpeech(result.mml);
      if (result.svgNode){
        result.svgNode.querySelector('title').innerHTML = result.speakText;
        // update serialization
        // HACK add lost xlink namespaces TODO track down jsdom bug
        result.svg = result.svgNode.outerHTML
                           .replace(/(<(?:use|image) [^>]*)(href=)/g,' $1xlink:$2');
      }
      if(result.htmlNode){
        result.htmlNode.setAttribute("aria-label", result.speakText);
        result.html = result.htmlNode.outerHTML;
      }
      if (result.mmlNode) {
        result.mmlNode.setAttribute("alttext", result.speakText);
        result.mml = result.mmlNode.outerHTML;
      }
    }
    // add semantic tree
    if (data.semantic) {
      result.streeJson = speech.toJson(result.mml);
      var xml = speech.toSemantic(result.mml).toString();
      result.streeXml = data.minSTree ? xml : speech.pprintXML(xml);
    }
    callback(result);
  })
};

exports.start = mathjax.start;
exports.config = mathjax.config;
exports.typeset = function(data, callback){
  if (data.svg) data.svgNode = true;
  if (data.html) data.htmlNode = true;
  if (data.mml) data.mmlNode = true;
  if (data.enrich === 'rerender'){
    let newdata = data;
    if (newdata.format === "MathML"){
      newdata.math = speech.toEnriched(newdata.math);
      main(data, result, callback);
    }
    else {
      // convert to MathML and then repeat
      newdata.mml = true;
      newdata.mmlNode = false;
      newdata.svg = false;
      newdata.svgNode = false;
      newdata.html = false;
      newdata.htmlNode = false;
      mathjax.typeset(newdata, function(result){
        if (result.error) throw result.error;
        newdata.math = speech.toEnriched(newdata.math);
        newdata.format = 'MathML';
        newdata.svg = data.svg;
        newdata.svgNode = data.svgNode;
        newdata.html = data.html;
        newdata.htmlNode = data.htmlNode;
        newdata.mml = data.mml;
        newdata.mmlNode = data.mmlNode;
        main(data, result, callback);
      });
    }
  }
  else main(data, callback);
};
