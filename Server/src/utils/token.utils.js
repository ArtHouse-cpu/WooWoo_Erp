import jwt from 'jsonwebtoken';

export const createTokenAndSetCookie = (res, payload) => {
  const {userId, phoneNumber} = payload;
  const token = jwt.sign({userId, phoneNumber}, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });

  res.cookie('authToken', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  return token;
};
