import dotenv from 'dotenv';
dotenv.config();

export default {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '1h' // Default to 1 hour
};