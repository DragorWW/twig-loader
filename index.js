var Twig = require("twig");
var _ = require("underscore");
var path = require("path");
var loaderUtils = require("loader-utils");

var isApplySettings = false;
var settings = {
    extend: function () {},
    params: {
        allowInlineIncludes: true
    }
};

var twigExtend = function(Twig) {
    var compiler = Twig.compiler;

    compiler.module['webpack'] = function(id, tokens, pathToTwig) {
        var includes = [];
        var processDependency = function(token) {
            includes.push(token.value);
            token.value = path.resolve(path.dirname(id), token.value);
        };

        var processToken = function(token) {
            if (token.type == "logic" && token.token.type) {
                switch(token.token.type) {
                    case 'Twig.logic.type.block':
                    case 'Twig.logic.type.if':
                    case 'Twig.logic.type.elseif':
                    case 'Twig.logic.type.else':
                    case 'Twig.logic.type.for':
                    case 'Twig.logic.type.spaceless':
                        _.each(token.token.output, processToken);
                        break;
                    case 'Twig.logic.type.extends':
                        _.each(token.token.stack, processDependency);
                        break;
                    case 'Twig.logic.type.import':
                        if (token.token.expression != '_self') {
                            _.each(token.token.stack, function(token) {
                                includes.push("twig!" + token.value + ".twig");
                            });
                        }
                        break;
                    case 'Twig.logic.type.include':
                        _.each(token.token.stack, processDependency);
                        break;
                }
            }
        };

        var parsedTokens = JSON.parse(tokens);

        _.each(parsedTokens, processToken);

        var output = [
            'var twig = require("' + pathToTwig + '").twig,',
            '    template = twig({id:' + JSON.stringify(id) + ', data:' + JSON.stringify(parsedTokens) + ', allowInlineIncludes: true});\n',
            'module.exports = function(context) { return template.render(context); }'
        ];

        if (includes.length > 0) {
            _.each(includes, function(file) {
                output.unshift("require("+ JSON.stringify("twig!" + file) +");\n");
            });
        }

        return output.join('\n');
    };
};

module.exports = function(source) {
    var id = require.resolve(this.resource),
        tpl;
    this.cacheable && this.cacheable();

    if (!isApplySettings) {
        isApplySettings = true;

        if ( typeof this.options.twig === "object" ) {
            settings = _.extend(settings, this.options.twig);
        }

        Twig.extend(settings.extend.bind(this));
        Twig.extend(twigExtend);
    }


    // check if template already exists
    tpl = Twig.twig({ ref: id });
    if (!tpl) {
        tpl = Twig.twig({
            id: id,
            data: source,
            allowInlineIncludes: true
        });
    }

    tpl = tpl.compile({
        module: 'webpack',
        twig: 'twig'
    });

    this.callback(null, tpl);
};
