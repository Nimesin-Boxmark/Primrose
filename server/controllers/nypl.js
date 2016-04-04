var getObject = require("../http/getObject");

//http://api.repo.nypl.org/

module.exports = {
  pattern: /^\/nypl\/?(?:\?(q=[^&]+))?/,
  GET: function (params, sendData, serverError) {
    getObject("http://api.repo.nypl.org/api/v1/items/search?q=stereo&publicDomainOnly=true", {
      headers: {
        Authorization: "Token token=" + process.env.NYPL_TOKEN
      }
    }).then(function (output) {
      console.log(output);
      sendData("text/json", output, output.length);
    }).catch(serverError);
  }
};