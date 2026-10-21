import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters");
}

export const generateToken = (user: any) => {
  return jwt.sign(
    {
      role: user.role,
    },
    JWT_SECRET,
    {
      subject: user.id,
      expiresIn: "1h",
      algorithm: "HS256",
    },
  );
};
