/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * The test configuration file
 * @author TCSCODER
 * @version 1.0
 */


module.exports = {
  SOURCE_RABBIT_URL: 'amqp://',
  SOURCE_RABBIT_EXCHANGE_NAME: 'projects',
  SOURCE_RABBIT_QUEUE_NAME: 'events-queue',
  TARGET_RABBIT_URL: 'amqp://',
  TARGET_RABBIT_EXCHANGE_NAME: 'notifications',
  TARGET_RABBIT_ROUTING_KEY: 'email',
  TARGET_RABBIT_QUEUE_NAME: 'notifications-queue',
  API_BASE_URL: 'http://localhost:3001',
  ALL_MANAGER_USER_IDS: [11111111, 22222222],
  ALL_COPILOT_USER_IDS: [11111111, 33333333],
};
