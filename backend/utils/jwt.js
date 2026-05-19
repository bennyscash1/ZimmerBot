import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';

/** Read at call time so dotenv in 1-server-express.js has already loaded .env */
export const getJwtSecret = () => process.env.JWT_SECRET || DEFAULT_SECRET;

export const generateToken = (userId) => {
  return jwt.sign({ userId }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};
