/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * This module contains the logger configuration
 * @author TCSCODER
 * @version 1.0
 */
const bunyan = require('bunyan');
const bunyanLogentries = require('bunyan-logentries');
const config = require('config');

const streams = [];
if (process.env.NODE_ENV !== 'test') {
  streams.push({
    stream: bunyanLogentries.createStream({ token: config.LOGENTRIES_TOKEN }),
    type: 'raw',
  });
  streams.push({
    stream: process.stdout,
  });
}
const logger = bunyan.createLogger({
  name: 'tc-connect-notifications',
  level: config.LOG_LEVEL,
  serializers: { err: bunyan.stdSerializers.err },
  streams,
});


module.exports = logger;
