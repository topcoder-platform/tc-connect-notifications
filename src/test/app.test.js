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

const testTimeout = 1000;
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
  projectTest: require('./data/projects.test.json'),
};
const sampleUsers = {
  user1: require('./data/users.1.json'),
};
const sampleAuth = require('./data/authorization.json');

const expectedSlackNotficationBase = {
	username: "Coder",
	icon_url: "https://emoji.slack-edge.com/T03R80JP7/coder-grinning/a3b7f3fe9e838377.png",
  attachments: [{
    pretext: "",
    fallback: "",
    color: "#36a64f",
    title: "test",
    title_link: "https://connect.topcoder-dev.com/projects/1/",
    text: "test",
    fields: [],
    footer: "Topcoder",
    footer_icon: "https://emoji.slack-edge.com/T03R80JP7/topcoder/7c68acd90a6b6d77.png",
    ts: 1478304000,
  }]
};

const expectedSlackCopilotNotification = _.cloneDeep(expectedSlackNotficationBase);
_.extend(expectedSlackCopilotNotification.attachments[0], {
  pretext: 'A project has been reviewed and needs a copilot. Please check it out and claim it.',
  fallback: 'A project has been reviewed and needs a copilot. Please check it out and claim it.',
})

const expectedManagerSlackNotification = _.cloneDeep(expectedSlackNotficationBase);
_.extend(expectedManagerSlackNotification.attachments[0], {
  pretext: 'A project is ready to be reviewed.',
  fallback: 'A project is ready to be reviewed.',
  fields: [
    { title: 'Ref Code', value: '', short: false },
    { title: 'Owner', value: 'F_user L_user', short: false },
  ]
})

function checkAssert(assertCount, count, cb) {
  if (assertCount === count) {
    return cb();
  }
}

