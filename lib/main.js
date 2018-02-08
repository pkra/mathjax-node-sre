const mathjax = require('mathjax-node');
const speech = require('speech-rule-engine');

// New configuration values are:
//
// speakText: false,               // adds spoken annotations to output
// speakRuleset: "mathspeak",      // set speech ruleset; default (= chromevox rules) or mathspeak
// speakStyle: "default",          // set speech style for mathspeak rules:  default, brief, sbrief)
// semantic: false,                // adds semantic tree information to output
// minSTree: false,                // if true the semantic tree is minified
// enrich: false                   // replace the math input with MathML resulting from SRE enrichment

// How to use them:
// in main, pre-processor: the `data` parameter is the usual mathjax-node configuration object, with (possibly) the above additions.
// in post-processor: the `config` only consists of the above values

// `result` data extends the mathjax-node `result` data.
// Additional values are
//
// speakText:                      // string with spoken annotation


const main = function (data, callback) {
    let speechConfig = {
        semantics: true,
        domain: data.speakRuleset || 'mathspeak',
        style: data.speakStyle || 'default',
        semantic: data.semantic,
        minSTree: data.minSTree,
        speakText: data.speakText
    };
    // backup data
    data.originalData = {
        mml: data.mml,
        mmlNode: data.mmlNode,
        svgNode: data.svgNode,
        htmlNode: data.htmlNode
    }
    // modify configuration
    if (data.svg) data.svgNode = true;
    if (data.html) data.htmlNode = true;
    data.mmlNode = true;
    data.mml = true;

    mathjax.typeset(data, function (result, input) {
        postprocessor(speechConfig, result, input, callback);
    })
};

const postprocessor = function (config, result, input, callback) {
    if (result.error) throw result.error;
    if (!result.mml) throw new Error('No MathML found. Please check the mathjax-node configuration');
    if (!result.svgNode && !result.htmlNode && !result.mmlNode) throw new Error('No suitable output found. Please check the mathjax-node configuration');
    // add semantic tree
    if (config.semantic) {
        result.streeJson = speech.toJson(result.mml);
        var xml = speech.toSemantic(result.mml).toString();
        result.streeXml = config.minSTree ? xml : speech.pprintXML(xml);
    }
    // return if no speakText is requested
    if (!config.speakText) {
        callback(result, input);
        return
    }
    // enrich output
    speech.setupEngine(config);
    result.speakText = speech.toSpeech(result.mml);
    if (result.svgNode) {
        result.svgNode.querySelector('title').innerHTML = result.speakText;
        // update serialization
        // HACK add lost xlink namespaces TODO file jsdom bug
        if (result.svg) result.svg = result.svgNode.outerHTML
            .replace(/><([^/])/g, ">\n<$1")
            .replace(/(<\/[a-z]*>)(?=<\/)/g, "$1\n")
            .replace(/(<(?:use|image) [^>]*)(href=)/g, ' $1xlink:$2');
    }
    if (result.htmlNode) {
        result.htmlNode.firstChild.setAttribute("aria-label", result.speakText);
        // update serialization
        if (result.html) result.html = result.htmlNode.outerHTML;
    }
    if (result.mmlNode) {
        result.mmlNode.setAttribute("alttext", result.speakText);
        // update serialization
        if (result.mml) result.mml = result.mmlNode.outerHTML;
    }
    // remove intermediary outputs
    if (input.originalData) {
        if (!input.originalData.mml) delete result.mml;
        if (!input.originalData.mmlNode) delete result.mmlNode;
        if (!input.originalData.svgNode) delete result.svgNode;
        if (!input.originalData.htmlNode) delete result.htmlNode;
        delete input.originalData;
    }
    callback(result, input);
}

const preprocessor = function (data, callback) {
    // setup SRE
    let speechConfig = {
        semantics: true,
        domain: data.speakRuleset || 'mathspeak',
        style: data.speakStyle || 'default',
        semantic: data.semantic,
        minSTree: data.minSTree,
        speakText: data.speakText
    };
    speech.setupEngine(speechConfig);
    // if MathML, enrich and continue
    if (data.format === "MathML") {
        data.math = speech.toEnriched(data.math).toString();
        data.speakText = false;
        callback(data);
    } else {
        // convert to MathML, enrich and continue
        const newdata = {
            math: data.math,
            format: data.format,
            mml: true
        };
        mathjax.typeset(newdata, function (result) {
            if (result.error) throw result.error;
            data.math = speech.toEnriched(result.mml).toString();
            data.format = 'MathML';
            data.speakText = false;
            callback(data);
        });
    }
}


exports.start = mathjax.start;
exports.config = mathjax.config;
exports.typeset = function (data, callback) {
    if (data.enrich) {
        preprocessor(data, function (result) {
            main(result, callback);
        })
    } else main(data, callback);
};
exports.postprocessor = postprocessor;
exports.preprocessor = preprocessor;
