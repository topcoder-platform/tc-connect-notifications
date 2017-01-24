/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

/**
 * Define all event handlers
 * @author TCSCODER
 * @version 1.0
 */
const _ = require('lodash');
const config = require('config');
const Promise = require('bluebird');
const request = require('request');

/**
 * Makes a GET request to the API server
 * @param {String} url the relative url
 * @returns {Promise} the promise that resolves to the response body content
 * @private
 */
function requestPromise(url, cb = null) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${config.API_BASE_URL}/${url}`;

    request.get(fullUrl, (err, res, body) => {
      if (err || res.statusCode > 299) {
        reject(err || new Error(`Failed to load url '${fullUrl}': statusCode = ${res.statusCode}`));
      } else {
        const data = JSON.parse(body);
        if (cb) {
          cb(data)
        } else {
          resolve(data.result.content);
        }
      }
    });
  });
}

/**
 * Makes a POST request to member service to create a new topic
 * @param  {Object} project object
 * @param  {String} notificationType notification type
 * @return {Promise}
 */
function createProjectDiscourseNotification(logger, projectId, title, body, tag = 'PRIMARY') {
  try {
    return getSystemUserToken(logger)
      .then((token) => {
        const options = {
          uri: `${config.API_BASE_URL}/v4/topics/`,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          json: {
            reference: 'project',
            referenceId: projectId,
            tag,
            title,
            body,
          },
        };
        return new Promise((resolve, reject) => {
          request(options, (err, res, body) => {
            if (err) {
              logger.error(err)
              return reject(err)
            }
            logger.info('Created discourse notification')
            logger.debug(body)
            return resolve(true)
          });
        });
    })
  } catch (err) {
    logger.error(err)
    return Promise.reject(err)
  }
}

/**
 * Create notification for a project event
 * @param {Array} userIds the array of user ids
 * @param {Object} project the project
 * @param {Object} notificationTypeSubject the notification type and subject
 * @returns the notification
 * @private
 */
function createProjectNotification(userIds, project, notificationTypeSubject) {
  const params = {
    projectId: project.id,
    projectName: project.name,
    projectDescription: project.description,
  };
  const notification = {
    recipients: _.map(userIds, (id) => {
      const recipient = {
        id,
        params,
      };
      return recipient;
    }),
  };
  _.extend(notification, notificationTypeSubject);

  return notification;
}

/**
 * Get project member ids by role
 * @param {Object} project the project
 * @param {String} role the role
 * @returns {Array} the array of project member ids
 * @private
 */
function getProjectMemberIdsByRole(project, role) {
  const members = _.filter(project.members, {
    role,
  });
  return _.map(members, member => member.userId);
}

/**
 * Get project from API server
 * @param {Number} id the project id
 * @returns {Promise} the promise that resolves to the project
 * @private
 */
function* getProjectById(id) {
  return yield requestPromise(`v4/projects/${id}`);
}

/**
 * Get user from API server
 * @param {Number} id the user id
 * @returns {Promise} the promise that resolves to the user
 * @private
 */
function* getUserById(id) {
  const cb = (data) => {
    const user = _.get(data, 'result.content.0', null);
    if (user) {
      return resolve(user);
    }
    return reject(new Error('user not found'));
  };
  return requestPromise(`${config.get('API_BASE_URL')}/v3/members/_search/?query=userId:${id}`, cb);
  return yield new Promise((resolve, reject) => {
    request.get('')
  })
}


/**
 * Create notification for a project member event
 * @param {Array} userIds the array of user ids
 * @param {Object} project the project
 * @param {Object} member the member which is added or updated
 * @param {Object} notificationTypeSubject the notification type and subject
 * @returns the notification
 * @private
 */
function createProjectMemberNotification(userIds, project, member, notificationTypeSubject) {
  const params = {
    projectId: project.id,
    projectName: project.name,
    memberId: parseInt(member.id, 10),
    memberName: `${member.firstName} ${member.lastName}`,
    memberHandle: member.handle,
  };
  const notification = {
    recipients: _.map(userIds, (id) => {
      const recipient = {
        id,
        params,
      };
      return recipient;
    }),
  };
  _.extend(notification, notificationTypeSubject);

  return notification;
}

/**
 * Create notification for a slack channel
 * @param {Object} project the project
 * @returns the notification
 * @private
 */

function buildSlackNotification(project) {
  return {
    username: config.get('SLACK_USERNAME'),
    icon_url: config.get('SLACK_ICON_URL'),
    attachments: [{
      fallback: `New Project: https://connect.${config.get('AUTH_DOMAIN')}/projects/| ${project.name}`,
      pretext: `New Project: https://connect.${config.get('AUTH_DOMAIN')}/projects/| ${project.name}`,
      fields: [{
          title: 'Description',
          value: _.truncate(project.description, {
            length: 200,
          }),
          short: true,
        },
        {
          title: 'Ref Code',
          value: project.id,
          short: false,
        },
      ],
    }],
  };
}

function getSystemUserToken(logger, id = 'system') {
  return new Promise((resolve, reject) => {
    const url = `${config.API_BASE_URL}/v3/authorizations/`;
    const formData = {
      clientId: config.get('SYSTEM_USER_CLIENT_ID'),
      secret: config.get('SYSTEM_USER_CLIENT_SECRET'),
    };
    request.post({
      url,
      formData
    }, (err, res, body) => {
      if (err) {
        logger.error(err);
        return reject(err);
      }
      body = JSON.parse(body)
      return resolve(body.result.content.token)
    });
  });
}

module.exports = {
  createProjectMemberNotification,
  createProjectNotification,
  createProjectDiscourseNotification,
  getProjectMemberIdsByRole,
  getUserById,
  getProjectById,
  buildSlackNotification,
};
