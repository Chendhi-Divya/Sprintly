import jwt from "jsonwebtoken";

export const generateToken = (userId: string): string => {
  return jwt.sign(  //used to create a JWT token.
    {
      userId,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: "7d",
    }
  );
};

