const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { AuthenticationError, ConflictError, AuthorizationError } = require('../errors');
const { validateRegisterPayload, validateLoginPayload } = require('../validators/authValidators');
const userRepository = require('../repositories/userRepository');

function createAuthService({ db, config }) {
  return {
    async register(payload) {
      const { username, password, inviteCode } = validateRegisterPayload(payload);

      if (inviteCode !== config.adminInviteCode) {
        throw new AuthorizationError('邀请码错误');
      }

      const hashedPassword = bcrypt.hashSync(password, 12);

      try {
        await userRepository.createUser(db, username, hashedPassword);
      } catch (error) {
        if (/unique/i.test(error.message)) {
          throw new ConflictError('用户名已存在');
        }

        throw error;
      }

      return { message: '注册成功' };
    },

    async login(payload) {
      const { username, password } = validateLoginPayload(payload);
      const user = await userRepository.findByUsername(db, username);

      if (!user || !bcrypt.compareSync(password, user.password)) {
        throw new AuthenticationError('用户名或密码错误');
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        config.jwtSecret,
        { expiresIn: '7d' },
      );

      return { token };
    },
  };
}

module.exports = {
  createAuthService,
};
