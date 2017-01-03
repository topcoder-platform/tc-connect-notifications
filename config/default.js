/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * The default configuration file
 * @author TCSCODER
 * @version 1.0
 */


module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  // Source RabbitMQ that provides events to tc-connect-notifications
  SOURCE_RABBIT_URL: process.env.SOURCE_RABBIT_URL || 'amqp://',
  SOURCE_RABBIT_EXCHANGE_NAME: process.env.SOURCE_RABBIT_EXCHANGE_NAME || 'projects',
  SOURCE_RABBIT_QUEUE_NAME: process.env.SOURCE_RABBIT_QUEUE_NAME || 'events-queue',
  // Target RabbitMQ that receive notifications from tc-connect-notifications
  TARGET_RABBIT_URL: process.env.TARGET_RABBIT_URL || 'amqp://',
  TARGET_RABBIT_EXCHANGE_NAME: process.env.TARGET_RABBIT_EXCHANGE_NAME || 'notifications',
  TARGET_RABBIT_ROUTING_KEY: process.env.TARGET_RABBIT_ROUTING_KEY || 'discourse',
  TARGET_RABBIT_QUEUE_NAME: process.env.TARGET_RABBIT_QUEUE_NAME || 'notifications-queue',
  // Token is generated from https://logentries.com/
  LOGENTRIES_TOKEN: process.env.LOG_ENTRIES_TOKEN || '29dc910d-e899-45ac-9b4d-5bf53f446e71',
  // The base url to the project/user API server
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001',
  // The manager group
  ALL_MANAGER_USER_IDS: process.env.ALL_MANAGER_USER_IDS || [11111111, 22222222],
  // The copilot group
  ALL_COPILOT_USER_IDS: process.env.ALL_COPILOT_USER_IDS || [11111111, 33333333],
};