describe('app', () => {
  let sourceExchange;
  let sourceQueue;
  let targetExchange;
  let copilotTargetQueue;
  let managerTargetQueue;
  let stub;
  let spy;
  let correlationId = 1;

  const restoreStubAndSpy = () => {
    if (request.get.restore) {
      request.get.restore();
    }
    if (request.post.restore) {
      request.post.restore();
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
    copilotTargetQueue = targetExchange.queue(
      { name: config.COPILOT_TARGET_RABBIT_QUEUE_NAME },
      { key: config.COPILOT_TARGET_RABBIT_ROUTING_KEY });
    managerTargetQueue = targetExchange.queue(
      { name: config.MANAGER_TARGET_RABBIT_QUEUE_NAME },
      { key: config.MANAGER_TARGET_RABBIT_ROUTING_KEY });

    let connectedQueues = 0;
    function checkCallCallback() {
      if (connectedQueues === 2) {
        callback();
      }
    }
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
      copilotTargetQueue.purge(() => {
        managerTargetQueue.purge(() => {
          done();
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
    const stubArgs = {
      url: `${config.API_BASE_URL}/v4/projects/1`,
    };
    stub.withArgs(sinon.match.has('url', stubArgs.url))
      .yields(null, { statusCode: 200 }, sampleProjects.project1);

    stubArgs.url = `${config.API_BASE_URL}/v4/projects/1000`;
    stub.withArgs(sinon.match.has('url', stubArgs.url))
      .yields(null, { statusCode: 404 });

    stubArgs.url = `${config.API_BASE_URL}/v3/members/_search/?query=userId:1`;
    stub.withArgs(sinon.match.has('url', stubArgs.url))
      .yields(null, { statusCode: 200 }, sampleUsers.user1);

    stubArgs.url = `${config.API_BASE_URL}/v3/users/1000`;
    stub.withArgs(sinon.match.has('url', stubArgs.url))
      .yields(null, { statusCode: 404 });

    stubArgs.url = `${config.API_BASE_URL}/v3/members/_search/?query=userId:40051331`;
    stub.withArgs(sinon.match.has('url', stubArgs.url))
      .yields(null, { statusCode: 200 }, sampleUsers.user1);

    stubArgs.url = `${config.API_BASE_URL}/v3/members/_search/?query=userId:50051333`;
    stub.withArgs(sinon.match.has('url', stubArgs.url))
      .yields(null, { statusCode: 200 }, sampleUsers.user1);

    postStub = sinon.stub(request, 'post');
    postStub.yields(null, { statusCode: 200 }, sampleAuth);

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
  });

  describe('`project.updated` event', () => {

    it('should create `Project.SubmittedForReview` and `Project.AvailableForReview` and manager slack notifications', (done) => {
      let assertCount = 0;
      const callbackCount = 2;
      request.get.restore();
      stub = sinon.stub(request, 'get');
      stub.withArgs(sinon.match.has('url', `${config.API_BASE_URL}/v3/members/_search/?query=userId:8547900`))
        .yields(null, { statusCode: 200 }, sampleUsers.user1);

      function mgrCallback(notifications) {
        assertCount += 1;
        const data = JSON.parse(notifications.toString());
        assert.deepEqual(data, expectedManagerSlackNotification);
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
    it('should create `Project.Reviewed` and `Project.AvailableToClaim` and copilot slack notifications and do not repost after delay', (done) => {
      let assertCount = 0;
      const callbackCount = 2;
      function copCallback(notifications) {
        assertCount += 1;
        const data = JSON.parse(notifications.toString());
        assert.deepEqual(data, expectedSlackCopilotNotification);
        checkAssert(assertCount, callbackCount, done);
      }
      sendTestEvent(sampleEvents.updatedReviewed, 'project.updated', copCallback);
      setTimeout(() => {
        assertCount += 1;
        sinon.assert.notCalled(spy);
        checkAssert(assertCount, callbackCount, done);
      }, testTimeout);
    });
    it('should create `Project.Reviewed` and `Project.AvailableToClaim` and copilot slack notifications and repost after delay', (done) => {
      request.get.restore();
      stub = sinon.stub(request, 'get');
      stub.withArgs(sinon.match.has('url', `${config.API_BASE_URL}/v4/projects/1`))
        .yields(null, { statusCode: 200 }, sampleProjects.projectTest);

      let assertCount = 0;
      const callbackCount = 3;
      // Assert count is 3 as delay is 0 copilot will again get notified if none assgned
      function copCallback(notifications) {
        assertCount += 1;
        const data = JSON.parse(notifications.toString());
        assert.deepEqual(data, expectedSlackCopilotNotification);
        checkAssert(assertCount, callbackCount, done);
      }
      sendTestEvent(sampleEvents.updatedReviewed, 'project.updated', copCallback);
      setTimeout(() => {
        assertCount += 1;
        sinon.assert.notCalled(spy);
        checkAssert(assertCount, callbackCount, done);
      }, testTimeout);
    });
    // there is no discourse notiifcation for Project.Reviewed
    it('should create `Project.Reviewed`, but not `Project.AvailableToClaim` and copilot slack notifications (copilot assigned)', (done) => {
      let assertCount = 0;
      const callbackCount = 1;
      function copCallback() {
        assert.fail();
      }
      sendTestEvent(sampleEvents.updatedReviewedCopilotAssigned, 'project.updated', copCallback);
      setTimeout(() => {
        assertCount += 1;
        sinon.assert.notCalled(spy);
        checkAssert(assertCount, callbackCount, done);
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

  describe('`project.member.added` event', () => {
    it('should create `Project.Member.TeamMemberAdded` notification', (done) => {
      sendTestEvent(sampleEvents.memberAddedTeamMember, 'project.member.added');
      setTimeout(() => {
        const expectedTitle = 'A new team member has joined your project';
        const expectedBody = 'F_user L_user has joined project <a href="https://connect.topcoder-dev.com/projects/1/" rel="nofollow">Project name 1</a>. Welcome F_user! Looking forward to working with you.';
        const params = spy.lastCall.args;
        assert.equal(params[2], expectedTitle);
        assert.equal(params[3], expectedBody);
        done();
      }, testTimeout);
    });

    it('should create `Project.Member.ManagerJoined` notification', (done) => {
      sendTestEvent(sampleEvents.memberAddedManager, 'project.member.added');
      setTimeout(() => {
        const expectedTitle = 'A Topcoder project manager has joined your project';
        const expectedBody = 'F_user L_user has joined your project <a href="https://connect.topcoder-dev.com/projects/1/" rel="nofollow">Project name 1</a> as a project manager.';
        const params = spy.lastCall.args;
        assert.equal(params[2], expectedTitle);
        assert.equal(params[3], expectedBody);
        done();
      }, testTimeout);
    });

    it('should create `Project.Member.CopilotJoined` notification', (done) => {
      sendTestEvent(sampleEvents.memberAddedCopilot, 'project.member.added');
      setTimeout(() => {
        const expectedTitle = 'A Topcoder copilot has joined your project';
        const expectedBody = 'F_user L_user has joined your project <a href="https://connect.topcoder-dev.com/projects/1/" rel="nofollow">Project name 1</a> as a copilot.';
        const params = spy.lastCall.args;
        assert.equal(params[2], expectedTitle);
        assert.equal(params[3], expectedBody);
        done();
      }, testTimeout);
    });
  });

  describe('`project.member.removed` event', () => {
    it('should create `Project.Member.Left` notification', (done) => {
      sendTestEvent(sampleEvents.memberRemovedLeft, 'project.member.removed');
      setTimeout(() => {
        const expectedTitle = 'A team member has left your project';
        const expectedBody = 'F_user L_user has left project <a href="https://connect.topcoder-dev.com/projects/1/" rel="nofollow">Project name 1</a>. Thanks for all your work F_user.';
        const params = spy.lastCall.args;
        assert.equal(params[2], expectedTitle);
        assert.equal(params[3], expectedBody);
        done();
      }, testTimeout);
    });

    it('should create `Project.Member.Removed` notification', (done) => {
      sendTestEvent(sampleEvents.memberRemovedRemoved, 'project.member.removed');
      setTimeout(() => {
        const expectedTitle = 'A team member has left your project';
        const expectedBody = 'F_user L_user has left project <a href="https://connect.topcoder-dev.com/projects/1/" rel="nofollow">Project name 1</a>. Thanks for all your work F_user.';
        const params = spy.lastCall.args;
        assert.equal(params[2], expectedTitle);
        assert.equal(params[3], expectedBody);
        done();
      }, testTimeout);
    });
  });

  describe('`project.member.updated` event', () => {
    it('should create `Project.OwnerChanged` notification', (done) => {
      sendTestEvent(sampleEvents.memberUpdated, 'project.member.updated');
      setTimeout(() => {
        const expectedTitle = 'Your project has a new owner';
        const expectedBody = 'F_user L_user is now responsible for project <a href="https://connect.topcoder-dev.com/projects/1/" rel="nofollow">Project name 1</a>. Good luck F_user.';
        const params = spy.lastCall.args;
        assert.equal(params[2], expectedTitle);
        assert.equal(params[3], expectedBody);
        done();
      }, testTimeout);
    });

    it('should not create `Project.OwnerChanged` notification (owner not changed)', (done) => {
      sendTestEvent(sampleEvents.memberUpdatedOwnerNotChanged, 'project.member.updated');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });
  });

  describe('Others', () => {
    it('Should not create notification when API server return error', (done) => {
      sendTestEvent(sampleEvents.memberUpdated404, 'project.member.updated');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });
  });
});

/* eslint-enable global-require, no-undef */
