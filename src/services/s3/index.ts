const AWS = require("../awsSdk");
const config = require("../config");

const s3bucket = new AWS.S3(config.s3);

const put = (...args: any[]) => s3bucket.upload(...args).promise();
const get = (...args: any[]) =>
  s3bucket
    .getObject(...args)
    .promise()
    .then((results: { Body: { toString: () => string; }; }) => {
      if (results) {
        return JSON.parse(results.Body.toString());
      }
      throw new Error("No Document Found");
    });
const remove = (...args: any[]) => s3bucket.deleteObject(...args).promise();

module.exports = { put, get, remove };
