#! /usr/bin/env node

/************************************************************************
 *  Copyright (c) 2016 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

const mj = require('../lib/main.js');
const fs = require('fs');

const argv = require("yargs")
    .strict()
    .usage("$0 [options] 'INPUT'")
    .options({
        speech: {
            boolean: true,
            default: mj.options.speakText,
            describe: "include speech text"
        },
        sre: {
            array: true,
            nargs: 2,
            describe: "SRE flags as key value pairs"
        },
        speechrules: { // deprecated
            default: mj.options.speakRules,
            describe: "ruleset to use for speech text (chromevox or mathspeak)"
        },
        speechstyle: { // deprecated
            default: mj.options.speakStyle,
            describe: "style to use for speech text (default, brief, sbrief)"
        },
        linebreaks: {
            boolean: true,
            describe: "perform automatic line-breaking"
        },
        format: {
            default: mj.options.format,
            describe: "input format(s) to look for"
        },
        font: {
            default: mj.options.font,
            describe: "web font to use"
        },
        inline: {
            boolean: true,
            describe: "process as in-line TeX"
        },
        semantics: {
            boolean: true,
            describe: "for TeX or Asciimath source and MathML output, add input in <semantics> tag"
        },
        notexhints: {
            boolean: true,
            describe: "For TeX input and MathML output, don't add TeX-specific classes"
        },
        output: {
            default: mj.options.output,
            describe: "output format (SVG, CommonHTML, or MML)",
            coerce: (x => {return x.toLowerCase();})
        },
        ex: {
            default: mj.options.ex,
            describe: "ex-size in pixels"
        },
        width: {
            default: mj.options.width,
            describe: "width of equation container in ex (for line-breaking)"
        },
        extensions: {
            default: mj.options.extensions,
            describe: "extra MathJax extensions e.g. 'Safe,TeX/noUndefined'"
        },
        fontURL: {
            default: mj.options.fontURL,
            describe: "the URL to use for web fonts"
        },
        css: {
            boolean: true,
            describe: "With CommnoHTML output, output the required CSS rather than the HTML itself"
        }
    })
    .argv;

const formats = {
  'commonhtml': 'html',
  'mathml': 'mml',
  'chtml': 'html'
};

argv.output = formats[argv.output] || argv.output;

if (argv.font === "STIX") argv.font = "STIX-Web";
if (argv.format === "TeX") argv.format = (argv.inline ? "inline-TeX" : "TeX");

const mjconf = {
    MathJax: {
        SVG: {
            font: argv.font
        },
        menuSettings: {
            semantics: argv.semantics,
            texHints: !argv.notexhints
        }
    },
    extensions: argv.extensions
};

const mjinput = {
    math: argv._[0],
    format: argv.format,
    svg: (argv.output === 'svg'),
    html: (argv.output === 'html'),
    css: argv.css,
    mml: (argv.output === 'mml'),
    speakText: argv.speech,
    speakRuleset: argv.speechrules.replace(/^chromevox$/i, "default"),
    speakStyle: argv.speechstyle,
    ex: argv.ex,
    width: argv.width,
    linebreaks: argv.linebreaks,
    sre: argv.sre
};

console.log(argv._[0])
const output = function(result) {
    if (result.errors) console.log(result.errors);
    else if (argv.css) console.log(result.css);
    else console.log(result[argv.output]);
};

mj.config(mjconf);
mj.start();
mj.typeset(mjinput, output);
