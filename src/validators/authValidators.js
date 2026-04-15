const { requireString } = require('./common');

function validateRegisterPayload(payload) {
  return {
    username: requireString(payload.username, '用户名', { minLength: 3, maxLength: 32 }),
    password: requireString(payload.password, '密码', { minLength: 8, maxLength: 72 }),
    inviteCode: requireString(payload.inviteCode, '邀请码', { minLength: 1, maxLength: 64 }),
  };
}

function validateLoginPayload(payload) {
  return {
    username: requireString(payload.username, '用户名', { minLength: 1, maxLength: 32 }),
    password: requireString(payload.password, '密码', { minLength: 1, maxLength: 72 }),
  };
}

module.exports = {
  validateRegisterPayload,
  validateLoginPayload,
};
