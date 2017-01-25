/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

/**
 * Tests for app.js
 */
process.env.NODE_ENV = 'test';
/* eslint-disable global-require, no-undef */

const assert = require('assert');
const config = require('config');
const jackrabbit = require('jackrabbit');
const sinon = require('sinon');
const request = require('request');
const _ = require('lodash');
const util = require('../handlers/util');
const constants = require('../common/constants');

const testTimeout = 2000;
const sampleEvents = {
  draftCreated: require('./data/events.draftCreated.json'),
  draftCreatedNoOwner: require('./data/events.draftCreated.noOwner.json'),
  updatedInReview: require('./data/events.updated.in_review.json'),
  updatedReviewed: require('./data/events.updated.reviewed.json'),
  updatedReviewedCopilotAssigned: require('./data/events.updated.reviewed.copilotAssigned.json'),
  updatedReviewedAnotherStatus: require('./data/events.updated.reviewed.anotherStatus.json'),
  updatedReviewedSameStatus: require('./data/events.updated.reviewed.sameStatus.json'),
  memberAddedTeamMember: require('./data/events.memberAdded.teamMember.json'),
  memberAddedManager: require('./data/events.memberAdded.manager.json'),
  memberAddedCopilot: require('./data/events.memberAdded.copilot.json'),
  memberRemovedLeft: require('./data/events.memberRemoved.left.json'),
  memberRemovedRemoved: require('./data/events.memberRemoved.removed.json'),
  memberUpdated: require('./data/events.memberUpdated.json'),
  memberUpdatedOwnerNotChanged: require('./data/events.memberUpdated.ownerNotChanged.json'),
  memberUpdated404: require('./data/events.memberUpdated.404.json'),
};
const sampleProjects = {
  project1: require('./data/projects.1.json'),
};
const sampleUsers = {
  user1: require('./data/users.1.json'),
};

const expectedSlackNotfication = {
  username: 'webhookbot',
  icon_url: 'https://emoji.slack-edge.com/T03R80JP7/topcoder/7c68acd90a6b6d77.png',
  attachments: [
    {
      fallback: 'New Project: https://connect.topcoder.com/projects/| test',
      pretext: 'New Project: https://connect.topcoder.com/projects/| test',
      fields: [
        {
          title: 'Description',
          value: 'test',
          short: true,
        },
        {
          title: 'Description',
          value: 'test',
          short: false,
        },
        {
          title: 'Ref Code',
          value: 1,
          short: false,
        },
      ],
    },
  ],
};

function checkAssert(assertCount, count, cb) {
  if (assertCount === count) {
    cb();
  }
}

