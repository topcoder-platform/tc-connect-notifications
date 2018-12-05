/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * The default configuration file
 * @author TCSCODER
 * @version 1.0
 */

// only fields that need to be overwritten should go here
module.exports = {
  LOG_LEVEL: 'LOG_LEVEL',
  CAPTURE_LOGS: 'CAPTURE_LOGS',
  LOGENTRIES_TOKEN: 'LOGENTRIES_TOKEN',

  RABBITMQ: {
    URL: 'RABBITMQ_URL',
  },
  TC_SLACK_WEBHOOK_URL: 'TC_SLACK_WEBHOOK_URL',
  AUTH0_URL: 'AUTH0_URL',
  AUTH0_AUDIENCE: 'AUTH0_AUDIENCE',
  TOKEN_CACHE_TIME: 'TOKEN_CACHE_TIME',
  AUTH0_CLIENT_ID: 'AUTH0_CLIENT_ID',
  AUTH0_CLIENT_SECRET: 'AUTH0_CLIENT_SECRET',
  AUTH0_PROXY_SERVER_URL: 'AUTH0_PROXY_SERVER_URL',
};
