var loaderUtils = require("loader-utils");

module.exports = function(id){
    return loaderUtils.interpolateName({resourcePath: id}, "[hash].[ext]");
};
