const mathjax = require('mathjax-node');
const sre = require('speech-rule-engine');

// New configuration values are:
//
// speakText: true,               // adds spoken annotations to output
// enrich: false                   // replace the math input with MathML resulting from SRE enrichment
// output: SVG
//    Other values are
//        MML (Mathml), HTML (common HTML), speech (Speech string only)
//        Stree (semantic tree), json (semantic tree in json format)
//    Each of these values can also be simply given as flag in the configuration object.
//    Resulting values are then in the result object.
// 

// How to use them:
// in main, pre-processor: the `data` parameter is the usual mathjax-node configuration object, with (possibly) the above additions.
// in post-processor: the `config` only consists of the above values

// `result` data extends the mathjax-node `result` data.
// Additional values are
//
// speakText:                      // string with spoken annotation


const optionsDefault = {
    speakText: true,
    format: "TeX",
    font: "TeX",
    output: "SVG",
    ex: 6,
    width: 100,
    extensions: "",
    enrich: false,
    semantic: false,
    fontURL: "https://cdn.mathjax.org/mathjax/latest/fonts/HTML-CSS"
};

const sreDefault = {
    speech: 'deep',
    semantics: true,
    domain: 'mathspeak',
    style: 'default'
};


const sreconfig = function(data) {
    let config = {};
    if (data.sre) {
        for (let i = 0, key; key = data.sre[i]; i++) {
            let value = data.sre[++i];
            config[key] = value || false;
        }
    }
    return Object.assign({}, sreDefault, config);
};


const main = function (data, callback) {
    const speechConfig = sreconfig(data);
    // backup data
    data.originalData = {
        mml: data.mml,
        mmlNode: data.mmlNode,
        svgNode: data.svgNode,
        htmlNode: data.htmlNode
    };
    // modify configuration
    if (data.svg) data.svgNode = true;
    if (data.html) data.htmlNode = true;
    data.mmlNode = true;
    data.mml = true;
    mathjax.typeset(data, function (result, input) {
        postprocessor(data, result, input, callback);
    });
};

const postprocessor = function (data, result, input, callback) {
    let speechConfig = sreconfig(data);
    if (result.error) throw result.error;
    if (!result.mml && !result.mmlNode) throw new Error('No MathML found. Please check the mathjax-node configuration');
    if (!result.svgNode && !result.htmlNode && !result.mmlNode) throw new Error('No suitable output found. Either svgNode, htmlNode or mmlNode are required.');
    if (!result.mml) result.mml = result.mmlNode.outerHTML;
    if (!speechConfig.speech) speechConfig.speech =  'deep';
    // add semantic tree
    if (data.json) {
        result.json = sre.toJson(result.mml);
    }
    if (data.stree) {
        const xml = sre.toSemantic(result.mml).toString();
        result.stree = sre.pprintXML(xml);  // Make pretty printing an option of SRE.
    }
    // return if no speakText is requested
    if (!data.speakText) {
        callback(result, input);
        return;
    }
    // enrich output
    sre.setupEngine(speechConfig);
    result.speech = sre.toSpeech(result.mml);
    if (result.svgNode) {
        result.svgNode.querySelector('title').innerHTML = result.speech;
        // update serialization
        // HACK add lost xlink namespaces TODO file jsdom bug
        if (result.svg) result.svg = result.svgNode.outerHTML
            .replace(/><([^/])/g, ">\n<$1")
            .replace(/(<\/[a-z]*>)(?=<\/)/g, "$1\n")
            .replace(/(<(?:use|image) [^>]*)(href=)/g, ' $1xlink:$2');
    }
    if (result.htmlNode) {
        result.htmlNode.firstChild.setAttribute("aria-label", result.speech);
        // update serialization
        if (result.html) result.html = result.htmlNode.outerHTML;
    }
    if (result.mmlNode) {
        result.mmlNode.setAttribute("alttext", result.speech);
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
    const speechConfig = sreconfig(data);
    sre.setupEngine(speechConfig);
    // if MathML, enrich and continue
    if (data.format === "MathML") {
        data.speakText = sre.toSpeech(data.math);
        data.math = sre.toEnriched(data.math).toString();
        data.math = data.math.replace(/alttext="(.*?)"/,'alttext="' + data.speakText + '"');
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
            data.speakText = sre.toSpeech(result.mml);
            data.math = sre.toEnriched(result.mml).toString();
            data.math = data.math.replace(/alttext="(.*?)"/,'alttext="' + data.speakText + '"');
            data.format = 'MathML';
            callback(data);
        });
    }
}


exports.options = optionsDefault;
exports.start = mathjax.start;
exports.config = mathjax.config;
const cbTypeset = function (data, callback) {
    if (data.enrich) {
        preprocessor(data, function (result) {
            main(result, callback);
        })
    } else main(data, callback);
};
// main API, callback and promise compatible
exports.typeset = function (data, callback) {
    let mjConfig = Object.assign({}, optionsDefault, data);
    if (callback) {
        cbTypeset(mjConfig, callback);
    }
    else return new Promise(function (resolve, reject) {
        cbTypeset(mjConfig, function (output, input) {
            if (output.errors) reject(output.errors);
            else resolve(output, input);
        });
    });
};
exports.postprocessor = postprocessor;
exports.preprocessor = preprocessor;
