
const { GraphQLClient } = require('graphql-request');

const client = new GraphQLClient('https://sghafi-strapi.herokuapp.com/graphql');

module.exports = client;