describe('app', () => {
  let sourceExchange;
  let sourceQueue;
  let targetExchange;
  let targetQueue;
  let copilotTargetQueue;
  let managerTargetQueue;
  let stub;
  let spy;
  let correlationId = 1;

  const restoreStubAndSpy = () => {
    if (request.get.restore) {
      request.get.restore();
    }
    if (spy && spy.restore) {
      spy.restore();
    }
  };

  const connectToSource = (callback) => {
    sourceExchange = jackrabbit(config.RABBITMQ_URL)
      .topic(config.SOURCE_RABBIT_EXCHANGE_NAME);
    sourceQueue = sourceExchange.queue(
      { name: config.SOURCE_RABBIT_QUEUE_NAME },
      { keys: _.values(constants.events) });
    sourceQueue.on('ready', () => {
      sourceQueue.purge(() => { callback(); });
    });
  };
  const connectToTarget = (callback) => {
    targetExchange = jackrabbit(config.RABBITMQ_URL)
      .topic(config.TARGET_RABBIT_EXCHANGE_NAME);
    targetQueue = targetExchange.queue(
      { name: config.TARGET_RABBIT_QUEUE_NAME },
      { key: config.TARGET_RABBIT_ROUTING_KEY });
    copilotTargetQueue = targetExchange.queue(
      { name: config.COPILOT_TARGET_RABBIT_QUEUE_NAME },
      { key: config.COPILOT_TARGET_RABBIT_ROUTING_KEY });
    managerTargetQueue = targetExchange.queue(
      { name: config.MANAGER_TARGET_RABBIT_QUEUE_NAME },
      { key: config.MANAGER_TARGET_RABBIT_ROUTING_KEY });

    let connectedQueues = 0;
    function checkCallCallback() {
      if (connectedQueues === 3) {
        callback();
      }
    }
    targetQueue.on('ready', () => {
      targetQueue.purge(() => {
        connectedQueues += 1;
        checkCallCallback();
      });
    });
    copilotTargetQueue.on('ready', () => {
      copilotTargetQueue.purge(() => {
        connectedQueues += 1;
        checkCallCallback();
      });
    });
    managerTargetQueue.on('ready', () => {
      managerTargetQueue.purge(() => {
        connectedQueues += 1;
        checkCallCallback();
      });
    });
    targetQueue.consume((data, ack, nack, message) => {
      ack();
      assert.ok(message);
      notificationCallback(data);
    });
    copilotTargetQueue.consume((data, ack, nack, message) => {
      ack();
      assert.ok(message);
      if (copilotCallback) {
        copilotCallback(data);
      }
    });
    managerTargetQueue.consume((data, ack, nack, message) => {
      ack();
      assert.ok(message);
      if (managerCallback) {
        managerCallback(data);
      }
    });
  };
  const purgeQueues = (done) => {
    sourceQueue.purge(() => {
      targetQueue.purge(() => {
        copilotTargetQueue.purge(() => {
          managerTargetQueue.purge(() => {
            done();
          });
        });
      });
    });
  };

  before((done) => {
    // Connect to queues
    connectToSource(() => {
      connectToTarget(() => {
        // Start app
        require('../app');
        done();
      });
    });
  });

  beforeEach((done) => {
    restoreStubAndSpy();

    // Stub the calls to API server
    stub = sinon.stub(request, 'get');
    stub.withArgs(`${config.API_BASE_URL}/projects/1`)
      .yields(null, { statusCode: 200 }, JSON.stringify(sampleProjects.project1));
    stub.withArgs(`${config.API_BASE_URL}/projects/1000`)
      .yields(null, { statusCode: 404 });
    stub.withArgs(`${config.API_BASE_URL}/users/1`)
      .yields(null, { statusCode: 200 }, JSON.stringify(sampleUsers.user1));
    stub.withArgs(`${config.API_BASE_URL}/users/1000`)
      .yields(null, { statusCode: 404 });

    // spy the discourse notification call
    spy = sinon.spy(util, 'createProjectDiscourseNotification');
    purgeQueues(done);
  });

  afterEach(purgeQueues);

  /**
   * Send test event and verify notification
   */
  function sendTestEvent(testEvent, testEventType, copilotCb, managerCb) {
    copilotCallback = copilotCb;
    managerCallback = managerCb;
    correlationId += 1;

    sourceExchange.publish(testEvent, {
      key: testEventType,
      correlationId: correlationId.toString(),
    });
  }

  describe('Unknown event', () => {
    it('should not create notification', (done) => {
      sendTestEvent(sampleEvents.draftCreated, '');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });
  });

  describe('`project.draft-created` event', () => {
    it('should create `Project.Created` notification', (done) => {
      sendTestEvent(sampleEvents.draftCreated, 'project.draft-created');
      setTimeout(() => {
        const expectedTitle = 'Your project has been created, and we\'re ready for your specification';
        const expectedBody = 'Hello, Coder here! Your project \'test\' has been created successfully. For your next step, please head over to the <a href="https://connect.topcoder-dev.com/projects/1/specification/" rel="nofollow">Specification</a> section and answer all of the required questions. If you already have a document with your requirements, just verify it against our checklist and then upload it. Once you\'re done, hit the "Submit for Review" button on the Specification. Get stuck or need help? Email us at <a href="mailto:support@topcoder.com?subject=Question%20Regarding%20My%20New%20Topcoder%20Connect%20Project" rel="nofollow">support@topcoder.com</a>.';
        const params = spy.lastCall.args;
        assert.equal(params[2], expectedTitle);
        assert.equal(params[3], expectedBody);
        done();
      }, testTimeout);
    });

    it('should not create `Project.Created` notification (no owner)', (done) => {
      sendTestEvent(sampleEvents.draftCreatedNoOwner, 'project.draft-created');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });
  });

  describe('`project.updated` event', () => {
    it('should create `Project.SubmittedForReview` and `Project.AvailableForReview` and manager slack notifications', (done) => {
      let assertCount = 0;
      const callbackCount = 1;
      function mgrCallback(notifications) {
        assertCount += 1;
        assert.deepEqual(notifications, expectedSlackNotfication);
        checkAssert(assertCount, callbackCount, done);
      }
      sendTestEvent(sampleEvents.updatedInReview, 'project.updated', null, mgrCallback);
      setTimeout(() => {
        assertCount += 1;
        const expectedTitle = 'Your project has been submitted for review';
        const expectedBody = 'Hello, it\'s Coder again. Thanks for submitting your project <a href="https://connect.topcoder-dev.com/projects/1/" rel="nofollow">test</a>! I\'ve used my super computational powers to route it to one of our trusty humans. They\'ll get back to you in 1-2 business days.';
        const params = spy.lastCall.args;
        assert.equal(params[2], expectedTitle);
        assert.equal(params[3], expectedBody);
        checkAssert(assertCount, callbackCount, done);
      }, testTimeout);
    });
    // there is no discourse notiifcation for Project.Reviewed
    it('should create `Project.Reviewed` and `Project.AvailableToClaim` and copilot slack notifications and repost after delay', (done) => {
      let assertCount = 0;
      // Assert count is 3 as delay is 0 copilot will again get notified if none assgned
      function copCallback(notifications) {
        assertCount += 1;
        assert.deepEqual(notifications, expectedSlackNotfication);
        checkAssert(assertCount, 3, done);
      }
      sendTestEvent(sampleEvents.updatedReviewed, 'project.updated', copCallback);
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });
    // there is no discourse notiifcation for Project.Reviewed
    it('should create `Project.Reviewed`, but not `Project.AvailableToClaim` and copilot slack notifications (copilot assigned)', (done) => {
      let assertCount = 0;
      function copCallback(notifications) {
        assertCount += 1;
        assert.deepEqual(notifications, expectedSlackNotfication);
        checkAssert(assertCount, 2, done);
      }
      sendTestEvent(sampleEvents.updatedReviewedCopilotAssigned, 'project.updated', copCallback);
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });

    it('should not create `Project.Reviewed` and `Project.AvailableToClaim` notifications (another status)', (done) => {
      sendTestEvent(sampleEvents.updatedReviewedAnotherStatus, 'project.updated');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });

    it('should not create `Project.Reviewed` and `Project.AvailableToClaim` notifications (same status)', (done) => {
      sendTestEvent(sampleEvents.updatedReviewedSameStatus, 'project.updated');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });
  });

  describe.skip('`project.member.added` event', () => {
    it.skip('should create `Project.Member.TeamMemberAdded` notification', (done) => {
      const expectedParams = {
        projectId: 1,
        projectName: 'Project name 1',
        memberId: 1,
        memberName: 'F_user L_user',
        memberHandle: 'test_user',
      };
      sendTestEvent(sampleEvents.memberAddedTeamMember, 'project.member.added', (notification) => {
        assert.deepEqual(notification, {
          recipients: [
            { id: 1, params: expectedParams },
            { id: 2, params: expectedParams },
            { id: 3, params: expectedParams },
            { id: 4, params: expectedParams },
          ],
          notificationType: constants.notifications.teamMember.added.notificationType,
          subject: constants.notifications.teamMember.added.subject,
        });

        done();
      });
    });

    it('should create `Project.Member.ManagerJoined` notification', (done) => {
      const expectedParams = {
        projectId: 1,
        projectName: 'Project name 1',
        memberId: 1,
        memberName: 'F_user L_user',
        memberHandle: 'test_user',
      };
      sendTestEvent(sampleEvents.memberAddedManager, 'project.member.added', (notification) => {
        assert.deepEqual(notification, {
          recipients: [
            { id: 1, params: expectedParams },
            { id: 2, params: expectedParams },
            { id: 3, params: expectedParams },
            { id: 4, params: expectedParams },
          ],
          notificationType: constants.notifications.teamMember.managerJoined.notificationType,
          subject: constants.notifications.teamMember.managerJoined.subject,
        });

        done();
      });
    });

    it('should create `Project.Member.CopilotJoined` notification', (done) => {
      const expectedParams = {
        projectId: 1,
        projectName: 'Project name 1',
        memberId: 1,
        memberName: 'F_user L_user',
        memberHandle: 'test_user',
      };
      sendTestEvent(sampleEvents.memberAddedCopilot, 'project.member.added', (notification) => {
        assert.deepEqual(notification, {
          recipients: [
            { id: 1, params: expectedParams },
            { id: 2, params: expectedParams },
            { id: 3, params: expectedParams },
            { id: 4, params: expectedParams },
          ],
          notificationType: constants.notifications.teamMember.copilotJoined.notificationType,
          subject: constants.notifications.teamMember.copilotJoined.subject,
        });

        done();
      });
    });
  });

  describe.skip('`project.member.removed` event', () => {
    it('should create `Project.Member.Left` notification', (done) => {
      const expectedParams = {
        projectId: 1,
        projectName: 'Project name 1',
        memberId: 1,
        memberName: 'F_user L_user',
        memberHandle: 'test_user',
      };
      sendTestEvent(sampleEvents.memberRemovedLeft, 'project.member.removed', (notification) => {
        assert.deepEqual(notification, {
          recipients: [
            { id: 1, params: expectedParams },
            { id: 2, params: expectedParams },
            { id: 3, params: expectedParams },
            { id: 4, params: expectedParams },
          ],
          notificationType: constants.notifications.teamMember.left.notificationType,
          subject: constants.notifications.teamMember.left.subject,
        });

        done();
      });
    });

    it('should create `Project.Member.Removed` notification', (done) => {
      const expectedParams = {
        projectId: 1,
        projectName: 'Project name 1',
        memberId: 1,
        memberName: 'F_user L_user',
        memberHandle: 'test_user',
      };
      sendTestEvent(sampleEvents.memberRemovedRemoved, 'project.member.removed', (notification) => {
        assert.deepEqual(notification, {
          recipients: [
            { id: 1, params: expectedParams },
            { id: 2, params: expectedParams },
            { id: 3, params: expectedParams },
            { id: 4, params: expectedParams },
          ],
          notificationType: constants.notifications.teamMember.removed.notificationType,
          subject: constants.notifications.teamMember.removed.subject,
        });

        done();
      });
    });
  });

  describe.skip('`project.member.updated` event', () => {
    it('should create `Project.OwnerChanged` notification', (done) => {
      const expectedParams = {
        projectId: 1,
        projectName: 'Project name 1',
        newOwnerUserId: 1,
        newOwnerName: 'F_user L_user',
        newOwnerHandle: 'test_user',
      };
      sendTestEvent(sampleEvents.memberUpdated, 'project.member.updated', (notification) => {
        assert.deepEqual(notification, {
          recipients: [
            { id: 1, params: expectedParams },
            { id: 2, params: expectedParams },
            { id: 3, params: expectedParams },
            { id: 4, params: expectedParams },
          ],
          notificationType: constants.notifications.teamMember.ownerChanged.notificationType,
          subject: constants.notifications.teamMember.ownerChanged.subject,
        });

        done();
      });
    });

    it('should not create `Project.OwnerChanged` notification (owner not changed)', (done) => {
      sendTestEvent(sampleEvents.memberUpdatedOwnerNotChanged, 'project.member.updated', () => {
        assert.fail();
      });

      setTimeout(done, 1000);
    });
  });

  describe.skip('Others', () => {
    it('Should not create notification when API server return error', (done) => {
      sendTestEvent(sampleEvents.memberUpdated404, 'project.member.updated', () => {
        assert.fail();
      });

      setTimeout(done, 1000);
    });
  });
});

/* eslint-enable global-require, no-undef */
